<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import BacktestStat from '#lib/components/BacktestStat.svelte';
	import { fmtCompact } from '#lib/format.ts';
	import type { BacktestResult } from '#lib/types.ts';
	import { costModelLabel, pct, pctMag } from '#lib/backtest/format.ts';

	let {
		result,
		costErosion,
		cadenceLabel
	}: { result: BacktestResult; costErosion: number; cadenceLabel: string } = $props();
</script>

<Card
	title="Dampak Biaya"
	subtitle="Susun ulang {cadenceLabel} ×{result.rebalance_days} · nilai transaksi Rp {fmtCompact(
		result.cost_impact.turnover
	)} · {result.days} hari bursa"
	info="Rincian biaya (komisi, pajak, slippage) yang menggerus keuntungan. Banyak strategi terlihat cuan di atas kertas tapi rugi setelah biaya nyata dihitung."
>
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<BacktestStat
			label="Total biaya"
			hint="Jumlah semua komisi, pajak, dan slippage selama periode uji."
			value={`Rp ${fmtCompact(result.cost_impact.total_cost)}`}
			tone="down"
		/>
		<BacktestStat
			label="Komisi + pajak"
			value={`Rp ${fmtCompact(result.cost_impact.total_fees)}`}
			tone="down"
		/>
		<BacktestStat
			label="Slippage"
			value={`Rp ${fmtCompact(result.cost_impact.total_slippage)}`}
			tone="down"
		/>
		<BacktestStat
			label="Porsi biaya dari modal"
			hint="Berapa persen modal yang habis hanya untuk biaya transaksi."
			value={pctMag(result.cost_impact.cost_pct_of_equity)}
			tone="down"
		/>
	</div>
	<p class="text-muted mt-3 text-xs leading-relaxed">
		Biaya menggerus keuntungan
		<span class="text-down font-semibold">{pctMag(costErosion)}</span>
		({pct(result.gross_metrics.total_return)} sebelum biaya →
		{pct(result.metrics.total_return)} setelah biaya).
	</p>
	<p class="text-muted mt-2 text-xs leading-relaxed">
		Model biaya: {costModelLabel(result.costs)}
	</p>
</Card>
