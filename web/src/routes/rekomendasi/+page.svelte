<script lang="ts">
	import { Award, ChevronDown, Crown, Lightbulb, List, ShieldAlert, Target } from "@lucide/svelte";
	import {
		useJournalSummary,
		useRecommendationTrack,
		useRecommendations
	} from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtNum, fmtNum1, fmtPct, trendClass } from "#lib/format.ts";
	import { asNumber, portfolioQuery, usePortfolio } from "#lib/portfolio.svelte.ts";
	import type {
		PositionPlan,
		RecommendationLayerStatus,
		RecommendationRow
	} from "#lib/types.ts";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import RegimeBanner from "#lib/components/RegimeBanner.svelte";
	import FreshnessBadge from "#lib/components/FreshnessBadge.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";
	import PortfolioStrip from "#lib/components/PortfolioStrip.svelte";
	import ClaimRecord from "#lib/components/ClaimRecord.svelte";

	type Grade = "A" | "B" | "C";

	/** Grade ditampilkan sebagai bahasa sehari-hari; kode A/B/C tetap dipakai untuk logika. */
	const GRADE_META: Record<Grade, { label: string; hint: string; badge: string }> = {
		A: { label: "Teratas", hint: "Peringkat paling kuat hari ini", badge: "badge badge-buy" },
		B: { label: "Bagus", hint: "Di bawah yang teratas, masih kuat", badge: "badge badge-warn" },
		C: { label: "Cadangan", hint: "Layak dipantau, bukan prioritas", badge: "badge badge-hold" }
	};

	const SETUP_LABEL: Record<string, string> = {
		pullback: "Turun sebentar lalu memantul",
		breakout: "Menembus area tertinggi",
		trend: "Sedang tren naik",
		netral: "Belum ada pola jelas"
	};

	const PATTERN_LABEL: Record<string, string> = {
		silent_accumulation: "Ada akumulasi diam-diam",
		initiation: "Volume & asing mulai masuk",
		distribution_on_rally: "Ada pelepasan saat naik",
		silent_distribution: "Ada pelepasan diam-diam"
	};

	const CONFIDENCE_LABEL: Record<string, string> = {
		tinggi: "Keyakinan tinggi",
		sedang: "Keyakinan sedang",
		lemah: "Keyakinan rendah"
	};

	/** Label skor (spec D3) - beda dari `confidence` pola buru di atas. */
	const SCORE_CONFIDENCE_LABEL: Record<string, string> = {
		meyakinkan: "Meyakinkan",
		"belum terbukti": "Belum terbukti"
	};

	const rp = (v: number | null | undefined) =>
		v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

	const pct = (v: number | null | undefined) =>
		v === null || v === undefined ? "-" : `${(v * 100).toFixed(2)}%`;

	/** `gate.reason` dari backend sudah diawali "rezim menolak:"; kalimat muka tidak mengulanginya. */
	const sebabGerbang = (reason: string | null | undefined) =>
		(reason ?? "").replace(/^rezim menolak:\s*/i, "").trim();

	const FILTERS: { grade: Grade; label: string; icon: typeof Crown }[] = [
		{ grade: "A", label: "Teratas", icon: Crown },
		{ grade: "B", label: "Teratas + Bagus", icon: Award },
		{ grade: "C", label: "Semua", icon: List }
	];

	/** Nama plafon dalam bahasa manusia (kunci `binding_cap` dari backend). */
	const PLAFON_LABEL: Record<string, string> = {
		per_name: "per nama",
		liquidity: "likuiditas",
		regime: "rezim",
		portfolio: "portofolio"
	};

	let minGrade = $state<Grade>("C");
	let limit = $state(20);

	// Empat angka keadaan pemilik (modal, risiko, posisi terbuka, eksposur) hidup
	// di localStorage browser ini dan hanya dikirim sebagai query - backend tidak
	// pernah menyimpannya, dan cache papan tidak dipecah olehnya.
	const { state: portfolio, setField } = usePortfolio();
	const query = $derived(portfolioQuery(portfolio));
	const modal = $derived(asNumber(portfolio.modal));

	const recs = useRecommendations(
		() => limit,
		() => minGrade,
		() => query
	);
	const semua = useRecommendations(
		100,
		"C",
		() => query
	);
	const track = useRecommendationTrack();
	// Rekaman aturan (lapis 4): satu baris yang sama untuk semua kartu, karena
	// klaimnya lahir dari satu aturan. Ambil sekali, bukan satu request per kartu.
	const journal = useJournalSummary();

	const data = $derived(recs.data);
	const error = $derived(recs.error);
	const isLoading = $derived(recs.isLoading);
	const all = $derived(semua.data);
	const trackData = $derived(track.data);
	const recordLine = $derived(journal.data?.record_line ?? null);

	const topCount = $derived(data?.rows.filter((r) => r.grade === "A").length ?? 0);
	// Dua sebab penahanan yang berbeda (spec D1 vs 6.5/Q5): kalimatnya tidak boleh
	// saling tukar - yang satu soal data yang belum masuk, yang satu soal rezim.
	const sebabTahanRezim = $derived(
		sebabGerbang(data?.gate?.reason) || "kondisi pasar belum mendukung"
	);
	const withheldNote = $derived.by(() => {
		if (data?.gate?.blocked) {
			return `Rezim sedang menolak: ${sebabTahanRezim}. Grade & rencana posisi ditahan sampai kondisinya berubah.`;
		}
		if (data?.withheld) {
			return `${data.freshness?.reason ?? "Data sesi ini belum segar."} Grade dan rencana posisi ditahan sampai datanya masuk.`;
		}
		return null;
	});
	// Verdict ditahan = hitungan grade tidak lagi bermakna: "0" di atas dua puluh
	// kartu yang jelas tampil akan terbaca sebagai halaman rusak.
	const countTidakBermakna = $derived(Boolean(data?.gate?.blocked || data?.withheld));

	function tabCount(grade: Grade): number | null {
		if (countTidakBermakna) return null;
		const rows = all?.rows ?? [];
		const allowed = grade === "A" ? ["A"] : grade === "B" ? ["A", "B"] : ["A", "B", "C"];
		// Grade `null` = verdict ditahan (spec D1): bukan kandidat, jangan dihitung.
		return all ? rows.filter((r) => r.grade !== null && allowed.includes(r.grade)).length : null;
	}

	// Horizon track record hidup di halaman (satu instance); nilai awalnya horizon
	// pertama dari backend, sama seperti komponen Next saat pertama dipasang.
	let horizonPilihan = $state<number | null>(null);
	const horizon = $derived(
		trackData
			? horizonPilihan !== null && trackData.horizons.includes(horizonPilihan)
				? horizonPilihan
				: (trackData.horizons[0] ?? 5)
			: 5
	);
	const trackRows = $derived(
		trackData ? trackData.by_grade.filter((r) => r.horizon === horizon) : []
	);
