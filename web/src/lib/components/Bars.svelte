<script lang="ts">
	/**
	 * Grafik batang SVG tanpa pustaka chart.
	 *
	 * Dua mode yang dipakai halaman: batang tunggal berwarna per titik (arus asing
	 * per hari, hijau/merah) dan batang bertumpuk (komposisi porsi broker, selalu
	 * 100%). Sumbu, kisi, garis nol, legenda, dan tooltip mengikuti bentuk yang
	 * sama dengan grafik garis.
	 */
	import { fmtNum } from "#lib/format.ts";

	type Series = {
		name: string;
		values: (number | null)[];
		color: string;
		/** Warna per titik; menimpa `color` bila diisi. */
		colors?: string[];
		/** Format angka di tooltip. */
		fmt?: (v: number) => string;
	};

	let {
		labels,
		series,
		height = 180,
		stacked = false,
		normalize = false,
		maxBarSize = 26,
		radius = 3,
		refY = null,
		yDomain = "auto",
		yFmt = (v: number) => fmtNum(v),
		xFmt = (s: string) => s,
		legend = false,
		footer = null,
		xTickGap = 24,
		emptyLabel = "Tidak ada data."
	}: {
		labels: string[];
		series: Series[];
		height?: number;
		stacked?: boolean;
		normalize?: boolean;
		maxBarSize?: number;
		radius?: number;
		refY?: number | null;
		yDomain?: "auto" | [number, number];
		yFmt?: (v: number) => string;
		xFmt?: (s: string) => string;
		legend?: boolean;
		footer?: ((index: number) => string | null) | null;
		xTickGap?: number;
		emptyLabel?: string;
	} = $props();

	const PAD = { right: 10, top: 8, bottom: 22 };
	const AXIS = "var(--chart-axis)";
	const GRID = "var(--chart-grid)";

	let box = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	let hover = $state<number | null>(null);

	const plotH = $derived(Math.max(0, height - PAD.top - PAD.bottom));

	/** Nilai yang digambar: porsi 0-100 bila `normalize`, angka asli bila tidak. */
	const resolved = $derived.by<number[][]>(() => {
		if (!normalize) return series.map((s) => s.values.map((v) => v ?? 0));
		return series.map((_, si) =>
			labels.map((_, i) => {
				const total = series.reduce((sum, s) => sum + Math.max(0, s.values[i] ?? 0), 0);
				return total > 0 ? (Math.max(0, series[si].values[i] ?? 0) / total) * 100 : 0;
			})
		);
	});

	const domain = $derived.by<[number, number]>(() => {
		if (normalize) return [0, 100];
		if (Array.isArray(yDomain)) return yDomain;
		const all: number[] = [];
		if (stacked) {
			for (let i = 0; i < labels.length; i++) {
				all.push(resolved.reduce((sum, s) => sum + s[i], 0));
			}
		} else {
			for (const s of resolved) for (const v of s) all.push(v);
		}
		if (refY !== null) all.push(refY);
		all.push(0);
		let min = Math.min(...all);
		let max = Math.max(...all);
		if (max === 0) max = 1;
		if (min === 0 && max > 0) min = 0;
		const pad = (max - min) * 0.05;
		return [min < 0 ? min - pad : 0, max + pad];
	});

	const ticks = $derived.by<number[]>(() => {
		const [min, max] = domain;
		return Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
	});

	/** Lebar kolom label Y mengikuti label terpanjang supaya angka besar tidak terpotong. */
	const padL = $derived.by(() => {
		const longest = ticks.reduce((n, t) => Math.max(n, String(yFmt(t)).length), 0);
		return Math.min(96, Math.max(32, longest * 6.2 + 10));
	});
	const plotW = $derived(Math.max(0, width - padL - PAD.right));

	const band = $derived(labels.length === 0 ? 0 : plotW / labels.length);
	const barW = $derived(Math.max(1, Math.min(maxBarSize, band * 0.68)));
	const y = (v: number) => PAD.top + plotH - ((v - domain[0]) / (domain[1] - domain[0] || 1)) * plotH;
	const center = (i: number) => padL + band * (i + 0.5);

	const xTickIdx = $derived.by<number[]>(() => {
		if (labels.length === 0) return [];
		// Lebar label diperkirakan dari jumlah karakter: jarak minimum harus cukup
		// untuk teksnya, bukan hanya `xTickGap`, supaya label tidak bertumpuk.
		const longest = labels.reduce((n, l) => Math.max(n, String(l).length), 0);
		const minGap = Math.max(xTickGap, longest * 5.6 + 10);
		const maxTicks = Math.max(2, Math.floor(plotW / minGap));
		const step = Math.max(1, Math.ceil(labels.length / maxTicks));
		const idx: number[] = [];
		for (let i = 0; i < labels.length; i += step) idx.push(i);
		const last = labels.length - 1;
		if (idx[idx.length - 1] !== last) {
			const gapPx = labels.length <= 1 ? plotW : (plotW / (labels.length - 1)) * (last - idx[idx.length - 1]);
			if (gapPx < minGap) idx.pop();
			idx.push(last);
		}
		return idx;
	});

	function onMove(e: MouseEvent) {
		if (!box || labels.length === 0) return;
		const rect = box.getBoundingClientRect();
		const px = e.clientX - rect.left - padL;
		const idx = Math.floor(px / (band || 1));
		hover = idx >= 0 && idx < labels.length ? idx : null;
	}

	const tooltipX = $derived(hover === null ? 0 : Math.min(Math.max(center(hover), 100), Math.max(width - 100, 100)));
