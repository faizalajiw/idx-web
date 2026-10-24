<script lang="ts">
	import { Check, ShieldCheck } from "@lucide/svelte";
	import { useFactorsOverview, useRegimeHistory } from "#lib/hooks.svelte.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";

	const f4 = (v: number | null) => (v === null ? "-" : v.toFixed(4));
	const f2 = (v: number | null) => (v === null ? "-" : v.toFixed(2));
	const p1 = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);

	const FACTOR_LABEL: Record<string, string> = {
		vol_21d: "Volatilitas 21h",
		turnover_21d: "Likuiditas 21h",
		dist_52w_high: "Jarak puncak 52w",
		mom_5d: "Momentum 5h",
		mom_10d: "Momentum 10h",
		mom_21d: "Momentum 21h",
		mom_63d: "Momentum 63h",
		mom_12_1: "Momentum 12-1",
		rev_1d: "Reversal 1h",
		amihud_21d: "Illiquidity Amihud",
		rel_volume: "Volume relatif",
		vol_rank_63d: "Rank volume 63h",
		foreign_net_pct: "Foreign net %",
		foreign_streak: "Foreign streak",
		ob_imbalance: "Ketimpangan buku",
		ob_absorption: "Absorption"
	};

	/** Fallback registry bila API belum menyertakan `definitions`. */
	const FACTOR_FALLBACK: Record<string, string> = {
		mom_5d: "Return 5 hari bursa (momentum jangka pendek)",
		mom_10d: "Return 10 hari bursa",
		mom_21d: "Return 1 bulan bursa (~21 hari)",
		mom_63d: "Return 3 bulan bursa (~63 hari)",
		mom_12_1: "Momentum klasik 12-1: return ~252h dikurangi bulan terakhir",
		rev_1d: "Reversal 1 hari (kebalikan return kemarin)",
		vol_21d: "Volatilitas 21 hari (std return harian)",
		amihud_21d: "Illiquidity Amihud 21 hari: |ret| per rupiah volume",
		turnover_21d: "Rata-rata value transaksi 21 hari (log)",
		rel_volume: "Volume hari ini relatif rata-rata 21 hari",
		dist_52w_high: "Jarak dari puncak 52 minggu (<= 0)",
		vol_rank_63d: "Percentile volume hari ini dalam 63 hari terakhir",
		foreign_net_pct: "Foreign net / value transaksi (hari yang sama)",
		foreign_streak: "Hari berturut-turut foreign net positif (negatif = jual)",
		ob_imbalance: "Ketimpangan buku intraday: (bid_vol-offer_vol)/(total) rata-rata",
		ob_absorption: "Buku vs arah harga: imbalance tertanda saat tick bergerak (negatif = absorption)"
	};

	const REGIME_BADGE: Record<string, string> = {
		TRENDING_UP: "badge badge-buy",
		TRENDING_DOWN: "badge badge-sell",
		TRANSITION: "badge badge-warn",
		RANGING: "badge badge-hold"
	};

	// Satu kunci cache untuk semua kartu di halaman ini — dipakai bersama.
	const overview = useFactorsOverview();
	const regimeQuery = useRegimeHistory(90);
	const data = $derived(overview.data);
	const regime = $derived(regimeQuery.data);
</script>

