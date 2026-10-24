<script lang="ts">
	import { Activity, Check, Info } from '@lucide/svelte';
	import { useBrokerActivity } from '#lib/hooks.svelte.ts';
	import { fmtCompact, fmtNum, fmtPct, trendClass } from '#lib/format.ts';
	import type { BrokerActivity, BrokerActivityDriver, BrokerActivityFactor } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import BrokerFlowCard from '#lib/components/BrokerFlowCard.svelte';
	import FlowTimelineCard from '#lib/components/FlowTimelineCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';

	const f4 = (v: number | null) => (v === null ? '-' : v.toFixed(4));
	const f2 = (v: number | null) => (v === null ? '-' : v.toFixed(2));
	const p0 = (v: number | null) => (v === null ? '-' : `${(v * 100).toFixed(0)}%`);

	const activity = useBrokerActivity(25);
	const data = $derived(activity.data);
	// Emiten yang dipilih di tabel -> timeline aliran dananya muncul di bawah.
	let selected = $state<string | null>(null);

	function toggleSelected(code: string) {
		selected = selected === code ? null : code;
	}

	function onRowKeydown(e: KeyboardEvent, code: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleSelected(code);
		}
	}

	function rowClass(code: string): string {
		return `cursor-pointer transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
			selected === code ? 'bg-white/[0.06]' : ''
		}`;
	}
</script>

