<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import InfoHint from '#lib/components/InfoHint.svelte';
	import { fmtCompact } from '#lib/format.ts';
	import type { BacktestMetrics, BacktestResult } from '#lib/types.ts';
	import type { Tone } from '#lib/backtest/constants.ts';
	import { decimals, pct, toneClass, toneOf } from '#lib/backtest/format.ts';

	let { result }: { result: BacktestResult } = $props();
</script>

{#snippet metricRow({
	label,
	gross,
	net,
	benchmark,
	tone,
	hint
}: {
	label: string;
	gross: string;
	net: string;
	benchmark: string;
	tone?: Tone;
	hint?: string;
})}
	<tr>
		<td class="text-muted">
			<span class="inline-flex items-center gap-1">
				{label}
				{#if hint}<InfoHint text={hint} />{/if}
			</span>
		</td>
		<td class="text-muted text-right tabular-nums">{gross}</td>
		<td class="text-right font-semibold tabular-nums {toneClass(tone)}">{net}</td>
		<td class="text-muted text-right tabular-nums">{benchmark}</td>
	</tr>
{/snippet}

{#snippet metricsTable({
	gross,
	net,
	benchmark
}: {
	gross: BacktestMetrics;
	net: BacktestMetrics;
	benchmark: BacktestMetrics;
})}
	<div class="overflow-x-auto">
		<table class="data-table">
			<thead>
				<tr>
					<th class="text-left">Metrik</th>
					<th class="text-right">Sebelum biaya</th>
					<th class="text-right">Setelah biaya</th>
					<th class="text-right">Beli &amp; tahan</th>
				</tr>
			</thead>
			<tbody>
				{@render metricRow({
					label: 'Total keuntungan',
					hint: 'Berapa persen modal bertambah atau berkurang selama periode uji.',
					gross: pct(gross.total_return),
					net: pct(net.total_return),
					benchmark: pct(benchmark.total_return),
					tone: toneOf(net.total_return)
				})}
				{@render metricRow({
					label: 'Rata-rata per tahun',
					hint: 'Setara keuntungan tahunan bila hasilnya diratakan (CAGR).',
					gross: pct(gross.annualized_return),
					net: pct(net.annualized_return),
					benchmark: pct(benchmark.annualized_return)
				})}
				{@render metricRow({
					label: 'Jatuh terdalam',
					hint: 'Penurunan terbesar dari puncak ke dasar selama uji (max drawdown).',
					gross: pct(-gross.max_drawdown),
					net: pct(-net.max_drawdown),
					benchmark: pct(-benchmark.max_drawdown),
					tone: 'down'
				})}
				{@render metricRow({
					label: 'Naik-turun tahunan',
					hint: 'Seberapa liar nilai portofolio bergerak (volatilitas tahunan).',
					gross: pct(gross.volatility),
					net: pct(net.volatility),
					benchmark: pct(benchmark.volatility)
				})}
				{@render metricRow({
					label: 'Imbal hasil per risiko',
					hint: 'Keuntungan dibanding naik-turunnya (Sharpe). Makin tinggi makin efisien.',
					gross: decimals(gross.sharpe),
					net: decimals(net.sharpe),
					benchmark: decimals(benchmark.sharpe)
				})}
				{@render metricRow({
					label: 'Modal akhir',
					gross: `Rp ${fmtCompact(gross.final_equity)}`,
					net: `Rp ${fmtCompact(net.final_equity)}`,
					benchmark: `Rp ${fmtCompact(benchmark.final_equity)}`
				})}
			</tbody>
		</table>
	</div>
{/snippet}

<Card
	title="Perbandingan Hasil"
	subtitle="Modal awal Rp {fmtCompact(result.initial_cash)} · strategi {result.strategy_name}"
	info="Membandingkan hasil strategi (setelah dan sebelum biaya) dengan cara pasif beli-tahan. Berguna untuk cek: apakah strategi ini benar-benar lebih baik daripada diam memegang saham?"
>
	{@render metricsTable({
		gross: result.gross_metrics,
		net: result.metrics,
		benchmark: result.benchmark
	})}
</Card>