</script>

{#if labels.length === 0}
	<p class="text-muted py-8 text-center text-sm">{emptyLabel}</p>
{:else}
	<div class="relative" bind:this={box} bind:clientWidth={width}>
		<svg
			width="100%"
			height={height}
			viewBox="0 0 {width || 1} {height}"
			role="img"
			aria-label="Grafik batang {series.map((s) => s.name).join(', ')}"
			onmousemove={onMove}
			onmouseleave={() => (hover = null)}
		>
			{#each ticks as t (t)}
				<line
					x1={padL}
					x2={padL + plotW}
					y1={y(t)}
					y2={y(t)}
					stroke={GRID}
					stroke-width="1"
				/>
				<text
					x={padL - 8}
					y={y(t) + 3.5}
					text-anchor="end"
					font-size="10"
					fill={AXIS}
					class="tabular-nums">{yFmt(t)}</text
				>
			{/each}

			{#each xTickIdx as i (i)}
				<text
					x={i === 0 ? padL : i === labels.length - 1 ? padL + plotW : center(i)}
					y={height - 6}
					text-anchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
					font-size="10"
					fill={AXIS}>{xFmt(labels[i])}</text
				>
			{/each}

			{#if refY !== null}
				<line
					x1={padL}
					x2={padL + plotW}
					y1={y(refY)}
					y2={y(refY)}
					stroke="var(--chart-ref)"
					stroke-dasharray="4 4"
				/>
			{/if}

			{#each labels as label, i (label + i)}
				{@const bandX = center(i)}
				{@const isHover = hover === i}
				{#if stacked}
					{@const total = resolved.reduce((sum, s) => sum + s[i], 0)}
					{#if total > 0}
						{@const top = y(resolved.reduce((sum, s) => sum + s[i], 0))}
						{@const bottom = y(0)}
						{#each series as s, si (s.name)}
							{@const v = resolved[si][i]}
							{#if v > 0}
								{@const yTop = y(resolved.slice(0, si + 1).reduce((sum, r) => sum + r[i], 0))}
								{@const yBottom = y(resolved.slice(0, si).reduce((sum, r) => sum + r[i], 0))}
								<rect
									x={bandX - barW / 2}
									y={yTop}
									width={barW}
									height={Math.max(0.5, yBottom - yTop)}
									fill={s.color}
									opacity={isHover ? 1 : 0.9}
								/>
							{/if}
						{/each}
						<!-- sisa pembulatan ditutup baris paling atas -->
						<rect
							x={bandX - barW / 2}
							y={top}
							width={barW}
							height={Math.max(0.5, bottom - top)}
							fill="transparent"
						/>
					{/if}
				{:else}
					{@const v = resolved[0][i]}
					{@const top = y(Math.max(v, 0))}
					{@const bottom = y(Math.min(v, 0))}
					{@const color = series[0].colors?.[i] ?? series[0].color}
					<rect
						x={bandX - barW / 2}
						y={top}
						width={barW}
						height={Math.max(1, bottom - top)}
						rx={radius}
						fill={color}
						opacity={isHover ? 1 : 0.92}
					/>
				{/if}
			{/each}
		</svg>

		{#if hover !== null}
			<div
				class="card pointer-events-none absolute top-1 z-10 w-max max-w-[240px] p-2 text-xs shadow-lg"
				style="left: {tooltipX}px; transform: translateX(-50%)"
			>
				<p class="mb-1 font-semibold">{xFmt(labels[hover])}</p>
				{#each series as s, si (s.name)}
					<p class="flex items-center gap-1.5">
						<span class="inline-block h-2 w-2 shrink-0 rounded-full" style="background: {s.color}"
						></span>
						<span>{s.name}</span>
						<span class="ml-auto tabular-nums">
							{normalize
								? `${resolved[si][hover].toFixed(1)}%`
								: (s.fmt ?? ((n: number) => fmtNum(n, 2)))(s.values[hover] ?? 0)}
						</span>
					</p>
				{/each}
				{#if footer}
					{@const extra = footer(hover)}
					{#if extra}<p class="text-muted mt-1 tabular-nums">{extra}</p>{/if}
				{/if}
			</div>
		{/if}
	</div>

	{#if legend}
		<div class="text-muted mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
			{#each series as s (s.name)}
				<span class="inline-flex items-center gap-1.5">
					<span class="inline-block h-2 w-2 rounded-full" style="background: {s.color}" aria-hidden="true"
					></span>
					{s.name}
				</span>
			{/each}
		</div>
	{/if}
{/if}