<!-- Bar skor 0–100. Skala relatif: 50 = median pasar, bukan "netral = aman". -->
{#snippet scoreBar(score: number)}
	<div class="flex items-center gap-2">
		<span class="w-9 shrink-0 text-right text-sm font-semibold tabular-nums">
			{score.toFixed(0)}
		</span>
		<div class="h-1.5 w-full min-w-[52px] overflow-hidden rounded-full bg-white/10">
			<div
				class="h-full rounded-full {score >= 50 ? 'bg-[var(--accent)]' : 'bg-white/30'}"
				style="width: {Math.max(0, Math.min(100, score))}%"
			></div>
		</div>
	</div>
{/snippet}

<!-- Tanda kontribusi = arah dorongan ke skor (bukan arah harga). -->
{#snippet driverChips(drivers: BrokerActivityDriver[])}
	<div class="flex flex-wrap gap-1">
		{#each drivers as d (d.factor)}
			<span class="badge badge-hold gap-1 whitespace-nowrap">
				<span class={d.contribution >= 0 ? 'text-up' : 'text-down'}>
					{d.contribution >= 0 ? '▲' : '▼'}
				</span>
				{d.label}
				{#if d.percentile !== null}
					<span class="text-muted tabular-nums">{p0(d.percentile)}</span>
				{/if}
			</span>
		{/each}
	</div>
{/snippet}

{#snippet rankingTable(d: BrokerActivity)}
	{#if !d.validated}
		<div class="space-y-3">
			<div
				class="rounded-md border border-[rgba(255,193,7,0.3)] bg-[rgba(255,193,7,0.07)] p-3 text-sm"
			>
				<p class="font-medium">Skor belum tervalidasi — sengaja tidak ditampilkan.</p>
				<p class="text-muted mt-1">{d.reason}</p>
			</div>
			<p class="text-muted text-xs leading-snug">
				Menu ini hanya menghitung skor dari faktor yang sudah lulus uji statistik (Information
				Coefficient). Menampilkan ranking sebelum ada faktor yang lolos berarti menyajikan angka
				tanpa dasar — jadi lebih baik kosong.
			</p>
		</div>
	{:else if d.rows.length === 0}
		<EmptyState message="Tidak ada emiten dengan data aliran yang cukup." />
	{:else}
		<div class="overflow-x-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th class="text-left">#</th>
						<th class="text-left">Emiten</th>
						<th class="text-left">Skor akumulasi</th>
						<th class="text-right">Harga</th>
						<th class="text-right">%</th>
						<th class="text-left">Sinyal utama</th>
					</tr>
				</thead>
				<tbody>
					{#each d.rows as r, i (r.code)}
						<tr
							class={rowClass(r.code)}
							title="Klik untuk lihat timeline aliran dana emiten ini"
							tabindex="0"
							onclick={() => toggleSelected(r.code)}
							onkeydown={(e) => onRowKeydown(e, r.code)}
						>
							<td class="text-muted tabular-nums">{i + 1}</td>
							<td>
								<div class="flex flex-col">
									<span class="inline-flex items-center gap-2 font-semibold">
										<TickerLogo code={r.code} size={18} />
										{r.code}
									</span>
									{#if r.name}
										<span class="text-muted max-w-[190px] truncate text-[10px]">{r.name}</span>
									{/if}
								</div>
							</td>
							<td>
								{@render scoreBar(r.score)}
							</td>
							<td class="text-right tabular-nums">{fmtNum(r.close, 2)}</td>
							<td class="text-right tabular-nums {trendClass(r.percent)}">{fmtPct(r.percent)}</td>
							<td>
								{#if r.drivers.length === 0}
									<span class="text-muted text-xs">—</span>
								{:else}
									{@render driverChips(r.drivers)}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="text-muted mt-3 text-[11px] leading-snug">
				Skala skor 0–100 bersifat <em>relatif</em>: 50 = median pasar, dan angka ini memeringkatkan
				emiten terhadap emiten lain pada hari yang sama — bukan perkiraan persentase kenaikan harga.
				Klik baris emiten untuk membuka timeline aliran dananya. Data harga {d.as_of ?? '-'}.
			</p>
			{#if selected}
				<div class="mt-3">
					<FlowTimelineCard code={selected} title="Timeline Aliran Dana — {selected}" />
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet factorGate(d: BrokerActivity)}
	{#if d.factors.length === 0}
		<EmptyState message="Belum ada faktor aliran yang diuji — jalankan `idx ic` di backend dulu." />
	{:else}
		<div class="overflow-x-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th class="text-left">Faktor</th>
						<th class="text-right">Mean IC</th>
						<th class="text-right">ICIR</th>
						<th class="text-right">t-stat</th>
						<th class="text-right">Hari</th>
						<th class="text-center">Arah historis</th>
						<th class="text-center">Lulus</th>
						<th class="text-right">Bobot</th>
					</tr>
				</thead>
				<tbody>
					{#each d.factors as f (f.factor)}
						{@const factor: BrokerActivityFactor = f}
						<tr>
							<td>
								<div class="flex flex-col">
									<span class="font-medium">{factor.label}</span>
									<span class="text-muted text-[10px]">{factor.factor}</span>
								</div>
							</td>
							<td
								class="text-right tabular-nums {factor.mean_ic !== null &&
								Math.abs(factor.mean_ic) >= 0.05
									? 'text-up'
									: ''}"
							>
								{f4(factor.mean_ic)}
							</td>
							<td class="text-right tabular-nums">{f2(factor.icir)}</td>
							<td class="text-right tabular-nums">{f2(factor.t_stat)}</td>
							<td class="text-muted text-right tabular-nums">{factor.n_days ?? '-'}</td>
							<td class="text-center text-xs">
								{#if factor.direction > 0}
									<span class="text-up">naik</span>
								{:else if factor.direction < 0}
									<span class="text-down">turun</span>
								{:else}
									<span class="text-muted">—</span>
								{/if}
							</td>
							<td class="text-center">
								{#if factor.eligible}
									<span class="badge badge-buy"><Check size={13} /></span>
								{:else}
									<span class="text-muted">—</span>
								{/if}
							</td>
							<td class="text-right tabular-nums">
								{factor.weight > 0 ? `${(factor.weight * 100).toFixed(0)}%` : '-'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="text-muted mt-3 text-[11px] leading-snug">
				&ldquo;Arah historis&rdquo; = tanda mean IC: apakah nilai faktor yang tinggi cenderung
				diikuti return positif atau negatif. Kolom ini diisi otomatis dari data, bukan diasumsikan.
				Faktor tanpa centang tidak menyumbang skor sama sekali.
			</p>
		</div>
	{/if}
{/snippet}

{#snippet metric(label: string, value: string)}
	<div class="rounded-lg border border-[var(--border)] px-3 py-2">
		<p class="text-muted text-[10px] uppercase tracking-wide">{label}</p>
		<p class="text-sm font-semibold tabular-nums">{value}</p>
	</div>
{/snippet}

{#snippet marketStructure(d: BrokerActivity)}
	{@const m = d.market}
	{#if m.n_brokers === 0}
		<EmptyState
			message="Belum ada data broker pasar. Isi lewat `idx serve` (job refresh_s2 16:10 WIB) atau `python -m scripts.backfill_broker_eod`."
		/>
	{:else}
		<div class="space-y-4">
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
				{@render metric('Broker aktif', String(m.n_brokers))}
				{@render metric('CR1 (top 1)', p0(m.cr1))}
				{@render metric('CR3 (top 3)', p0(m.cr3))}
				{@render metric('CR5 (top 5)', p0(m.cr5))}
				{@render metric('HHI', m.hhi === null ? '-' : m.hhi.toFixed(3))}
			</div>

			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th class="text-left">#</th>
							<th class="text-left">Broker</th>
							<th class="text-right">Porsi</th>
							<th class="text-right">Nilai</th>
							<th class="text-right">Volume</th>
							<th class="text-right">Frekuensi</th>
						</tr>
					</thead>
					<tbody>
						{#each m.top as b, i (b.broker_code)}
							<tr>
								<td class="text-muted tabular-nums">{i + 1}</td>
								<td>
									<div class="flex flex-col">
										<span class="font-semibold">{b.broker_code}</span>
										{#if b.broker_name}
											<span class="text-muted max-w-[200px] truncate text-[10px]">
												{b.broker_name}
											</span>
										{/if}
									</div>
								</td>
								<td class="text-right tabular-nums">{p0(b.share)}</td>
								<td class="text-right tabular-nums">Rp {fmtCompact(b.value)}</td>
								<td class="text-right tabular-nums">{fmtCompact(b.volume)}</td>
								<td class="text-muted text-right tabular-nums">
									{b.frequency !== null ? `${fmtNum(b.frequency)}x` : '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-muted text-[11px] leading-snug">
				Total nilai transaksi pasar {m.date ?? '-'}: Rp {fmtCompact(m.total_value)}. HHI mengukur
				pemusatan: makin tinggi = makin sedikit firma yang menguasai transaksi (indikasi dominasi
				pemain besar); makin rendah = makin tersebar (ciri partisipasi ritel).
			</p>
		</div>
	{/if}
{/snippet}

<svelte:head>
	<title>Aktivitas Broker · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Activity size={26} class="text-accent" aria-hidden="true" />
			Aktivitas <span class="gradient-text">Broker</span>
		</h1>
		<p class="text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
			Emiten dengan jejak aliran dana terkuat hari ini, diperingkatkan oleh skor yang bobotnya
			berasal dari uji statistik — bukan feeling.
			<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />
		</p>
	</div>

	{#if data}
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<span class="badge {data.validated ? 'badge-buy' : 'badge-warn'}">
				{data.validated
					? `Tervalidasi — ${data.eligible_count} faktor lolos uji`
					: 'Belum tervalidasi'}
			</span>
			{#if data.horizon !== null}
				<span class="badge badge-hold tabular-nums">Horizon {data.horizon} hari bursa</span>
			{/if}
			{#if data.ic_run_date}
				<span class="badge badge-hold tabular-nums">Kalibrasi IC {data.ic_run_date}</span>
			{/if}
		</div>
	{/if}

	<div class="rounded-md border border-[var(--border)] bg-white/[0.03] p-3">
		<p class="flex items-start gap-2 text-xs leading-snug">
			<Info size={14} class="text-muted mt-0.5 shrink-0" aria-hidden="true" />
			<span>
				<strong>Yang diukur:</strong> IDX tidak mempublikasikan pembelian/penjualan per broker untuk
				tiap saham di data gratis — yang tersedia adalah aliran asing per emiten (notasi rupiah) dan
				ketimpangan buku order intraday. Dua sinyal itu dipakai sebagai <em>proksi</em> jejak akumulasi/distribusi,
				lalu hanya faktor yang lulus uji IC (|IC| ≥ 0,05 &amp; |ICIR| ≥ 0,5) yang diberi bobot. Struktur
				broker level pasar (di bawah) memakai data firma asli.
			</span>
		</p>
	</div>

	<Card
		title="Peringkat Skor Akumulasi"
		subtitle="Kombinasi faktor aliran terkuat — hanya faktor yang lulus uji IC"
		info="Skor 0-100 dari kombinasi faktor aliran yang sudah terbukti secara statistik memprediksi return di data IDX. Skor tinggi = jejak aliran dana yang historisnya diikuti kenaikan harga. Skala relatif terhadap pasar hari itu."
	>
		{#snippet right()}
			<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />
		{/snippet}

		{#if activity.error}
			<ErrorState
				message="Gagal memuat Aktivitas Broker: {activity.error instanceof Error
					? activity.error.message
					: String(activity.error)}"
			/>
		{:else if activity.isLoading || !data}
			<Skeleton class="h-72 w-full" />
		{:else}
			{@render rankingTable(data)}
		{/if}
	</Card>

	<Card
		title="Uji Statistik Faktor (IC)"
		subtitle="Faktor mana yang layak dipakai — ambang |IC| ≥ 0,05 dan |ICIR| ≥ 0,5"
		info="IC (Information Coefficient) mengukur seberapa akurat sebuah faktor aliran memprediksi arah harga ke depan. Faktor yang gagal ambang tetap ditampilkan sebagai transparansi, tapi tidak diberi bobot."
	>
		{#if activity.error}
			<ErrorState message="Gagal memuat uji faktor." />
		{:else if activity.isLoading || !data}
			<Skeleton class="h-56 w-full" />
		{:else}
			{@render factorGate(data)}
		{/if}
	</Card>

	<BrokerFlowCard />

	<Card
		title="Struktur Broker Pasar"
		subtitle="Konsentrasi transaksi per firma — data broker asli (EOD, seluruh pasar)"
		info="Seberapa terpusat transaksi pasar di sedikit firma broker. Data ini asli dari IDX (bukan proksi) dan berlaku untuk seluruh pasar, bukan satu saham."
	>
		{#snippet right()}
			<LastUpdated
				sessionDate={data?.market.date}
				updatedAt={data?.market.captured_at}
				dep={data}
			/>
		{/snippet}

		{#if activity.error}
			<ErrorState message="Gagal memuat struktur broker." />
		{:else if activity.isLoading || !data}
			<Skeleton class="h-48 w-full" />
		{:else}
			{@render marketStructure(data)}
		{/if}
	</Card>

	<p class="text-muted text-[11px] leading-snug">
		Metodologi: nilai tiap faktor di emiten diubah jadi percentile cross-sectional, diarahkan sesuai
		tanda IC-nya, lalu dijumlah berbobot |IC| (jumlah bobot = 1). Faktor yang nilainya kosong
		diperlakukan netral, dan emiten dengan coverage &lt; 50% dibuang. Skor ini alat riset untuk
		menyaring kandidat — bukan rekomendasi jual/beli, dan tidak menjamin hasil masa depan.
	</p>
</main>