</script>

{#snippet stat(label: string, value: string, tone = "")}
	<div>
		<p class="text-muted text-[11px]">{label}</p>
		<p class="mt-0.5 text-sm font-semibold tabular-nums {tone}">{value}</p>
	</div>
{/snippet}

<!--
	Baris rencana posisi di kartu papan (permukaan A, spec P5): porsi, nilai beli,
	lot, dan rugi kalau stop kena. Tanpa modal hanya porsi persen yang tampil -
	rupiah dan lot yang dikarang lebih buruk daripada tidak ada.
-->
{#snippet planLine(plan: PositionPlan, modal: number | null)}
	{#if plan.pct !== null}
		{@const plafon = plan.binding_cap
			? (PLAFON_LABEL[plan.binding_cap] ?? plan.binding_cap)
			: null}
		{@const adaModal = plan.rupiah !== null}
		{@const adaLot = adaModal && plan.lots !== null && plan.lots > 0}
		<!-- Risiko yang berlaku = rugi stop dibagi modal, dibulatkan satu desimal seperti
		     angka lain di layar. Angkanya dari backend, jadi pembulatan lot sudah ikut. -->
		{@const rasio =
			adaLot && modal !== null && modal > 0 && plan.risk_rupiah !== null
				? (plan.risk_rupiah / modal) * 100
				: null}
		{@const risikoModal = rasio === null ? null : fmtNum(Math.round(rasio * 10) / 10)}
		{@const catatan = plan.lots === 0 || plan.binding_cap !== null ? plan.note : null}
		{@const sisa = adaLot
			? ` · ${rp(plan.rupiah)} · ${fmtNum(plan.lots)} lot`
			: adaModal
				? ""
				: " modal"}
		{@const sebutPlafon = plafon ? ` (plafon ${plafon})` : ""}

		<div class="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-xs">
			<p class="font-semibold tabular-nums">
				Porsi {fmtNum1(plan.pct)}%{sebutPlafon}{sisa}
			</p>
			{#if adaLot}
				<p class="text-muted mt-0.5 tabular-nums">
					stop kena = rugi {rp(plan.risk_rupiah)}{risikoModal ? ` (${risikoModal}% modal)` : ""}
				</p>
			{/if}
			{#if catatan}
				<p class="mt-1 text-[11px] leading-snug" style="color: var(--warn)">{catatan}</p>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet candidateCard(
	row: RecommendationRow,
	withheldNote: string | null,
	modal: number | null,
	recordLine: string | null
)}
	{@const grade = GRADE_META[row.grade as Grade] ?? GRADE_META.C}
	<!-- Verdict bisa ditahan karena dua sebab berbeda: data basi (spec D1) atau rezim
	     yang eksplisit menolak (spec 6.5/Q5). Grade & ukuran posisi jadi `null`. -->
	{@const withheld = row.withheld === true || row.grade === null}
	{@const entry =
		row.entry_low !== null && row.entry_high !== null
			? `${rp(row.entry_low)} – ${fmtNum(row.entry_high)}`
			: rp(row.entry_ref)}
	{@const m = row.metrics}
	{@const why = row.reasons[0]}

	<li class="card card-hover flex h-full flex-col p-4">
		<div class="flex items-center justify-between gap-3">
			<div class="flex min-w-0 items-center gap-3">
				<TickerLogo code={row.code} size={40} />
				<div class="min-w-0">
					<a href="/keputusan/{row.code}" class="text-base font-bold hover:underline">
						{row.code}
					</a>
					<p class="text-muted truncate text-xs">{row.name ?? "-"}</p>
				</div>
			</div>
			<div class="shrink-0 text-right">
				{#if withheld}
					<span class="badge badge-hold">Ditahan</span>
				{:else}
					<span class={grade.badge}>{grade.label}</span>
				{/if}
				<!-- Skala yang bisa dibandingkan (spec D3 poin 1): peringkat persentil di
				     antara KANDIDAT yang lolos penyaringan hari itu. -->
				<p class="text-muted mt-1 text-[11px] tabular-nums">
					{row.percentile === null || row.percentile === undefined
						? "-"
						: `Peringkat ${Math.round(row.percentile)}% dari kandidat`}
				</p>
			</div>
		</div>

		{#if why}
			<p class="mt-3 flex gap-2 text-xs leading-relaxed">
				<Lightbulb size={14} class="text-muted mt-0.5 shrink-0" aria-hidden />
				<span>{why}</span>
			</p>
		{/if}

		{#if withheld}
			<p
				class="mt-3 flex flex-wrap gap-1.5 text-[11px] leading-snug"
				style="color: var(--warn)"
				role="status"
			>
				<ShieldAlert size={13} class="mt-0.5 shrink-0" aria-hidden />
				<span
					>{withheldNote ?? "Verdict ditahan: grade & rencana posisi belum bisa dipakai."}</span
				>
			</p>
		{/if}

		<div class="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-white/[0.03] p-3">
			{@render stat("Harga beli", entry)}
			{@render stat("Batas rugi", rp(row.stop), "text-down")}
			{@render stat("Target", rp(row.target), "text-up")}
		</div>

		{#if !withheld && row.plan}
			{@render planLine(row.plan, modal)}
		{/if}

		{#if row.warnings.length > 0}
			<p class="mt-3 flex flex-wrap gap-1.5 text-[11px] leading-snug text-[var(--warn)]">
				<ShieldAlert size={13} class="mt-0.5 shrink-0" aria-hidden />
				<span>{row.warnings[0]}</span>
			</p>
		{/if}

		{#if recordLine}
			<p class="text-muted mt-3 text-[11px] leading-snug tabular-nums">{recordLine}</p>
		{/if}

		<details class="group mt-auto pt-3">
			<summary
				class="text-muted flex cursor-pointer list-none items-center gap-1 text-[11px] hover:text-[var(--fg)]"
			>
				<ChevronDown size={13} class="transition-transform group-open:rotate-180" aria-hidden />
				Lihat detail
			</summary>
			<div class="mt-3 space-y-3 text-xs">
				<div class="grid grid-cols-2 gap-3">
					{@render stat("Pola", row.setup ? (SETUP_LABEL[row.setup] ?? row.setup) : "-")}
					{@render stat(
						"Perkiraan waktu",
						row.horizon_days ? `±${row.horizon_days} hari bursa` : "-"
					)}
					{@render stat("Untung vs rugi", row.rr === null ? "-" : `1 : ${row.rr.toFixed(1)}`)}
					{@render stat(
						"Vs riwayat sendiri",
						row.own_percentile === null || row.own_percentile === undefined
							? "-"
							: `${Math.round(row.own_percentile)}%`
					)}
					{@render stat(
						"Keyakinan skor",
						row.score_confidence
							? (SCORE_CONFIDENCE_LABEL[row.score_confidence] ?? row.score_confidence)
							: "-"
					)}
				</div>
				{#if row.confidence}
					<p class="text-muted">{CONFIDENCE_LABEL[row.confidence] ?? row.confidence}</p>
				{/if}
				{#if row.patterns.length > 0}
					<div class="flex flex-wrap gap-1.5">
						{#each row.patterns as p}
							<span class="badge badge-hold">{PATTERN_LABEL[p] ?? p}</span>
						{/each}
					</div>
				{/if}
				{#if row.reasons.length > 1}
					<ul class="text-muted list-inside list-disc space-y-0.5 leading-snug">
						{#each row.reasons.slice(1, 4) as r}
							<li>{r}</li>
						{/each}
					</ul>
				{/if}
				{#if row.warnings.length > 1}
					<ul class="space-y-0.5 leading-snug text-[var(--warn)]">
						{#each row.warnings.slice(1, 3) as w}
							<li>{w}</li>
						{/each}
					</ul>
				{/if}
				{#if m}
					<p class="text-muted tabular-nums">
						RSI {m.rsi === null ? "-" : m.rsi.toFixed(0)} · Momentum 20 hari {m.mom_20d === null
							? "-"
							: fmtPct(m.mom_20d)} · Nilai transaksi {m.value === null
							? "-"
							: fmtCompact(m.value)}
					</p>
				{/if}
				{#if row.entry_note}
					<p class="text-muted leading-snug">{row.entry_note}</p>
				{/if}
				{#if row.rank_basis && row.rank_basis.order.length > 0}
					<p class="text-muted text-[11px] leading-snug">
						Urutan saat skor seri: {row.rank_basis.order.join(" → ")}.
					</p>
				{/if}
				<p class="text-muted text-[11px] leading-snug tabular-nums">
					Skor dasar {row.score.toFixed(1)} — angka ini peringkat mentah, bukan ukuran keyakinan.
				</p>
				<div class="flex gap-4 pt-1 text-[11px]">
					<a href="/keputusan/{row.code}" class="font-medium hover:underline">
						Ruang Keputusan →
					</a>
					<a href="/stock/{row.code}" class="font-medium hover:underline">
						Grafik &amp; teknikal →
					</a>
				</div>
			</div>
		</details>
	</li>
{/snippet}

{#snippet layerList(layers: RecommendationLayerStatus)}
	{@const items = [
		{ on: true, label: "Pola harga dan volume", note: "Selalu dipakai" },
		{ on: layers.factor, label: "Faktor saham yang terbukti", note: layers.factor_note },
		{ on: layers.broker, label: "Aliran dana broker", note: layers.broker_note }
	]}
	<div class="mt-3 space-y-2 text-xs">
		{#each items as it (it.label)}
			<div class="flex items-start gap-2">
				<span
					class="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
					style="background: {it.on ? 'var(--up)' : 'var(--border)'}"
					aria-hidden="true"
				></span>
				<div>
					<p class={it.on ? 'font-medium' : 'text-muted font-medium'}>
						{it.label} · {it.on ? "ikut dihitung" : "belum ikut dihitung"}
					</p>
					{#if it.note}<p class="text-muted">{it.note}</p>{/if}
				</div>
			</div>
		{/each}
		{#if layers.note}<p class="text-muted pt-1 leading-snug">{layers.note}</p>{/if}
	</div>
{/snippet}

{#snippet trackRecord(t: NonNullable<typeof trackData>)}
	{#if !t.candidates}
		<EmptyState
			message={t.reason ??
				"Belum ada riwayat rekomendasi. Data akan terisi otomatis setelah sistem berjalan beberapa hari."}
		/>
	{:else}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-muted text-xs">Cek hasilnya setelah:</span>
				{#each t.horizons as h (h)}
					<button
						type="button"
						onclick={() => (horizonPilihan = h)}
						aria-pressed={h === horizon}
						class="rounded-full border px-3 py-1 text-xs font-medium transition-colors {h === horizon
							? 'border-[var(--accent)] bg-[var(--accent)] text-white'
							: 'border-[var(--border)] text-muted hover:bg-white/[0.06]'}"
					>
						{h} hari bursa
					</button>
				{/each}
				<span class="text-muted ml-auto text-[11px] tabular-nums">
					{t.candidates} rekomendasi tercatat · {t.first_date} s/d {t.last_date}
				</span>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				{#each trackRows as r (r.grade)}
					{@const grade = GRADE_META[r.grade as Grade] ?? GRADE_META.C}
					{@const hit = r.hit_rate === null ? null : Math.round(r.hit_rate * 100)}
					{@const beat = r.mean_abnormal === null ? null : r.mean_abnormal >= 0}
					<div class="rounded-xl border border-[var(--border)] p-4">
						<div class="flex items-center justify-between">
							<span class={grade.badge}>{grade.label}</span>
							<span class="text-muted text-[11px] tabular-nums">{r.n} sampel</span>
						</div>
						<p class="text-muted mt-3 text-xs">Dari 100 rekomendasi, yang naik:</p>
						<p class="text-3xl font-bold tabular-nums">
							{hit === null ? "-" : hit}<span class="text-muted text-base font-semibold"> / 100</span>
						</p>
						{#if hit !== null}
							<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
								<div class="bg-up h-full rounded-full" style="width: {hit}%"></div>
							</div>
						{/if}
						<div class="mt-4 space-y-2 text-xs">
							<div class="flex justify-between gap-2">
								<span class="text-muted">Rata-rata perubahan</span>
								<span class="font-semibold tabular-nums {trendClass(r.mean_fwd)}">
									{pct(r.mean_fwd)}
								</span>
							</div>
							<div class="flex justify-between gap-2">
								<span class="text-muted">Dibanding pasar</span>
								<span class="font-semibold tabular-nums {trendClass(r.mean_abnormal)}">
									{r.mean_abnormal === null
										? "-"
										: `${beat ? "Lebih baik" : "Lebih buruk"} ${pct(Math.abs(r.mean_abnormal))}`}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
			<p class="text-muted text-xs leading-relaxed">
				Hasil masa lalu tidak menjamin hasil ke depan. Sampel kecil sebaiknya dibaca sekilas saja.
			</p>
		</div>
	{/if}
{/snippet}

<svelte:head>
	<title>Rekomendasi Beli · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
	<header class="space-y-2">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Target size={26} class="text-accent" aria-hidden />
			Rekomendasi <span class="gradient-text">Beli</span>
		</h1>
		<p class="text-muted max-w-2xl text-sm leading-relaxed">
			Saham yang menurut sistem paling layak dibeli hari ini, lengkap dengan harga beli, batas rugi,
			dan target. Pilih kandidat, baca alasannya, lalu putuskan sendiri.
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<LastUpdated sessionDate={data?.date} updatedAt={data?.generated_at} />
			<FreshnessBadge basis="panel" freshness={data?.freshness} />
		</div>
		{#if data?.gate?.blocked}
			<p class="text-warn text-xs leading-relaxed" role="status">
				Gerbang rezim menahan tawaran baru: {sebabTahanRezim}. Angka, harga beli, batas rugi, dan
				target tetap tampil — yang ditahan cuma grade dan rencana posisi.
			</p>
		{/if}
		{#if data?.withheld}
			<p class="text-warn text-xs leading-relaxed" role="status">
				{data.freshness?.reason ?? "Data sesi ini belum segar."} Grade dan rencana posisi ditahan
				sampai datanya masuk.
			</p>
		{/if}
		{#if data?.gate && data.gate.regime_fresh === false}
			<p class="text-warn text-xs leading-relaxed" role="status">
				{data.gate.reason} — penanda ini soal seri rezimnya, bukan soal panel saham: papan tetap
				terbuka.
			</p>
		{/if}
	</header>

	<RegimeBanner />

	<PortfolioStrip state={portfolio} {setField} gated={Boolean(data?.gate?.blocked)} />

	<!-- Rekaman klaim berdiri sendiri di atas papan: papan yang gagal dimuat
	     tidak boleh ikut menghapus rekaman dan tombol halt dari layar. -->
	<ClaimRecord />

	{#if error}
		<ErrorState message="Gagal memuat rekomendasi. Pastikan backend & database hidup." />
	{:else}
		<section class="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
			{@render stat("Kandidat hari ini", data ? `${data.total_candidates} saham` : "-")}
			<!-- Kolam = nama yang berhak masuk papan (likuid & konsisten). Yang benar-benar
			     dinilai lebih sedikit dari itu, dan yang tampil lebih sedikit lagi. -->
			{@render stat(
				"Kolam → tampil",
				data && data.pool_size != null ? `${data.pool_size} → ${data.rows.length} saham` : "-"
			)}
			{@render stat("Kategori Teratas", data ? `${topCount} saham` : "-")}
			{@render stat("Emiten dipindai", data ? `${data.scanned} saham` : "-")}
			{@render stat("Data sesi", data?.date ?? "-")}
		</section>

		<section class="space-y-4">
			<div
				class="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)]"
			>
				<div role="tablist" aria-label="Filter kategori" class="flex flex-wrap gap-1">
					{#each FILTERS as f (f.grade)}
						{@const active = f.grade === minGrade}
						{@const jumlah = tabCount(f.grade)}
						{@const FilterIcon = f.icon}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (minGrade = f.grade)}
							class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors {active
								? 'border-[var(--accent)] text-[var(--fg)]'
								: 'text-muted border-transparent hover:text-[var(--fg)]'}"
						>
							<FilterIcon size={15} aria-hidden />
							{f.label}
							{#if jumlah !== null}
								<span class="text-muted rounded-full bg-white/[0.06] px-1.5 text-[11px]">
									{jumlah}
								</span>
							{/if}
						</button>
					{/each}
				</div>
				<label class="text-muted flex items-center gap-2 pb-2 text-xs">
					Tampilkan
					<select
						bind:value={limit}
						class="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-xs text-[var(--fg)]"
					>
						{#each [10, 20, 50, 100] as n (n)}
							<option value={n}>{n} saham</option>
						{/each}
					</select>
				</label>
			</div>
			<p class="text-muted text-xs">
				{GRADE_META[minGrade].hint}.{#if minGrade !== "A"}{" "}Teratas: peringkat paling kuat hari
					itu. Bagus: di bawahnya, masih kuat.{/if}
			</p>

			{#if isLoading || !data}
				<Skeleton class="h-64 w-full" />
			{:else if data.rows.length === 0}
				<EmptyState
					message={minGrade === "A"
						? "Belum ada saham kategori Teratas hari ini. Coba pilih 'Teratas + Bagus' atau 'Semua'."
						: "Belum ada saham yang lolos penilaian hari ini."}
				/>
			{:else}
				<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each data.rows as row (row.code)}
						{@render candidateCard(row, withheldNote, modal, recordLine)}
					{/each}
				</ul>
			{/if}
		</section>

		<section class="space-y-3">
			<div>
				<h2 class="text-lg font-semibold">Seberapa akurat sistem ini?</h2>
				<p class="text-muted text-xs">
					Kami cek kembali rekomendasi masa lalu: apakah harganya benar-benar naik?
				</p>
			</div>
			{#if trackData}
				{@render trackRecord(trackData)}
			{:else}
				<Skeleton class="h-40 w-full" />
			{/if}
		</section>

		{#if data}
			<details class="card p-4">
				<summary
					class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold"
				>
					Dari mana skor ini berasal?
					<ChevronDown size={16} class="text-muted" aria-hidden />
				</summary>
				{@render layerList(data.layers)}
			</details>
		{/if}
	{/if}

	<p class="text-muted border-t border-[var(--border)] pt-4 text-xs leading-relaxed">
		Ini alat bantu riset, bukan saran keuangan. Harga beli, batas rugi, dan target adalah acuan dari
		harga, bukan janji. Keputusan akhir tetap ada di tangan kamu.
	</p>
</main>
