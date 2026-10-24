<script lang="ts">
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import {
		Activity,
		ArrowDown,
		ArrowUp,
		ChartColumn,
		Check,
		Droplet,
		Funnel,
		Info,
		Rocket,
		SlidersHorizontal,
		Wind,
		type LucideIcon
	} from "@lucide/svelte";
	import { screenerQuery } from "#lib/api.ts";
	import { fmtCompact, fmtNum, fmtPct } from "#lib/format.ts";
	import { useBrokerActivity, useScreener } from "#lib/hooks.svelte.ts";
	import type { ScreenerFilters, ScreenerRow } from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import RegimeBanner from "#lib/components/RegimeBanner.svelte";
	import ScreenerFactorsModal from "#lib/components/ScreenerFactorsModal.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	type PresetGuide = { untuk: string; kriteria: string[]; cara: string };

	type Preset = {
		label: string;
		icon: LucideIcon;
		filters: ScreenerFilters;
		desc: string;
		guide?: PresetGuide;
	};

	const PRESETS: Preset[] = [
		{
			label: "Momentum + Foreign In",
			icon: Rocket,
			filters: { min_momentum: 5, foreign_in_only: true, min_value: 10e9, min_days: 30 },
			desc: "Naik >5% dalam 20 hari, diakumulasi asing, likuid >Rp 10 M/hari",
			guide: {
				untuk:
					"Mencari saham yang sedang naik dan didukung beli asing hari ini, sehingga lebih mudah dijual kembali.",
				kriteria: [
					"Momentum 20 hari > 5%",
					"Asing net beli hari terakhir",
					"Nilai transaksi > Rp 10 M"
				],
				cara: "Urutkan dari momentum tertinggi. Kolom Foreign Net positif dan Value besar menandakan dukungan nyata; Jarak 52w dekat 0% berarti harga dekat puncak."
			}
		},
		{
			label: "Lonjakan Volume",
			icon: ChartColumn,
			filters: { min_vol_ratio: 2, min_momentum: 0, min_days: 30 },
			desc: "Volume hari ini ≥2× rata-rata 20 hari, harga tidak turun",
			guide: {
				untuk:
					"Mencari saham yang volumenya tiba-tiba melonjak hari ini. Ini tanda ada pelaku besar yang masuk, jadi layak dicek lebih lanjut, bukan langsung dibeli.",
				kriteria: ["Vol Ratio ≥ 2×", "Momentum 20 hari ≥ 0% (harga tidak turun)"],
				cara: "Urutkan dari Vol Ratio tertinggi. 2× berarti volume hari ini dua kali rata-rata 20 hari. Momentum positif berarti lonjakan volume disertai kenaikan harga, dan Jarak 52w dekat 0% memperkuat sinyal breakout. Konfirmasi arah dengan Foreign Net dan Buku (OB)."
			}
		},
		{
			label: "Oversold Sehat",
			icon: Droplet,
			filters: { rsi_max: 35, min_value: 5e9, min_days: 30 },
			desc: "RSI ≤35 (sudah banyak dijual) tapi masih likuid — kandidat rebound",
			guide: {
				untuk:
					"Mencari saham yang sudah turun banyak sampai terlihat 'murah' secara teknikal, dan masih ramai diperdagangkan. Ini kandidat untuk dipantau rebound, bukan jaminan naik.",
				kriteria: ["RSI(14) ≤ 35 (oversold)", "Nilai transaksi > Rp 5 M/hari"],
				cara: "RSI di bawah 35 berarti tekanan jual sudah berlebihan, sehingga peluang pantulan (rebound) terbuka. Nilai transaksi besar memastikan saham mudah dibeli dan dijual. Urutkan dari RSI terendah, lalu cek ATR% (makin tinggi makin berisiko) dan Foreign Net: positif berarti asing mulai masuk saat harga turun."
			}
		},
		{
			label: "Trend Up Tenang",
			icon: Wind,
			filters: { signal: "BUY", rsi_min: 50, rsi_max: 65, min_days: 30 },
			desc: "Sinyal BUY, uptrend, RSI sehat (tidak overbought)",
			guide: {
				untuk:
					"Mencari saham yang sedang tren naik dengan tenang: sinyal teknikal BUY aktif dan RSI di zona sehat, bukan zona jenuh beli. Cocok untuk ikut tren tanpa mengejar harga yang sudah terlalu tinggi.",
				kriteria: ["Signal = BUY", "RSI(14) 50-65 (uptrend, belum overbought)"],
				cara: "Sinyal BUY berarti tren rata-rata masih naik. RSI 50-65 menandakan harga naik tertib, belum jenuh beli, jadi masih ada ruang naik. Urutkan dari momentum tertinggi, lalu cek Hari sejak sinyal: 0-5 berarti sinyal masih baru; besar berarti sinyal sudah tua. Jarak 52w dekat 0% menandakan harga dekat puncak, hati-hati beli di ujung tren."
			}
		},
		{
			label: "Akumulasi Broker",
			icon: Activity,
			filters: { min_broker_score: 60, min_value: 5e9, min_days: 30 },
			desc: "Skor aktivitas broker ≥60 (hanya faktor aliran yang lolos uji IC), likuid >Rp 5 M/hari",
			guide: {
				untuk:
					"Mencari saham yang aktivitas broker-nya menunjukkan pola akumulasi, yaitu ada pihak yang terus mengumpulkan saham. Ini sinyal aliran pelaku, bukan jaminan harga naik.",
				kriteria: ["Skor aktivitas broker ≥ 60", "Nilai transaksi > Rp 5 M/hari"],
				cara: "Skor broker makin tinggi berarti pola beli cenderung dominan. Urutkan dari skor tertinggi, lalu pastikan Value cukup besar agar sinyal tidak berasal dari transaksi kecil. Kombinasikan dengan Foreign Net dan Momentum: akumulasi yang disertai harga naik lebih kuat dibanding akumulasi saat harga masih turun. Skor ini butuh data broker harian (jalankan idx ic bila kosong)."
			}
		}
	];

	function signalBadge(sig: string): string {
		if (sig === "BUY") return "badge badge-buy";
		if (sig === "SELL") return "badge badge-sell";
		return "badge badge-hold";
	}

	/**
	 * Baca filter dari query string URL. Field kosong/tidak valid diabaikan,
	 * jadi link hasil screening bisa dibagikan dan dibuka ulang persis sama.
	 */
	function filtersFromParams(sp: Pick<URLSearchParams, "get">): ScreenerFilters {
		const num = (k: string): number | undefined => {
			const v = sp.get(k);
			if (v === null || v === "") return undefined;
			const n = Number(v);
			return Number.isFinite(n) ? n : undefined;
		};
		const out: ScreenerFilters = {};
		const signal = sp.get("signal");
		if (signal) out.signal = signal;
		for (const k of [
			"rsi_min",
			"rsi_max",
			"min_momentum",
			"max_momentum",
			"min_value",
			"min_vol_ratio",
			"min_broker_score",
			"min_days",
			"limit"
		] as const) {
			const v = num(k);
			if (v !== undefined) out[k] = v;
		}
		if (sp.get("foreign_in_only") === "true") out.foreign_in_only = true;
		return out;
	}

	/**
	 * Dua filter dianggap sama jika menghasilkan query string yang sama.
	 * Membandingkan lewat serializer yang sama dengan URL, jadi field kosong
	 * (undefined / false) dan urutan key tidak lagi bikin perbedaan palsu.
	 */
	function sameFilters(a: ScreenerFilters, b: ScreenerFilters): boolean {
		return screenerQuery(a) === screenerQuery(b);
	}

	/** Kolom tabel — dipakai untuk render, sort, dan toggle visibilitas. */
	type SortKey = keyof Pick<
		ScreenerRow,
		| "close"
		| "rsi"
		| "momentum_20d"
		| "vol_ratio"
		| "atr_pct"
		| "dist_52w"
		| "days_since_signal"
		| "ob_imbalance"
		| "ob_absorption"
		| "broker_score"
		| "foreign_net"
		| "value"
	>;

	type ColumnDef = {
		key: SortKey;
		label: string;
		title?: string;
		format: (r: ScreenerRow) => string;
		cellClass?: (r: ScreenerRow) => string;
	};

	const COLUMNS: ColumnDef[] = [
		{
			key: "close",
			label: "Close",
			format: (r) => fmtNum(r.close),
			cellClass: () => "text-right tabular-nums"
		},
		{
			key: "rsi",
			label: "RSI",
			format: (r) => (r.rsi !== null ? r.rsi.toFixed(1) : "-"),
			cellClass: () => "text-right tabular-nums"
		},
		{
			key: "momentum_20d",
			label: "Momentum 20d",
			format: (r) => fmtPct(r.momentum_20d),
			cellClass: (r) =>
				`text-right font-semibold tabular-nums ${(r.momentum_20d ?? 0) >= 0 ? "text-up" : "text-down"}`
		},
		{
			key: "vol_ratio",
			label: "Vol Ratio",
			title: "Volume hari ini ÷ rata-rata 20 hari. ≥2× = lonjakan volume",
			format: (r) => (r.vol_ratio !== null ? `${r.vol_ratio.toFixed(2)}×` : "-"),
			cellClass: () => "text-right tabular-nums"
		},
		{
			key: "atr_pct",
			label: "ATR%",
			title: "ATR(14) % dari close — tinggi = volatil",
			format: (r) => (r.atr_pct !== null ? `${r.atr_pct.toFixed(1)}%` : "-"),
			cellClass: (r) => `text-right tabular-nums ${(r.atr_pct ?? 0) >= 5 ? "text-down" : ""}`
		},
		{
			key: "dist_52w",
			label: "Jarak 52w",
			title: "0% = di puncak 52 minggu",
			format: (r) => (r.dist_52w !== null ? `${r.dist_52w.toFixed(1)}%` : "-"),
			cellClass: () => "text-right tabular-nums"
		},
		{
			key: "days_since_signal",
			label: "Hr sinyal",
			title: "Hari bursa sejak sinyal terakhir",
			format: (r) => (r.days_since_signal !== null ? String(r.days_since_signal) : "-"),
			cellClass: () => "text-muted text-right tabular-nums"
		},
		{
			key: "ob_imbalance",
			label: "Buku (OB)",
			title: "Imbalance buku intraday: positif = bid lebih tebal (akumulasi)",
			format: (r) => (r.ob_imbalance !== null ? r.ob_imbalance.toFixed(2) : "-"),
			cellClass: (r) =>
				`text-right tabular-nums ${(r.ob_imbalance ?? 0) >= 0 ? "text-up" : "text-down"}`
		},
		{
			key: "ob_absorption",
			label: "Absorption",
			title: "Buku vs arah harga: negatif = buyer kuat menyerap offer (bullish)",
			format: (r) => (r.ob_absorption !== null ? r.ob_absorption.toFixed(2) : "-"),
			cellClass: (r) =>
				`text-right tabular-nums ${r.ob_absorption !== null && r.ob_absorption < 0 ? "text-up" : ""}`
		},
		{
			key: "broker_score",
			label: "Skor Broker",
			title:
				"Skor aktivitas broker 0-100 (proksi aliran, bobot dari uji IC). 50 = median pasar; kosong = skor belum tervalidasi",
			format: (r) => (r.broker_score !== null ? r.broker_score.toFixed(1) : "-"),
			cellClass: (r) => {
				const s = r.broker_score;
				const tone = s === null ? "text-muted" : s >= 60 ? "text-up" : s <= 40 ? "text-down" : "";
				return `text-right font-semibold tabular-nums ${tone}`;
			}
		},
		{
			key: "foreign_net",
			label: "Foreign Net",
			title: "Net beli (+) / jual (-) asing hari terakhir, dalam Rp",
			format: (r) => fmtCompact(r.foreign_net),
			cellClass: (r) =>
				`text-right tabular-nums ${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`
		},
		{
			key: "value",
			label: "Value",
			format: (r) => fmtCompact(r.value),
			cellClass: () => "text-muted text-right tabular-nums"
		}
	];

	const DEFAULT_VISIBLE = COLUMNS.map((c) => c.key);

	// Belum ada strategi dipilih = filter kosong: tidak ada fetch, tampil guidance.
	let filters = $state<ScreenerFilters>(filtersFromParams(page.url.searchParams));
	const hasSelection = $derived(Object.keys(filters).length > 0);

	// `null` = belum ada pilihan; getter supaya kunci query ikut berubah.
	const screener = useScreener(() => (hasSelection ? filters : null));
	const rows = $derived(screener.data);

	// Status validasi skor broker: tanpa ini, filter broker yang belum tervalidasi
	// hanya menghasilkan "tidak ada saham lolos" tanpa alasan yang jelas.
	const broker = useBrokerActivity(1);
	const brokerFilterOn = $derived(filters.min_broker_score !== undefined);
	const brokerNotValidated = $derived(
		brokerFilterOn && broker.data !== undefined && !broker.data.validated
	);

	let sortKey = $state<SortKey>("momentum_20d");
	let sortDir = $state<"asc" | "desc">("desc");
	let visible = $state<SortKey[]>([...DEFAULT_VISIBLE]);
	let factorsOpen = $state(false);
	let showCols = $state(false);

	let tabEls = $state<(HTMLButtonElement | undefined)[]>([]);

	// Sorot tab preset yang cocok — -1 = filter custom (tidak ada tab aktif).
	const active = $derived(PRESETS.findIndex((p) => sameFilters(p.filters, filters)));
	const activePreset = $derived(active >= 0 ? PRESETS[active] : null);
	const guide = $derived(activePreset?.guide ?? null);

	// URL -> state: untuk back/forward & link dibagikan. sameFilters menjaga
	// state tidak diganti jika isinya sudah sama, jadi tidak ada loop dengan
	// state -> URL di bawah.
	$effect(() => {
		const fromUrl = filtersFromParams(page.url.searchParams);
		if (!sameFilters(untrack(() => filters), fromUrl)) filters = fromUrl;
	});

	// state -> URL: replace (bukan push) supaya tiap perubahan filter tidak
	// membanjiri history; shallow = tanpa navigasi dan tanpa reset scroll.
	$effect(() => {
		const next = screenerQuery(filters).replace(/^\?/, "");
		if (page.url.search !== (next ? `?${next}` : "")) {
			void goto(next ? `/screener?${next}` : "/screener", {
				replace: true,
				shallow: true,
				reset: false
			});
		}
	});

	// Klik di luar menu "Kolom" menutup dropdown — lihat backdrop di header kartu.

	function apply(i: number) {
		filters = { ...PRESETS[i].filters };
	}

	/** Navigasi keyboard pola WAI-ARIA tabs: panah kiri/kanan, Home, End. */
	function onTabKeyDown(e: KeyboardEvent, i: number) {
		const n = PRESETS.length;
		const next =
			e.key === "ArrowRight"
				? (i + 1) % n
				: e.key === "ArrowLeft"
					? (i - 1 + n) % n
					: e.key === "Home"
						? 0
						: e.key === "End"
							? n - 1
							: -1;
		if (next < 0) return;
		e.preventDefault();
		tabEls[next]?.focus();
		apply(next);
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === "desc" ? "asc" : "desc";
		} else {
			sortKey = key;
			sortDir = "desc";
		}
	}

	function toggleCol(key: SortKey) {
		if (visible.includes(key)) {
			if (visible.length > 1) visible = visible.filter((k) => k !== key); // sisakan minimal 1 kolom
		} else {
			visible = [...visible, key];
		}
	}

	const sorted = $derived.by(() => {
		if (!rows) return [];
		const list = [...rows];
		list.sort((a, b) => {
			const av = a[sortKey];
			const bv = b[sortKey];
			if (av === null && bv === null) return 0; // null selalu di bawah
			if (av === null) return 1;
			if (bv === null) return -1;
			return sortDir === "desc" ? bv - av : av - bv;
		});
		return list;
	});

	const shownColumns = $derived(COLUMNS.filter((c) => visible.includes(c.key)));
