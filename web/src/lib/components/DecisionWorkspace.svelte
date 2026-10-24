<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ChevronDown,
		Gauge,
		RotateCcwClock,
		Scale,
		Search,
		Shield,
		TrendingUp,
		type LucideIcon
	} from '@lucide/svelte';
	import { useRecommendations, useStockDecision } from '#lib/hooks.svelte.ts';
	import { fmtCompact, fmtPct } from '#lib/format.ts';
	import type { StockDecision } from '#lib/types.ts';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import PositionPlanPanel from '#lib/components/PositionPlanPanel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	type Decision = NonNullable<StockDecision>;

	// ------------------------------------------------------- terjemahan bahasa awam

	const VERDICT_VIEW: Record<string, { title: string; hint: string; tone: string }> = {
		'STRONG HOLD': {
			title: 'Kuat, layak dipertahankan',
			hint: 'Sinyal teknikal dan aliran dana mendukung. Tetap pantau.',
			tone: 'var(--up)'
		},
		HOLD: {
			title: 'Tahan, pantau saja',
			hint: 'Belum ada alasan kuat untuk menambah atau menjual.',
			tone: 'var(--accent)'
		},
		TRIM: {
			title: 'Kurangi sebagian',
			hint: 'Sinyal mulai melemah. Pertimbangkan mengurangi sebagian posisi.',
			tone: '#f59e0b'
		},
		EXIT: {
			title: 'Pertimbangkan keluar',
			hint: 'Sinyal lemah dan tekanan jual dominan. Hati-hati menahan posisi.',
			tone: 'var(--down)'
		}
	};

	const EVENT_VIEW: Record<string, string> = {
		jump_down: 'Harga anjlok tiba-tiba',
		jump_up: 'Harga melonjak tiba-tiba',
		ma_cross_up: 'Harga tembus rata-rata 50 hari ke atas',
		ma_cross_down: 'Harga tembus rata-rata 50 hari ke bawah',
		near_high: 'Harga mendekati puncak terbaru',
		near_low: 'Harga mendekati titik terendah terbaru',
		vol_spike: 'Volume perdagangan melonjak'
	};

	const TABS: { key: 'aliran' | 'level' | 'riwayat'; label: string; icon: LucideIcon }[] = [
		{ key: 'aliran', label: 'Aliran Asing', icon: TrendingUp },
		{ key: 'level', label: 'Level Batas', icon: Shield },
		{ key: 'riwayat', label: 'Riwayat Pola', icon: RotateCcwClock }
	];

	type TabKey = (typeof TABS)[number]['key'];

	/**
	 * Isi halaman Ruang Keputusan: pemilih emiten, kesimpulan utama, konteks
	 * cepat, rencana posisi, dan tab detail. `code` null = belum ada emiten
	 * dipilih, jadi yang tampil panduan singkat — bukan kesimpulan kosong.
	 */
	let { code }: { code: string | null } = $props();

	const decision = useStockDecision(() => code);
	// Getter hook: baca lewat objek, lalu salin ke `$derived` agar tetap reaktif.
	const data = $derived(decision.data);
	const error = $derived(decision.error);
	const isLoading = $derived(decision.isLoading);

	// Saran cepat: kandidat terbaik sesi ini, emiten aktif tetap ikut ditawarkan.
	const recs = useRecommendations(20, 'A');
	const recCodes = $derived((recs.data?.rows ?? []).map((r) => r.code));

	// Draft mengikuti URL saat emiten berganti dari luar (chip / tautan).
	let draft = $state(untrack(() => code) ?? '');
	$effect(() => {
		draft = code ?? '';
	});

	const suggestions = $derived.by<string[]>(() => {
		const base = recCodes;
		const pool = code && !base.includes(code) ? [code, ...base] : base;
		const q = draft.trim().toUpperCase();
		if (!q) return pool.slice(0, 8);
		return pool.filter((c) => c.includes(q)).slice(0, 8);
	});

	function pick(event: SubmitEvent) {
		event.preventDefault();
		const next = draft.trim().toUpperCase();
		if (next) void goto(`/keputusan/${next}`);
	}

	let showAll = $state(false);
	let tab = $state<TabKey>('aliran');
