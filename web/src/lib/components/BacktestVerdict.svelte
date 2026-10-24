<script lang="ts">
	import { fmtCompact } from '#lib/format.ts';
	import type { BacktestResult } from '#lib/types.ts';
	import type { Tone } from '#lib/backtest/constants.ts';
	import { pct, pctMag, toneClass, toneOf } from '#lib/backtest/format.ts';

	let {
		result,
		alpha,
		costErosion
	}: { result: BacktestResult; alpha: number; costErosion: number } = $props();

	const beatBenchmark = $derived(alpha > 0);
	const beatAfterCost = $derived(result.metrics.total_return > 0);
	const tone: Tone = $derived(beatBenchmark ? 'up' : beatAfterCost ? 'neutral' : 'down');
	const label = $derived(
		beatBenchmark
			? 'Strategi menang dari beli-tahan'
			: beatAfterCost
				? 'Untung, tapi kalah dari beli-tahan'
				: 'Strategi belum menghasilkan untung'
	);
	const accent = $derived(
		tone === 'up' ? 'var(--up)' : tone === 'down' ? 'var(--down)' : 'var(--border-strong)'
	);
</script>

<div class="card p-4" style="border-left: 3px solid {accent}">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<p class="text-base font-bold {toneClass(tone)}">{label}</p>
		<p class="text-muted text-xs tabular-nums">
			Rp {fmtCompact(result.initial_cash)} → Rp {fmtCompact(result.metrics.final_equity)}
		</p>
	</div>
	<p class="text-muted mt-2 text-sm leading-relaxed">
		Strategi <span class="font-semibold text-[var(--fg)]">{result.strategy_name}</span>
		menghasilkan
		<span class="font-semibold {toneClass(toneOf(result.metrics.total_return))}">
			{pct(result.metrics.total_return)}
		</span>
		dalam {result.days} hari bursa, sementara beli-tahan semua emiten
		<span class="font-semibold text-[var(--fg)]">{pct(result.benchmark.total_return)}</span>.
		{#if costErosion > 0.001}
			Biaya transaksi menggerus
			<span class="font-semibold text-down">{pctMag(costErosion)}</span> dari hasil kotor.
		{/if}
	</p>
</div>
