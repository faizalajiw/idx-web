<script lang="ts">
	import { fmtCompact } from '#lib/format.ts';
	import type { EquityPoint } from '#lib/types.ts';
	import LineArea from '#lib/components/LineArea.svelte';

	/**
	 * Kurva modal strategi vs patokan beli-tahan dengan bobot sama.
	 *
	 * Pengganti `LineChart` Recharts: dua garis tanpa titik, garis putus-putus
	 * untuk patokan, plus garis referensi di modal awal.
	 */
	let { points, initialCash }: { points: EquityPoint[]; initialCash: number } = $props();

	const rupiah = (v: number) => `Rp ${fmtCompact(v)}`;

	const labels = $derived(points.map((p) => p.date));

	const series = $derived([
		{
			name: 'Strategi',
			values: points.map((p) => p.equity),
			color: 'var(--chart-strategy)',
			width: 2,
			fmt: rupiah
		},
		{
			name: 'Buy & Hold',
			values: points.map((p) => p.benchmark),
			color: 'var(--chart-benchmark)',
			width: 1.5,
			dashed: true,
			fmt: rupiah
		}
	]);

	const refs = $derived([
		{ y: initialCash, color: 'var(--chart-ref)', dashed: true, label: 'modal awal' }
	]);
</script>

<LineArea
	{labels}
	{series}
	{refs}
	height={320}
	yFmt={fmtCompact}
	xFmt={(d) => d.slice(5)}
	xTickGap={28}
/>