</script>

{#snippet stockPicker(value: string | null)}
	<section class="card space-y-3 p-4 sm:p-5">
		<form class="flex flex-col gap-2 sm:flex-row" onsubmit={pick}>
			<div class="group relative flex-1">
				<Search
					size={16}
					aria-hidden="true"
					class="text-muted absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent-text)]"
				/>
				<input
					value={draft}
					oninput={(e) => (draft = e.currentTarget.value.toUpperCase())}
					placeholder="Ketik kode saham, misalnya BBRI"
					class="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] pr-3 pl-10 text-base font-medium tracking-wide outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
					aria-label="Kode saham"
				/>
			</div>
			<button
				type="submit"
				class="h-12 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
			>
				Lihat keputusan
			</button>
		</form>
		{#if suggestions.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-muted text-xs font-medium">Teratas hari ini:</span>
				{#each suggestions as c (c)}
					<a
						href="/keputusan/{c}"
						class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors {c ===
						value
							? 'border-[var(--accent)] bg-[var(--accent)] text-white'
							: 'border-[var(--border)] text-muted hover:bg-white/[0.06] hover:text-[var(--fg)]'}"
					>
						{c}
					</a>
				{/each}
			</div>
		{/if}
	</section>
{/snippet}

{#snippet guide()}
	{@const steps = [
		'Ketik kode saham yang ingin dicek, misalnya BBRI.',
		'Lihat kesimpulan utama: tahan, kurangi, atau keluar.',
		'Baca alasannya dalam bahasa sederhana, lalu cek tab detail bila perlu.'
	]}
	<section class="card p-5 sm:p-6">
		<h2 class="text-base font-semibold">Cara membaca halaman ini</h2>
		<ol class="mt-3 space-y-2.5">
			{#each steps as s, i (s)}
				<li class="flex items-start gap-3 text-sm leading-relaxed">
					<span
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-bold text-[var(--accent-text)]"
					>
						{i + 1}
					</span>
					<span class="text-muted">{s}</span>
				</li>
			{/each}
		</ol>
		<p class="text-muted mt-4 text-xs leading-relaxed">
			Halaman ini adalah alat bantu riset, bukan ajakan beli atau jual. Keputusan akhir tetap ada di
			tangan kamu.
		</p>
	</section>
{/snippet}

{#snippet verdict(d: Decision)}
	{@const hc = d.hold_check}
	{#if !hc}
		<section class="card p-5 sm:p-6">
			<EmptyState message="Data harga emiten ini belum cukup untuk membuat kesimpulan." />
		</section>
	{:else}
		{@const view = VERDICT_VIEW[hc.verdict] ?? { title: hc.verdict, hint: '', tone: 'var(--fg)' }}
		{@const reasons = hc.reasons ?? []}
		{@const shown = showAll ? reasons : reasons.slice(0, 3)}
		{@const score = Math.max(0, Math.min(100, hc.score))}
		<section class="card space-y-5 p-5 sm:p-6">
			<div class="flex flex-col gap-1">
				<p class="text-muted text-xs font-medium tracking-wider uppercase">
					Kesimpulan untuk {d.code}
				</p>
				<h2 class="text-2xl font-bold sm:text-3xl" style="color: {view.tone}">{view.title}</h2>
				<p class="text-muted text-sm leading-relaxed">{view.hint}</p>
			</div>

			<div class="space-y-2">
				<div class="flex items-baseline justify-between text-sm">
					<span class="font-medium">Skor keyakinan</span>
					<span class="font-semibold tabular-nums">
						{hc.score} <span class="text-muted font-normal">/ 100</span>
					</span>
				</div>
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
					<div
						class="h-full rounded-full transition-all"
						style="width: {score}%; background-color: {view.tone}"
					></div>
				</div>
			</div>

			{#if reasons.length > 0}
				<div class="space-y-2">
					<p class="text-sm font-semibold">Alasan utama</p>
					<ul class="space-y-2">
						{#each shown as r, i (i)}
							<li class="text-muted flex gap-2.5 text-sm leading-relaxed">
								<span
									class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
									style="background-color: {view.tone}"
								></span>
								<span>{r}</span>
							</li>
						{/each}
					</ul>
					{#if reasons.length > 3}
						<button
							type="button"
							onclick={() => (showAll = !showAll)}
							class="flex items-center gap-1 text-xs font-semibold text-[var(--accent-text)] hover:underline"
						>
							{showAll ? 'Sembunyikan' : `Lihat ${reasons.length - 3} alasan lainnya`}
							<ChevronDown
								size={14}
								class="transition-transform {showAll ? 'rotate-180' : ''}"
								aria-hidden="true"
							/>
						</button>
					{/if}
				</div>
			{/if}

			<details class="group rounded-xl border border-[var(--border)] p-3 text-sm">
				<summary class="flex cursor-pointer list-none items-center justify-between font-medium">
					Bagaimana skor ini dihitung?
					<ChevronDown
						size={16}
						class="transition-transform group-open:rotate-180"
						aria-hidden="true"
					/>
				</summary>
				<ul class="text-muted mt-3 space-y-1.5 text-xs leading-relaxed">
					<li>
						Dasar dari sinyal teknikal (tren, RSI, MACD, posisi Bollinger):
						<b class="text-[var(--fg)] tabular-nums">{hc.base_score}</b>
					</li>
					<li>
						Penyesuaian faktor tambahan:
						<b class="text-[var(--fg)] tabular-nums"
							>{hc.factor_adj >= 0 ? '+' : ''}{hc.factor_adj}</b
						>
					</li>
					<li>
						Penyesuaian pendapat broker:
						<b class="text-[var(--fg)] tabular-nums"
							>{hc.broker_adj >= 0 ? '+' : ''}{hc.broker_adj}</b
						>
					</li>
				</ul>
			</details>
		</section>
	{/if}
{/snippet}

{#snippet contextTiles(d: Decision)}
	{@const regime = d.regime?.regime ?? null}
	{@const regimeDown = d.regime?.dir_hint === 'down'}
	{@const regimeUp = regime?.startsWith('TRENDING') && !regimeDown}
	{@const sent = d.sentiment}
	{@const sentScore = sent?.score ?? 0}
	{@const tiles: {
		icon: LucideIcon;
		label: string;
		value: string;
		tone: string | undefined;
		note: string;
	}[] = [
		{
			icon: TrendingUp,
			label: "Arah pasar (IHSG)",
			value: regime ? (regimeDown ? "Sedang turun" : regimeUp ? "Sedang naik" : "Mendatar") : "-",
			tone: regimeDown ? "var(--down)" : regimeUp ? "var(--up)" : undefined,
			note:
				d.regime?.adx != null
					? `Kekuatan tren ${Number(d.regime.adx).toFixed(0)}`
					: "Belum ada data"
		},
		{
			icon: Shield,
			label: "Aliran dana",
			value: sent ? sent.label : "Belum ada data",
			tone: sentScore > 0 ? "var(--up)" : sentScore < 0 ? "var(--down)" : undefined,
			note: "Ringkasan arah dana emiten"
		},
		{
			icon: RotateCcwClock,
			label: "Asing terakhir",
			value: d.last_flip ? (d.last_flip.to === "net_buy" ? "Mulai beli" : "Mulai jual") : "Belum ada",
			tone: d.last_flip ? (d.last_flip.to === "net_buy" ? "var(--up)" : "var(--down)") : undefined,
			note: d.last_flip ? `Sejak ${d.last_flip.date}` : "Tidak ada pergantian arah"
		},
		{
			icon: Gauge,
			label: "Suasana pasar",
			value: d.market_gauge ? `${Number(d.market_gauge.score).toFixed(0)} / 100` : "-",
			tone: undefined,
			note: d.market_gauge?.band ?? "Skala 0-100"
		}
	]}
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each tiles as t (t.label)}
			{@const TileIcon = t.icon}
			<div class="card space-y-1.5 p-4">
				<div class="text-muted flex items-center gap-1.5 text-xs font-medium">
					<TileIcon size={14} aria-hidden="true" />
					{t.label}
				</div>
				<p class="text-base font-semibold break-words" style:color={t.tone}>{t.value}</p>
				<p class="text-muted text-xs leading-snug">{t.note}</p>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet foreignFlow(rows: Decision['foreign_10'])}
	{@const vals = rows.filter((r) => r.net !== null)}
	{#if vals.length === 0}
		<EmptyState message="Belum ada data aliran asing." />
	{:else}
		{@const maxAbs = Math.max(...vals.map((r) => Math.abs(r.net ?? 0)), 1)}
		<div class="space-y-3">
			<p class="text-muted text-sm leading-relaxed">
				Hijau berarti asing net beli, merah berarti net jual, dan kuning berarti hari pergantian
				arah.
			</p>
			<div class="space-y-2">
				{#each vals as r (r.date)}
					{@const net = r.net ?? 0}
					{@const positive = net >= 0}
					<!-- Batang tumbuh dari garis tengah: net beli ke kanan, net jual ke kiri. -->
					{@const barStyle = `width: ${(Math.abs(net) / maxAbs) * 50}%; ${
						positive ? 'left' : 'right'
					}: 50%; background-color: ${r.flip ? '#f59e0b' : positive ? 'var(--up)' : 'var(--down)'}`}
					<div class="flex items-center gap-3 text-xs">
						<span class="text-muted w-12 shrink-0 tabular-nums">{r.date.slice(5)}</span>
						<div class="relative h-3 flex-1 overflow-hidden rounded-full bg-white/5">
							<span class="absolute top-0 h-full rounded-full" style={barStyle}></span>
							<span class="absolute top-0 left-1/2 h-full w-px bg-white/25"></span>
						</div>
						<span
							class="w-20 shrink-0 text-right font-medium tabular-nums {positive
								? 'text-up'
								: 'text-down'}"
						>
							Rp {fmtCompact(net)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet levels(inv: NonNullable<Decision['invalidation']>, rsi: number | null)}
	{@const rows = [
		{ label: 'Harga sekarang', level: inv.close, note: 'Harga penutupan terakhir' },
		{
			label: 'Batas tren menengah',
			level: inv.ma50_level,
			note: 'Jika ditutup di bawah ini, tren menengah patah'
		},
		{
			label: 'Rata-rata 60 hari',
			level: inv.mean60_level,
			note: 'Di atas level ini berarti harga sudah terlalu tinggi'
		},
		{
			label: 'Batas bawah Bollinger',
			level: inv.bb_lower != null ? Math.round(inv.bb_lower) : null,
			note: 'Jika ditembus, tekanan jual biasanya meningkat'
		}
	].filter((r) => r.level != null)}
	{@const rsiText =
		rsi == null
			? null
			: rsi >= 65
				? 'Sudah mendekati area jenuh beli (overbought).'
				: rsi <= 35
					? 'Sudah mendekati area jenuh jual (oversold).'
					: 'Berada di area netral.'}
	<div class="space-y-4">
		<p class="text-muted text-sm leading-relaxed">
			Level ini adalah titik acuan. Jika harga bergerak melewatinya, tesis untuk menahan saham bisa
			tidak berlaku lagi.
		</p>
		<ul class="divide-y divide-[var(--border)]">
			{#each rows as r (r.label)}
				<li class="flex items-start justify-between gap-4 py-3">
					<div class="min-w-0">
						<p class="text-sm font-medium">{r.label}</p>
						<p class="text-muted text-xs leading-snug">{r.note}</p>
					</div>
					<p class="shrink-0 text-sm font-semibold tabular-nums">
						Rp {Number(r.level).toLocaleString('id-ID')}
					</p>
				</li>
			{/each}
		</ul>
		{#if rsiText}
			<p class="text-muted text-xs">
				Momentum (RSI {inv.rsi?.toFixed(0) ?? '-'}): {rsiText}
			</p>
		{/if}
	</div>
{/snippet}

{#snippet eventHistory(events: Decision['events'])}
	<div class="space-y-4">
		<p class="text-muted text-sm leading-relaxed">
			Ini menunjukkan apa yang biasanya terjadi pada saham ini setelah pola tertentu, dibandingkan
			dengan rata-rata pasar. Jumlah sampel kecil, jadi jadikan sebagai gambaran kasar saja.
		</p>
		<div class="space-y-3">
			{#each events as e (e.event)}
				{@const fwd = e.my_median_fwd}
				{@const abn = e.my_median_abnormal}
				<div class="rounded-xl border border-[var(--border)] p-4">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<p class="text-sm font-semibold">{EVENT_VIEW[e.event] ?? e.event}</p>
						<p class="text-muted text-xs tabular-nums">
							Terjadi {e.my_count} kali{e.my_last_date ? `, terakhir ${e.my_last_date}` : ''}
						</p>
					</div>
					<div class="mt-3 grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-muted text-xs">Rata-rata hasil setelahnya</p>
							<p class="font-semibold tabular-nums {(fwd ?? 0) >= 0 ? 'text-up' : 'text-down'}">
								{fwd === null ? '-' : fmtPct(fwd * 100)}
							</p>
						</div>
						<div>
							<p class="text-muted text-xs">Dibanding pasar</p>
							<p class="font-semibold tabular-nums {(abn ?? 0) >= 0 ? 'text-up' : 'text-down'}">
								{abn === null ? '-' : fmtPct(abn * 100)}
							</p>
						</div>
					</div>
					{#if e.description && !EVENT_VIEW[e.event]}
						<p class="text-muted mt-2 text-xs">{e.description}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet detailTabs(d: Decision)}
	<section class="card p-4 sm:p-5">
		<div
			role="tablist"
			aria-label="Detail keputusan"
			class="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1"
		>
			{#each TABS as t (t.key)}
				{@const active = t.key === tab}
				{@const TabIcon = t.icon}
				<button
					type="button"
					role="tab"
					aria-selected={active}
					onclick={() => (tab = t.key)}
					class="flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors {active
						? 'bg-[var(--accent)] text-white shadow-sm'
						: 'text-muted hover:text-[var(--fg)]'}"
				>
					<TabIcon size={15} aria-hidden="true" />
					{t.label}
				</button>
			{/each}
		</div>
		<div role="tabpanel" class="mt-5">
			{#if tab === 'aliran'}
				{@render foreignFlow(d.foreign_10)}
			{:else if tab === 'level'}
				{#if d.invalidation}
					{@render levels(d.invalidation, d.hold_check?.rsi ?? d.invalidation.rsi)}
				{:else}
					<EmptyState message="Riwayat harga belum cukup untuk menghitung level batas." />
				{/if}
			{:else if d.events.length > 0}
				{@render eventHistory(d.events)}
			{:else}
				<EmptyState message="Belum ada riwayat pola untuk emiten ini." />
			{/if}
		</div>
	</section>
{/snippet}

<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
	<header class="space-y-1">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Scale size={26} class="text-accent" aria-hidden="true" />
			Ruang <span class="gradient-text">Keputusan</span>
		</h1>
		<p class="text-muted text-sm">
			Cek apakah saham ini layak ditahan, dikurangi, atau dilepas, dengan bahasa yang mudah
			dipahami.
		</p>
	</header>

	{@render stockPicker(code)}

	{#if !code}
		{@render guide()}
	{:else if error}
		<ErrorState
			message="Gagal memuat keputusan: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<Skeleton class="h-72 w-full" />
	{:else}
		{@render verdict(data)}
		{@render contextTiles(data)}
		{#if code}
			<PositionPlanPanel {code} />
		{/if}
		{@render detailTabs(data)}
		<p class="text-muted text-xs leading-relaxed">
			Dihitung {data.generated_at}. Bukan rekomendasi beli atau jual. Keputusan akhir tetap ada di
			tangan kamu.
		</p>
	{/if}
</main>