{#snippet weightsCard()}
	{#if overview.error}
		<ErrorState message="Gagal memuat bobot faktor." />
	{:else if overview.isLoading || !data}
		<Skeleton class="h-24 w-full" />
	{:else if !data.latest_run}
		<EmptyState
			message="Belum ada run IC tersimpan. Jalankan `idx ic` — bobot composite memakai default indikatif."
		/>
	{:else}
		{@const total = Object.values(data.weights).reduce((a, b) => a + b, 0)}
		{@const weights = Object.entries(data.weights)}
		<div class="space-y-3">
			<p class="text-muted text-sm">
				Bobot aktif (run {data.latest_run}, horizon 10 hari bursa, proporsional |IC|):
			</p>
			<div class="space-y-2">
				{#each weights as [factor, w] (factor)}
					<div>
						<div class="flex justify-between text-xs">
							<span class="font-medium">{FACTOR_LABEL[factor] ?? factor}</span>
							<span class="text-muted tabular-nums">{(w * 100).toFixed(0)}%</span>
						</div>
						<div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
							<div
								class="h-full rounded-full bg-[var(--accent)]"
								style="width: {total > 0 ? (w / total) * 100 : 0}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
			<p class="text-muted text-[11px]">
				Bobot di atas 0 hanya untuk faktor yang lolos ambang ketat (|IC| ≥ 0,05 dan |ICIR| ≥ 0,5). Bila
				tidak ada yang lolos, composite memakai bobot default indikatif — keputusan tetap didominasi
				sinyal teknikal.
			</p>
		</div>
	{/if}
{/snippet}

{#snippet regimeSummary()}
	{#if !regimeQuery.error && !regimeQuery.isLoading && regime}
		{@const s = regime.summary}
		{#if !s || s.days === 0}
			<p class="text-muted text-sm">
				Histori kondisi IHSG belum tersedia — job harian 16:10 WIB akan mengisinya (atau buka halaman
				ini lagi untuk memicu backfill).
			</p>
		{:else}
			<div class="space-y-2 text-sm">
				<p class="text-muted">
					{s.days} hari bursa ({s.first ?? ""} → {s.last ?? ""}) · rata-rata ADX {s.avg_adx ?? "—"} ·
					{s.transitions} transisi kondisi.
				</p>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(s.share) as [rg, pct] (rg)}
						<span class="{REGIME_BADGE[rg] ?? 'badge badge-hold'} tabular-nums">
							{rg.replace("TRENDING_", "TREND ").replace("_", " ")}: {pct}%
						</span>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet factorsTable(horizon: 5 | 10)}
	{#if overview.error}
		<ErrorState message="Gagal memuat faktor." />
	{:else if overview.isLoading || !data}
		<Skeleton class="h-64 w-full" />
	{:else if !data.latest_run}
		<EmptyState />
	{:else}
		{@const rows = data.factors.filter((f) => f.horizon === horizon)}
		<div class="overflow-x-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th class="text-left">Faktor</th>
						<th class="text-right">Mean IC</th>
						<th class="text-right">ICIR</th>
						<th class="text-right">t-stat (NW)</th>
						<th class="text-right">Hit rate</th>
						<th class="text-right">Hari</th>
						<th class="text-center">Layak</th>
						<th class="text-right">Bobot</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as f (f.factor)}
						<tr>
							<td class="font-medium">{FACTOR_LABEL[f.factor] ?? f.factor}</td>
							<td
								class="text-right tabular-nums {f.mean_ic !== null && Math.abs(f.mean_ic) >= 0.05
									? 'text-up'
									: ''}"
							>
								{f4(f.mean_ic)}
							</td>
							<td class="text-right tabular-nums">{f2(f.icir)}</td>
							<td class="text-right tabular-nums">{f2(f.t_stat)}</td>
							<td class="text-muted text-right tabular-nums">{p1(f.hit_rate)}</td>
							<td class="text-muted text-right tabular-nums">{f.n_days ?? "-"}</td>
							<td class="text-center">
								{#if f.eligible}
									<span class="badge badge-buy"><Check size={13} /></span>
								{:else}
									<span class="text-muted">—</span>
								{/if}
							</td>
							<td class="text-right tabular-nums">
								{f.weight && f.weight > 0 ? `${(f.weight * 100).toFixed(0)}%` : "-"}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{/snippet}

{#snippet calibrationHistory()}
	{#if !overview.error && !overview.isLoading && data}
		{#if !data.latest_run || data.history.length === 0}
			<EmptyState />
		{:else}
			<div class="flex flex-wrap gap-2">
				{#each data.history as h (h.run_date)}
					<span class="badge badge-hold tabular-nums">
						{h.run_date}: {h.rows} baris · {h.eligible} layak
					</span>
				{/each}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet factorRegistry()}
	{@const defs = data?.definitions ?? FACTOR_FALLBACK}
	{@const entries = Object.entries(defs)}
	<div class="space-y-2">
		<p class="text-muted text-sm">
			{entries.length} faktor dihitung engine IC tiap rekalibrasi — termasuk faktor order-book dari
			snapshot intraday.
		</p>
		<ul class="grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
			{#each entries as [key, desc] (key)}
				<li class="flex flex-col border-b border-[var(--border)] pb-1.5">
					<span class="text-sm font-medium">{FACTOR_LABEL[key] ?? key}</span>
					<span class="text-muted text-xs">{desc}</span>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

<svelte:head>
	<title>Faktor &amp; Kalibrasi · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<ShieldCheck size={26} class="text-accent" aria-hidden="true" />
			Faktor &amp; <span class="gradient-text">Kalibrasi</span>
		</h1>
		<p class="text-muted mt-0.5 flex items-center gap-2 text-sm">
			Hasil IC analysis bulanan: faktor mana yang benar-benar predictive di data IDX, dan bobot yang
			dipakai composite skor keputusan.
			<LastUpdated sessionDate={data?.latest_run} />
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<Card
			title="Bobot Composite Aktif"
			subtitle="Dari run IC terbaru — otomatis dipakai skor keputusan"
			info="Seberapa besar 'suara' tiap faktor (momentum, valuasi, dll) dalam skor gabungan. Bobot lebih besar = faktor itu dianggap lebih andal belakangan ini. Dihitung otomatis dari data."
		>
			{@render weightsCard()}
		</Card>
		<Card
			title="Kondisi IHSG Historis"
			subtitle="Distribusi kondisi + transisi (backfill otomatis)"
			info="Rekap seberapa sering pasar berada di tiap kondisi (tren naik/turun/sideways) dan seberapa sering berpindah. Membantu paham karakter pasar dari waktu ke waktu."
		>
			{@render regimeSummary()}
		</Card>
	</div>

	<Card
		title="IC per Faktor — Horizon 5 hari"
		subtitle="Spearman rank IC faktor vs forward return, fill T+1"
		info="IC (Information Coefficient) = ukuran seberapa akurat sebuah faktor memprediksi arah harga ~5 hari ke depan. Makin tinggi = faktor makin bisa diandalkan. Ini analisis lanjutan; pengguna awam bisa mengabaikannya."
	>
		{@render factorsTable(5)}
	</Card>
	<Card
		title="IC per Faktor — Horizon 10 hari"
		subtitle="Horizon acuan bobot composite"
		info="Sama seperti di atas, tapi mengukur prediksi ~10 hari ke depan. Horizon inilah yang dipakai untuk menentukan bobot faktor di skor gabungan."
	>
		{@render factorsTable(10)}
	</Card>

	<Card
		title="Riwayat Rekalibrasi"
		subtitle="Setiap run menyimpan snapshot lengkap — idempoten per tanggal"
		info="Catatan setiap kali sistem menghitung ulang bobot faktornya. Berguna untuk melacak bagaimana 'resep' skor berubah seiring waktu."
	>
		{@render calibrationHistory()}
	</Card>

	<Card
		title="Registry Faktor"
		subtitle="Semua faktor yang dihitung — definisi persis seperti di kode"
		info="Daftar lengkap semua faktor beserta definisinya, persis seperti yang dihitung program. Untuk transparansi — supaya jelas angka datang dari mana."
	>
		{@render factorRegistry()}
	</Card>

	<p class="text-muted text-[11px] leading-snug">
		Metodologi: IC = korelasi rank (Spearman) antara nilai faktor di hari T dan return T+1 → T+1+k; t-stat
		memakai Newey-West lag 5 karena window return tumpang tindih. Ambang kelayakan |IC| ≥ 0,05 dan |ICIR| ≥
		0,5 adalah rule-of-thumb kuantitatif, bukan jaminan hasil masa depan.
	</p>
</main>
