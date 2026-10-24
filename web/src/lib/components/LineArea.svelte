<script lang="ts">
	/**
	 * Grafik garis/area SVG tanpa pustaka chart.
	 *
	 * Menggantikan `LineChart`/`ComposedChart` Recharts pada halaman yang sudah
	 * diporting. Yang dijaga paritasnya: sumbu dengan label, kisi horizontal,
	 * legenda, garis referensi, dan tooltip saat kursor melintas.
	 */
	import { fmtNum } from '#lib/format.ts';

	type Series = {
		name: string;
		values: (number | null)[];
		color: string;
		/** `line` (bawaan) atau `area` yang diisi sampai dasar grafik. */
		kind?: 'line' | 'area';
		width?: number;
		dashed?: boolean;
		fill?: string;
		/** Format angka di tooltip; bawaan dua desimal. */
		fmt?: (v: number) => string;
	};

	type Ref = { y: number; color?: string; dashed?: boolean; label?: string };

	let {
		labels,
		series,
		height = 240,
		yDomain = 'auto',
		yTicks = [],
		yFmt = (v: number) => fmtNum(v),
		xFmt = (s: string) => s,
		refs = [],
		legend = true,
		xTickGap = 28,
		emptyLabel = 'Tidak ada data.'
	}: {
		labels: string[];
		series: Series[];
		height?: number;
		yDomain?: 'auto' | [number, number];
		yTicks?: number[];
		yFmt?: (v: number) => string;
		xFmt?: (s: string) => string;
		refs?: Ref[];
		legend?: boolean;
		xTickGap?: number;
		emptyLabel?: string;
	} = $props();

	const PAD = { right: 12, top: 8, bottom: 22 };
	const AXIS = 'var(--chart-axis)';
	const GRID = 'var(--chart-grid)';

	let box = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	let hover = $state<number | null>(null);

	const plotH = $derived(Math.max(0, height - PAD.top - PAD.bottom));

	const domain = $derived.by<[number, number]>(() => {
		if (Array.isArray(yDomain)) return yDomain;
		const all: number[] = [];
		for (const s of series)
			for (const v of s.values) if (v !== null && Number.isFinite(v)) all.push(v);
		for (const r of refs) all.push(r.y);
		if (all.length === 0) return [0, 1];
		let min = Math.min(...all);
		let max = Math.max(...all);
		if (min === max) {
			min -= 1;
			max += 1;
		}
		const pad = (max - min) * 0.06;
		return [min - pad, max + pad];
	});

	const ticks = $derived.by<number[]>(() => {
		if (yTicks.length > 0) return yTicks;
		const [min, max] = domain;
		const n = 4;
		return Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n);
	});

	/** Lebar kolom label Y mengikuti label terpanjang supaya angka besar tidak terpotong. */
	const padL = $derived.by(() => {
		const longest = ticks.reduce((n, t) => Math.max(n, String(yFmt(t)).length), 0);
		return Math.min(104, Math.max(40, longest * 6.6 + 12));
	});
	const plotW = $derived(Math.max(0, width - padL - PAD.right));

	const x = (i: number) =>
		padL + (labels.length <= 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
	const y = (v: number) =>
		PAD.top + plotH - ((v - domain[0]) / (domain[1] - domain[0] || 1)) * plotH;

	const xTickIdx = $derived.by<number[]>(() => {
		if (labels.length === 0) return [];
		// Lebar label diperkirakan dari jumlah karakter: jarak minimum harus cukup
		// untuk teksnya, bukan hanya `xTickGap`, supaya label tidak bertumpuk.
		const longest = labels.reduce((n, l) => Math.max(n, String(l).length), 0);
		const minGap = Math.max(xTickGap, longest * 6.4 + 12);
		const maxTicks = Math.max(2, Math.floor(plotW / minGap));
		const step = Math.max(1, Math.ceil(labels.length / maxTicks));
		const idx: number[] = [];
		for (let i = 0; i < labels.length; i += step) idx.push(i);
		const last = labels.length - 1;
		if (idx[idx.length - 1] !== last) {
			const gapPx =
				labels.length <= 1 ? plotW : (plotW / (labels.length - 1)) * (last - idx[idx.length - 1]);
			if (gapPx < minGap) idx.pop();
			idx.push(last);
		}
		return idx;
	});

	/** Satu path per segmen; `null` memutus garis. Tiap segmen wajib mulai `M`. */
	function segments(values: (number | null)[]): string[] {
		const out: string[] = [];
		let current: string[] = [];
		values.forEach((v, i) => {
			if (v === null || !Number.isFinite(v)) {
				if (current.length > 0) {
					out.push(current.join(' '));
					current = [];
				}
				return;
			}
			current.push(`${current.length === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
		});
		if (current.length > 0) out.push(current.join(' '));
		return out;
	}

	/** Area: tiap segmen terisi sampai dasar grafik, jadi celah data tidak diisi. */
	function areaPaths(values: (number | null)[]): string[] {
		const groups: { i: number; v: number }[][] = [];
		let run: { i: number; v: number }[] = [];
		values.forEach((v, i) => {
			if (v === null || !Number.isFinite(v)) {
				if (run.length > 0) groups.push(run);
				run = [];
				return;
			}
			run.push({ i, v });
		});
		if (run.length > 0) groups.push(run);
		const base = PAD.top + plotH;
		return groups.map((g) => {
			const body = g
				.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
				.join(' ');
			const first = g[0].i;
			const last = g[g.length - 1].i;
			return `${body} L${x(last).toFixed(1)},${base.toFixed(1)} L${x(first).toFixed(1)},${base.toFixed(1)} Z`;
		});
	}

	function onMove(e: MouseEvent) {
		if (!box || labels.length === 0) return;
		const rect = box.getBoundingClientRect();
		const px = e.clientX - rect.left - padL;
		const idx = Math.round((px / (plotW || 1)) * (labels.length - 1));
		hover = Math.max(0, Math.min(labels.length - 1, idx));
	}

	const tooltipX = $derived(
		hover === null ? 0 : Math.min(Math.max(x(hover), 90), Math.max(width - 90, 90))
	);
</script>

{#if labels.length === 0}
	<p class="text-muted py-8 text-center text-sm">{emptyLabel}</p>
{:else}
	<div class="relative" bind:this={box} bind:clientWidth={width}>
		<svg
			width="100%"
			{height}
			viewBox="0 0 {width || 1} {height}"
			role="img"
			aria-label="Grafik {series.map((s) => s.name).join(', ')}"
			onmousemove={onMove}
			onmouseleave={() => (hover = null)}
		>
			{#each ticks as t (t)}
				<line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke={GRID} stroke-width="1" />
				<text
					x={padL - 8}
					y={y(t) + 3.5}
					text-anchor="end"
					font-size="11"
					fill={AXIS}
					class="tabular-nums">{yFmt(t)}</text
				>
			{/each}

			{#each xTickIdx as i (i)}
				<text
					x={i === 0 ? padL : i === labels.length - 1 ? padL + plotW : x(i)}
					y={height - 6}
					text-anchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
					font-size="11"
					fill={AXIS}>{xFmt(labels[i])}</text
				>
			{/each}

			{#each refs as r (r.y)}
				<line
					x1={padL}
					x2={padL + plotW}
					y1={y(r.y)}
					y2={y(r.y)}
					stroke={r.color ?? 'var(--chart-ref-soft)'}
					stroke-dasharray={r.dashed ? '4 4' : undefined}
				/>
				{#if r.label}
					<text x={padL + 4} y={y(r.y) - 4} font-size="10" fill={AXIS}>{r.label}</text>
				{/if}
			{/each}

			{#each series.filter((s) => (s.kind ?? 'line') === 'area') as s (s.name)}
				{#each areaPaths(s.values) as d, i (i)}
					<path {d} fill={s.fill ?? 'var(--chart-area-fill)'} stroke="none" />
				{/each}
			{/each}

			{#each series as s (s.name)}
				{#each segments(s.values) as d, i (i)}
					<path
						{d}
						fill="none"
						stroke={s.color}
						stroke-width={s.width ?? 1.75}
						stroke-dasharray={s.dashed ? '5 4' : undefined}
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				{/each}
			{/each}

			{#if hover !== null}
				<line
					x1={x(hover)}
					x2={x(hover)}
					y1={PAD.top}
					y2={PAD.top + plotH}
					stroke="var(--chart-ref-soft)"
					stroke-dasharray="3 3"
				/>
				{#each series as s (s.name)}
					{@const v = s.values[hover]}
					{#if v !== null && v !== undefined}
						<circle cx={x(hover)} cy={y(v)} r="3" fill={s.color} />
					{/if}
				{/each}
			{/if}
		</svg>

		{#if hover !== null}
			<div
				class="card pointer-events-none absolute top-1 z-10 w-max max-w-[220px] p-2 text-xs shadow-lg"
				style="left: {tooltipX}px; transform: translateX(-50%)"
			>
				<p class="text-muted mb-1">{xFmt(labels[hover])}</p>
				{#each series as s (s.name)}
					{@const v = s.values[hover]}
					<p class="tabular-nums" style="color: {s.color}">
						{s.name}: {v === null || v === undefined
							? '-'
							: (s.fmt ?? ((n: number) => fmtNum(n, 2)))(v)}
					</p>
				{/each}
			</div>
		{/if}
	</div>

	{#if legend}
		<div
			class="text-muted mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]"
		>
			{#each series as s (s.name)}
				<span class="inline-flex items-center gap-1.5">
					<span
						class="inline-block h-0.5 w-3 rounded-full"
						style="background: {s.color}"
						aria-hidden="true"
					></span>
					{s.name}
				</span>
			{/each}
		</div>
	{/if}
{/if}
