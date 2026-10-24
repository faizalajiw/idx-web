<script lang="ts">
	import { useTechnical } from '#lib/hooks.svelte.ts';
	import type { IndicatorBar } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import LineArea from '#lib/components/LineArea.svelte';

	let { code }: { code: string | null } = $props();

	function badgeClass(sig: string): string {
		if (sig === 'BUY') return 'badge badge-buy';
		if (sig === 'SELL') return 'badge badge-sell';
		return 'badge badge-hold';
	}

	/** Tanggal `YYYY-MM-DD` → `MM-DD`, seperti tickFormatter Recharts di app Next. */
	const shortDate = (d: string) => d.slice(5);

	const technical = useTechnical(() => code);
	const data = $derived(technical.data);
	const bars = $derived<IndicatorBar[]>(data?.bars ?? []);
</script>

{#if !code}
	<Card
		title="Technical Chart"
		info="Grafik harga saham lengkap dengan indikator teknikal (garis rata-rata harga, momentum, dll). Dipakai untuk melihat pola pergerakan harga. Pilih saham dulu dari watchlist atau daftar sinyal."
	>
		<EmptyState message="Pilih emiten dari watchlist atau signals untuk melihat chart." />
	</Card>
{:else}
	<Card
		title="Technical — {code}"
		subtitle="Close, MA20/50, Bollinger, RSI, MACD"
		info="MA20/50 = rata-rata harga 20 & 50 hari (arah tren). Bollinger = pita batas wajar harga. RSI = seberapa 'panas/dingin' saham (jenuh beli/jual). MACD = ukuran perubahan momentum. Semua ini alat bantu baca pola, bukan ramalan pasti."
	>
		{#snippet right()}
			{#if data}<span class={badgeClass(data.signal)}>{data.signal}</span>{/if}
		{/snippet}

		{#if technical.error}
			<ErrorState
				message="Gagal memuat chart: {technical.error instanceof Error
					? technical.error.message
					: String(technical.error)}"
			/>
		{:else if technical.isLoading || !data}
			<Skeleton class="h-[420px]" />
		{:else if bars.length === 0}
			<EmptyState />
		{:else}
			<div class="space-y-4">
				<div>
					<p class="text-muted mb-1 text-xs">Harga & Moving Average</p>
					<LineArea
						labels={bars.map((b) => b.date)}
						series={[
							{
								name: 'BB Upper',
								values: bars.map((b) => b.bb_upper),
								color: 'var(--chart-area-stroke)',
								kind: 'area',
								fill: 'var(--chart-area-fill)',
								width: 1
							},
							{
								name: 'BB Lower',
								values: bars.map((b) => b.bb_lower),
								color: 'var(--chart-area-stroke)',
								kind: 'area',
								fill: 'var(--chart-area-fill)',
								width: 1
							},
							{
								name: 'Close',
								values: bars.map((b) => b.close),
								color: 'var(--chart-close)',
								width: 2
							},
							{
								name: 'MA20',
								values: bars.map((b) => b.ma_short),
								color: 'var(--chart-ma-fast)',
								width: 1.5
							},
							{
								name: 'MA50',
								values: bars.map((b) => b.ma_long),
								color: 'var(--chart-ma-slow)',
								width: 1.5
							}
						]}
						height={260}
						xFmt={shortDate}
						xTickGap={30}
					/>
				</div>

				<div>
					<p class="text-muted mb-1 text-xs">RSI (14)</p>
					<LineArea
						labels={bars.map((b) => b.date)}
						series={[
							{ name: 'RSI', values: bars.map((b) => b.rsi), color: 'var(--chart-rsi)', width: 1.5 }
						]}
						height={110}
						yDomain={[0, 100]}
						yTicks={[30, 50, 70]}
						yFmt={(v) => String(Math.round(v))}
						refs={[
							{ y: 70, color: 'var(--chart-ref-soft)', dashed: true },
							{ y: 30, color: 'var(--chart-ref-soft)', dashed: true }
						]}
						xFmt={shortDate}
						xTickGap={30}
						legend={false}
					/>
				</div>

				<div>
					<p class="text-muted mb-1 text-xs">MACD (12,26,9)</p>
					<LineArea
						labels={bars.map((b) => b.date)}
						series={[
							{
								name: 'MACD',
								values: bars.map((b) => b.macd),
								color: 'var(--chart-macd)',
								width: 1.5
							},
							{
								name: 'Signal',
								values: bars.map((b) => b.macd_signal),
								color: 'var(--chart-signal)',
								width: 1.5
							}
						]}
						height={110}
						xFmt={shortDate}
						xTickGap={30}
					/>
				</div>
			</div>
		{/if}
	</Card>
{/if}