</script>

<svelte:head>
	<title>Screener AI · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Funnel size={26} class="text-accent" aria-hidden="true" />
			Screener <span class="gradient-text">AI</span>
		</h1>
		<p class="text-muted mt-0.5 text-sm">
			Multi-factor screening rule-based — transparan, bukan black box.
		</p>
	</div>

	<RegimeBanner />

	<!-- Tab strategi: pola WAI-ARIA tabs, roving tabindex, panah kiri/kanan -->
	<div
		role="tablist"
		aria-label="Strategi screening"
		class="flex flex-wrap gap-1 border-b border-[var(--border)]"
	>
		{#each PRESETS as p, i (p.label)}
			{@const PresetIcon = p.icon}
			{@const isActive = active === i}
			<!-- Tanpa pilihan, tab pertama tetap bisa difokus lewat keyboard. -->
			{@const focusable = isActive || (active === -1 && i === 0)}
			<button
				bind:this={tabEls[i]}
				type="button"
				role="tab"
				id={`screener-tab-${i}`}
				aria-selected={isActive}
				aria-controls="screener-panel"
				tabindex={focusable ? 0 : -1}
				onclick={() => apply(i)}
				onkeydown={(e) => onTabKeyDown(e, i)}
				title={p.desc}
				class="group -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none {isActive
					? 'border-[var(--accent)] text-[var(--fg)]'
					: 'border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'}"
			>
				<PresetIcon
					size={15}
					aria-hidden="true"
					class={isActive ? "text-[var(--accent-text)]" : "opacity-70 group-hover:opacity-100"}
				/>
				{p.label}
			</button>
		{/each}
	</div>

	{#if !hasSelection}
		<div class="card-glass space-y-5 p-5 sm:p-6">
			<div class="max-w-2xl">
				<h2 class="text-lg font-semibold">Pilih satu strategi untuk mulai</h2>
				<p class="text-muted mt-1 text-sm">
					Setiap strategi menggabungkan beberapa faktor sekaligus. Pilih salah satu tab di atas
					atau kartu di bawah, lalu hasil saham yang lolos akan muncul di sini.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each PRESETS as p, i (p.label)}
					{@const PresetIcon = p.icon}
					<button
						type="button"
						onclick={() => apply(i)}
						class="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition-colors hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
					>
						<span class="flex items-center gap-2 text-sm font-semibold">
							<PresetIcon size={16} class="text-[var(--accent-text)]" aria-hidden="true" />
							{p.label}
						</span>
						<span class="text-muted mt-1.5 block text-xs leading-relaxed">{p.desc}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if hasSelection && guide}
		<div
			role="tabpanel"
			id="screener-panel"
			aria-labelledby={`screener-tab-${active}`}
			class="card-glass space-y-3 p-4 sm:p-5"
		>
			<div>
				<p class="text-[10px] font-semibold tracking-widest text-[var(--fg-muted)] uppercase">
					Untuk apa?
				</p>
				<p class="mt-1 text-sm">{guide.untuk}</p>
			</div>
			<div>
				<p class="text-[10px] font-semibold tracking-widest text-[var(--fg-muted)] uppercase">
					Kriteria
				</p>
				<div class="mt-1.5 flex flex-wrap gap-2">
					{#each guide.kriteria as k (k)}
						<span
							class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
						>
							<Check size={12} class="text-[var(--accent-text)]" aria-hidden="true" />
							{k}
						</span>
					{/each}
				</div>
			</div>
			<div>
				<p class="text-[10px] font-semibold tracking-widest text-[var(--fg-muted)] uppercase">
					Cara baca
				</p>
				<p class="text-muted mt-1 text-sm">{guide.cara}</p>
			</div>
		</div>
	{/if}

	{#if hasSelection && brokerNotValidated}
		<div
			class="rounded-md border border-[rgba(255,193,7,0.3)] bg-[rgba(255,193,7,0.07)] p-3 text-sm"
		>
			<p class="font-medium">Filter skor broker tidak berlaku — skor belum tervalidasi.</p>
			<p class="text-muted mt-1">
				{broker.data?.reason ?? "Belum ada faktor aliran yang lolos uji IC."} Tanpa skor yang bisa
				dihitung, tidak ada emiten yang bisa dinyatakan lolos kriteria ini — karena itu hasilnya
				kosong, bukan filter yang diam-diam diabaikan. Lihat halaman <strong
					>Aktivitas Broker</strong
				> untuk status validasinya.
			</p>
		</div>
	{/if}

	{#if hasSelection}
		<div>
			<button
				type="button"
				onclick={() => (factorsOpen = true)}
				aria-haspopup="dialog"
				class="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]"
			>
				<Info size={14} aria-hidden="true" />
				Faktor apa saja yang dihitung?
			</button>
		</div>

		{#if factorsOpen}
			<ScreenerFactorsModal onClose={() => (factorsOpen = false)} />
		{/if}

		<Card
			title={`Hasil Screening${rows ? ` · ${rows.length} saham` : ""}`}
			subtitle={`Urut: ${COLUMNS.find((c) => c.key === sortKey)?.label} ${sortDir === "desc"
				? "↓"
				: "↑"}`}
			info="Saham yang lolos semua kriteria strategi yang dipilih. Klik judul kolom untuk urutkan, dan tombol 'Kolom' untuk memilih data yang ditampilkan."
		>
			{#snippet right()}
				<div class="flex items-center gap-2">
					<LastUpdated dep={rows} />
					<div class="relative">
						<button
							type="button"
							onclick={() => (showCols = !showCols)}
							aria-expanded={showCols}
							class="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
						>
							<SlidersHorizontal size={13} aria-hidden="true" /> Kolom
						</button>
						{#if showCols}
							<!-- Backdrop: klik di luar menu menutup dropdown. -->
							<button
								type="button"
								tabindex="-1"
								aria-hidden="true"
								onclick={() => (showCols = false)}
								class="fixed inset-0 z-10 cursor-default"
							></button>
							<div
								class="absolute right-0 z-20 mt-1 w-52 rounded-md border border-[var(--border)] bg-[var(--bg-card-solid)] p-1.5 shadow-lg"
							>
								<p
									class="px-2 py-1 text-[10px] font-semibold tracking-widest text-[var(--fg-muted)] uppercase"
								>
									Tampilkan kolom
								</p>
								{#each COLUMNS as c (c.key)}
									{@const on = visible.includes(c.key)}
									<button
										type="button"
										onclick={() => toggleCol(c.key)}
										class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elev)]"
									>
										<span class={on ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}>{c.label}</span>
										{#if on}
											<Check size={13} class="text-[var(--accent-text)]" aria-hidden="true" />
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/snippet}

			{#if screener.error}
				<ErrorState
					message="Gagal memuat screener: {screener.error instanceof Error
						? screener.error.message
						: String(screener.error)}"
				/>
			{:else if screener.isLoading}
				<Skeleton class="h-72" />
			{:else if !rows || rows.length === 0}
				<EmptyState message="Tidak ada saham yang lolos filter ini." />
			{:else}
				<div class="overflow-x-auto">
					<table class="data-table">
						<thead>
							<tr>
								<th class="text-left">Kode</th>
								{#each shownColumns as c (c.key)}
									{@const isSorted = sortKey === c.key}
									<th
										title={c.title}
										class="whitespace-nowrap text-right {isSorted ? 'text-[var(--fg)]' : ''}"
									>
										<button
											type="button"
											onclick={() => toggleSort(c.key)}
											class="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap select-none hover:text-[var(--fg)]"
										>
											{c.label}
											{#if isSorted}
												{#if sortDir === "desc"}
													<ArrowDown size={12} aria-hidden="true" />
												{:else}
													<ArrowUp size={12} aria-hidden="true" />
												{/if}
											{/if}
										</button>
									</th>
								{/each}
								<th class="text-center">Signal</th>
							</tr>
						</thead>
						<tbody>
							{#each sorted as r (r.code)}
								<tr>
									<td>
										<div class="flex items-center gap-2">
											<a
												href={`/stock/${r.code}`}
												class="flex items-center gap-2.5 hover:underline"
											>
												<TickerLogo code={r.code} size={26} />
												<span class="font-semibold">{r.code}</span>
												{#if r.name}
													<span class="text-muted hidden text-xs md:inline">
														{r.name.length > 24 ? `${r.name.slice(0, 24)}…` : r.name}
													</span>
												{/if}
											</a>
											<a
												href={`/dossier/${r.code}`}
												class="text-muted shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
												title={`Dossier analisis ${r.code}`}
											>
												Dossier
											</a>
										</div>
									</td>
									{#each shownColumns as c (c.key)}
										<td class={c.cellClass?.(r) ?? "text-right tabular-nums"} title={c.title}>
											{c.format(r)}
										</td>
									{/each}
									<td class="text-center">
										<span class={signalBadge(r.signal)}>{r.signal}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	{/if}
</main>
