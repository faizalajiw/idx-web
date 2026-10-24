<script lang="ts">
	import { useHistory } from '#lib/hooks.svelte.ts';
	import { fmtCompact, fmtNum, trendClass } from '#lib/format.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	let { code }: { code: string } = $props();

	const history = useHistory(() => code);
	const data = $derived(history.data);
	const error = $derived(history.error);
	const isLoading = $derived(history.isLoading);

	/** Terbaru di atas, 20 baris; `prev` diambil dari baris berikutnya di daftar ini. */
	const rows = $derived(
		[...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
	);

	function pctVsPrev(close: number | null, prev: number | null): number | null {
		if (prev === null || prev === 0 || close === null) return null;
		return ((close - prev) / prev) * 100;
	}
</script>

<Card
	title={`Riwayat Harga — ${code}`}
	subtitle="20 hari terakhir (terbaru di atas)"
	info="Tabel harga saham 20 hari bursa terakhir (buka, tertinggi, terendah, tutup, volume). Berguna untuk melihat pergerakan harian tanpa harus baca grafik."
>
	{#if error}
		<ErrorState
			message="Gagal memuat riwayat: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<Skeleton class="h-64" />
	{:else if data.length === 0}
		<EmptyState />
	{:else}
		<div class="table-scroll max-h-[420px] overflow-y-auto">
			<table class="data-table">
				<thead>
					<tr>
						<th class="text-left">Tanggal</th>
						<th class="text-right">Open</th>
						<th class="text-right">High</th>
						<th class="text-right">Low</th>
						<th class="text-right">Close</th>
						<th class="text-right">Volume</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r, i (r.date)}
						{@const pct = pctVsPrev(r.close, rows[i + 1]?.close ?? null)}
						<tr class="border-b border-[var(--border)]/50 last:border-0">
							<td class="text-muted py-2 pr-3 tabular-nums">{r.date}</td>
							<td class="py-2 pr-3 text-right tabular-nums">{fmtNum(r.open)}</td>
							<td class="py-2 pr-3 text-right tabular-nums">{fmtNum(r.high)}</td>
							<td class="py-2 pr-3 text-right tabular-nums">{fmtNum(r.low)}</td>
							<td class="py-2 pr-3 text-right tabular-nums">
								<span class={trendClass(pct)}>{fmtNum(r.close)}</span>
							</td>
							<td class="py-2 text-right tabular-nums">{fmtCompact(r.volume)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>
