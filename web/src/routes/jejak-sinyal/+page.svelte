<script lang="ts">
	import {
		ArrowDownRight,
		ArrowUpRight,
		RotateCcwClock,
		Scale,
		Target,
		TrendingUp
	} from "@lucide/svelte";
	import { useSignalTrack } from "#lib/hooks.svelte.ts";
	import type { SignalTrack, SignalTrackStat } from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	const pct = (v: number | null) =>
		v === null ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
	const hitPct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(0)}%`);
	const num = (v: number | null, digits = 2) => (v === null ? "-" : v.toFixed(digits));

	const tone = (v: number | null) =>
		v === null ? "text-muted" : v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted";

	// Horizon dihitung dalam hari bursa (trading day), bukan jam.
	const HORIZON_LABEL: Record<number, { title: string; hint: string }> = {
		5: { title: "1 minggu", hint: "5 hari bursa" },
		10: { title: "2 minggu", hint: "10 hari bursa" },
		21: { title: "1 bulan", hint: "21 hari bursa" }
	};
	const horizonLabel = (h: number) =>
		HORIZON_LABEL[h] ?? { title: `${h} hari`, hint: `${h} hari bursa` };

	/** Penilaian sederhana: apakah sinyal mengalahkan pasar, dan apakah buktinya cukup kuat. */
	function verdict(row: SignalTrackStat | undefined) {
		if (!row || row.mean_abnormal === null) {
			return { text: "Data belum cukup", cls: "badge" };
		}
		const beats = row.mean_abnormal > 0;
		const solid = row.t_stat !== null && Math.abs(row.t_stat) >= 2;
		const rawPositive = row.mean_fwd !== null && row.mean_fwd > 0;
		if (beats && solid && rawPositive) return { text: "Mengalahkan pasar", cls: "badge-buy" };
		if (beats) return { text: "Unggul tipis, belum pasti", cls: "badge" };
		return { text: "Belum mengalahkan pasar", cls: "badge-sell" };
	}

	const track = useSignalTrack();
	// Getter `data`/`error`/`isLoading` hanya reaktif bila dibaca lewat objeknya.
	const data = $derived(track.data);
	const error = $derived(track.error);
	const isLoading = $derived(track.isLoading);

	let horizon = $state(21);

	const horizons = $derived(data?.horizons ?? [5, 10, 21]);
	const activeHorizon = $derived(
		horizons.includes(horizon) ? horizon : (horizons[horizons.length - 1] ?? 21)
	);

	const overall = $derived(
		(data?.overall ?? []).filter((r) => r.horizon === activeHorizon && r.regime === null)
	);
	const buyRow = $derived(overall.find((r) => r.signal === "BUY"));
	const sellRow = $derived(overall.find((r) => r.signal === "SELL"));
	const regimeRows = $derived(
		(data?.by_regime ?? []).filter((r) => r.horizon === activeHorizon && r.n > 0)
	);
</script>

{#snippet titleJangka()}
	<span class="inline-flex items-center gap-2">
		<Scale size={15} aria-hidden="true" /> Pilih jangka waktu
	</span>
{/snippet}

{#snippet titleRegime()}
	<span class="inline-flex items-center gap-2">
		<TrendingUp size={15} aria-hidden="true" /> Kapan sinyal paling bisa dipercaya?
	</span>
{/snippet}

{#snippet horizonTabs(daftar: number[], active: number, onPick: (h: number) => void)}
	<div role="tablist" aria-label="Pilih jangka waktu" class="grid grid-cols-3 gap-2">
		{#each daftar as h (h)}
			{@const on = h === active}
			{@const l = horizonLabel(h)}
			<button
				type="button"
				role="tab"
				aria-selected={on}
				onclick={() => onPick(h)}
				class="rounded-xl border px-3 py-2.5 text-left transition {on
					? 'border-[var(--accent)] bg-[var(--accent)]/10'
					: 'border-[var(--border)] hover:bg-[var(--bg-elev)]'}"
			>
				<p class="text-sm font-semibold {on ? 'text-[var(--accent-text)]' : ''}">{l.title}</p>
				<p class="text-muted text-[11px]">{l.hint}</p>
			</button>
		{/each}
	</div>
{/snippet}

{#snippet signalResultCard(signal: "BUY" | "SELL", row: SignalTrackStat | undefined)}
	{@const label = signal === "BUY" ? "Beli" : "Jual"}
	{@const v = verdict(row)}
	<div class="card p-4">
		<div class="flex items-center justify-between gap-2">
			<span
				class="badge {signal === 'BUY' ? 'badge-buy' : 'badge-sell'} inline-flex items-center gap-1"
			>
				{#if signal === "BUY"}
					<ArrowUpRight size={12} aria-hidden="true" />
				{:else}
					<ArrowDownRight size={12} aria-hidden="true" />
				{/if}
				Sinyal {label}
			</span>
			<span class="badge {v.cls}">{v.text}</span>
		</div>

		{#if !row || row.n === 0}
			<p class="text-muted mt-4 text-sm">
				Belum ada sinyal {label.toLowerCase()} yang sudah selesai dihitung.
			</p>
		{:else}
			<p class="mt-4 text-3xl font-bold tabular-nums">{hitPct(row.hit_rate)}</p>
			<p class="text-muted mt-1 text-xs">
				Dari {row.n} sinyal, {hitPct(row.hit_rate)} searah dengan prediksi.
			</p>

			<dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
				<div>
					<dt class="text-muted text-[11px] uppercase tracking-wide">Rata-rata return</dt>
					<dd class="font-semibold tabular-nums {tone(row.mean_fwd)}">{pct(row.mean_fwd)}</dd>
				</div>
				<div>
					<dt class="text-muted text-[11px] uppercase tracking-wide">Vs pasar</dt>
					<dd class="font-semibold tabular-nums {tone(row.mean_abnormal)}">
						{pct(row.mean_abnormal)}
					</dd>
				</div>
				<div>
					<dt class="text-muted text-[11px] uppercase tracking-wide">Return tengah</dt>
					<dd class="tabular-nums {tone(row.median_fwd)}">{pct(row.median_fwd)}</dd>
				</div>
				<div>
					<dt class="text-muted text-[11px] uppercase tracking-wide">Kekuatan bukti</dt>
					<dd class="tabular-nums">
						{row.t_stat === null ? "-" : Math.abs(row.t_stat) >= 2 ? "Kuat" : "Lemah"}
						<span class="text-muted text-xs">(t {num(row.t_stat)})</span>
					</dd>
				</div>
			</dl>
		{/if}
	</div>
{/snippet}

{#snippet regimeCard(row: SignalTrackStat)}
	{@const v = verdict(row)}
	{@const toneText = v.cls === "badge-buy"
		? "text-up"
		: v.cls === "badge-sell"
			? "text-down"
			: "text-muted"}
	<div class="rounded-xl border border-[var(--border)] p-3.5">
		<div class="flex items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2">
				<span class="badge {row.signal === 'BUY' ? 'badge-buy' : 'badge-sell'}">
					{row.signal === "BUY" ? "Beli" : "Jual"}
				</span>
				<span class="truncate text-sm font-medium">{row.regime ?? "Semua kondisi"}</span>
			</div>
			<span class="text-muted shrink-0 text-xs">n = {row.n}</span>
		</div>
		<div class="mt-3 flex items-end justify-between gap-3">
			<div>
				<p class="text-2xl font-bold tabular-nums">{hitPct(row.hit_rate)}</p>
				<p class="text-muted text-[11px]">tingkat keberhasilan</p>
			</div>
			<div class="text-right">
				<p class="text-sm font-semibold tabular-nums {tone(row.mean_abnormal)}">
					{pct(row.mean_abnormal)}
				</p>
				<p class="text-muted text-[11px]">vs pasar</p>
			</div>
		</div>
		<p class="mt-2 text-xs {toneText}">{v.text}</p>
	</div>
{/snippet}

{#snippet summaryStrip(d: SignalTrack)}
	{@const items = [
		{ label: "Sinyal tercatat", value: String(d.signals) },
		{ label: "Beli / Jual", value: `${d.buy} / ${d.sell}` },
		{ label: "Periode data", value: `${d.first_date ?? "-"} s/d ${d.last_date ?? "-"}` },
		{ label: "Terakhir dihitung", value: d.generated_at?.replace("T", " ").slice(0, 16) ?? "-" }
	]}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each items as it (it.label)}
			<div class="card p-3">
				<p class="text-muted text-[11px] uppercase tracking-wide">{it.label}</p>
				<p class="mt-1 break-words text-sm font-semibold tabular-nums">{it.value}</p>
			</div>
		{/each}
	</div>
{/snippet}

<svelte:head>
	<title>Jejak Sinyal · Market Labs</title>
</svelte:head>

{#if error}
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
		<ErrorState message="Gagal memuat jejak sinyal. Pastikan backend & database hidup." />
	</main>
{:else}
	<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
				<RotateCcwClock size={26} class="text-accent" aria-hidden="true" />
				Jejak <span class="gradient-text">Sinyal</span>
			</h1>
			<p class="text-muted mt-1 text-sm">
				Seberapa sering sinyal beli dan jual di aplikasi ini benar-benar berhasil, dilihat dari
				data masa lalu.
			</p>
			<div class="mt-1">
				<LastUpdated sessionDate={data?.last_date} updatedAt={data?.generated_at} />
			</div>
		</div>

		{#if isLoading || !data}
			<Skeleton class="h-64 w-full" />
		{:else}
			<Card
				title={titleJangka}
				subtitle="Setelah sinyal muncul, seberapa lama kamu menunggu hasilnya?"
				info="Jangka waktu dihitung dalam hari bursa. Pilih 1 minggu untuk hasil jangka pendek, 1 bulan untuk jangka lebih panjang."
			>
				{@render horizonTabs(horizons, activeHorizon, (h) => (horizon = h))}
			</Card>

			<section class="space-y-3">
				<h2 class="flex items-center gap-2 text-base font-semibold">
					<Target size={16} aria-hidden="true" /> Hasil sinyal dalam {horizonLabel(activeHorizon).title}
				</h2>
				<div class="grid gap-3 md:grid-cols-2">
					{@render signalResultCard("BUY", buyRow)}
					{@render signalResultCard("SELL", sellRow)}
				</div>
				<p class="text-muted text-xs">
					<strong class="text-[var(--fg)]">Vs pasar</strong> = selisih hasil sinyal dibanding rata-rata
					pasar pada periode yang sama. Positif berarti sinyal lebih baik dari pasar.
					<strong class="text-[var(--fg)]">Kekuatan bukti</strong> menunjukkan apakah hasil ini cukup
					konsisten, bukan sekadar kebetulan.
				</p>
			</section>

			<Card
				title={titleRegime}
				subtitle="Hasil dipecah berdasarkan kondisi pasar IHSG"
				info="Banyak sinyal bekerja baik saat pasar trending, tapi kurang akurat saat pasar menyamping. Bagian ini membantu kamu tahu kapan sebaiknya lebih percaya pada sinyal."
			>
				{#if regimeRows.length === 0}
					<EmptyState message="Belum cukup data per kondisi pasar untuk jangka waktu ini." />
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each regimeRows as r (`${r.signal}-${r.regime ?? "all"}-${r.horizon}`)}
							{@render regimeCard(r)}
						{/each}
					</div>
				{/if}
			</Card>

			<Card
				title="Sinyal terbaru"
				subtitle="Hasil yang sudah terjadi sejak sinyal muncul. Tanda '-' berarti jangka waktu belum selesai."
				info="Daftar sinyal terbaru beserta hasilnya sejauh ini. Tanda '-' berarti jangka waktu belum selesai, jadi hasilnya belum bisa dinilai."
			>
				{#if data.recent.length === 0}
					<EmptyState message="Belum ada sinyal tercatat." />
				{:else}
					<div class="overflow-x-auto">
						<table class="data-table">
							<thead>
								<tr>
									<th class="text-left">Tanggal</th>
									<th class="text-left">Saham</th>
									<th class="text-left">Sinyal</th>
									<th class="hidden text-right sm:table-cell">Harga</th>
									<th class="text-right">1 minggu</th>
									<th class="hidden text-right md:table-cell">2 minggu</th>
									<th class="text-right">1 bulan</th>
								</tr>
							</thead>
							<tbody>
								{#each data.recent as r (`${r.code}-${r.date}-${r.signal}`)}
									<tr>
										<td class="text-muted tabular-nums">{r.date}</td>
										<td class="font-medium">
											<span class="inline-flex items-center gap-2">
												<TickerLogo code={r.code} size={18} />
												{r.code}
											</span>
										</td>
										<td>
											<span class="badge {r.signal === 'BUY' ? 'badge-buy' : 'badge-sell'}">
												{r.signal === "BUY" ? "Beli" : "Jual"}
											</span>
										</td>
										<td class="hidden text-right tabular-nums sm:table-cell">
											{num(r.close, 0)}
										</td>
										<td class="text-right tabular-nums {tone(r.fwd_5)}">{pct(r.fwd_5)}</td>
										<td class="hidden text-right tabular-nums md:table-cell {tone(r.fwd_10)}">
											{pct(r.fwd_10)}
										</td>
										<td class="text-right tabular-nums {tone(r.fwd_21)}">{pct(r.fwd_21)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card>

			{@render summaryStrip(data)}
		{/if}

		<p class="text-muted text-[11px] leading-snug">
			Metodologi: sinyal dihitung hanya dengan data yang tersedia pada hari itu (bebas look-ahead),
			entry di harga penutupan hari berikutnya (T+1), dan SELL palsu saat ex-dividend tidak dicatat.
			Hasil masa lalu bukan jaminan hasil di masa depan, dan belum memperhitungkan biaya transaksi.
		</p>
	</main>
{/if}
