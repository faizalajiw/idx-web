<script lang="ts">
	import { useStockBrokerActivity } from "#lib/hooks.svelte.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LineArea from "#lib/components/LineArea.svelte";

	const SCORE_LINE = "var(--chart-score)";
	const MEDIAN_LINE = "var(--chart-median)";

	/** Pilihan zoom sesi bursa. */
	const ZOOMS = [5, 20, 60, 120] as const;
	type Zoom = (typeof ZOOMS)[number];
	const ZOOM_LABEL: Record<Zoom, string> = { 5: "5 hari", 20: "1 bulan", 60: "3 bulan", 120: "6 bulan" };

	type TimelinePoint = {
		date: string;
		score: number;
		median: number | null;
	};

	let {
		code,
		lookback = 120,
		title = "Riwayat Aliran Dana",
		class: className = ""
	}: {
		code: string;
		lookback?: number;
		title?: string;
		class?: string;
	} = $props();

	const activity = useStockBrokerActivity(() => code, () => lookback);
	const data = $derived(activity.data);
	let zoom = $state<Zoom>(20);

	const points = $derived<TimelinePoint[]>(
		(data?.history ?? []).map((h) => ({
			date: h.date,
			score: h.score,
			median: h.market_median ?? null
		}))
	);
	const view = $derived(points.slice(-zoom));

	/**
	 * Warna fase satu sesi: skala kontinu dari baseline 50 — makin jauh di atas
	 * median makin hijau, makin jauh di bawah makin merah.
	 */
	function phaseColor(score: number, median: number | null): string {
		const ref = median ?? 50;
		const delta = score - ref;
		const intensity = Math.min(Math.abs(delta) / 25, 1); // 25 poin = penuh
		const alpha = 0.25 + 0.6 * intensity;
		const base = delta >= 0 ? "var(--chart-up)" : "var(--chart-down)";
		return `color-mix(in srgb, ${base} ${(alpha * 100).toFixed(0)}%, transparent)`;
	}

	const subtitle = $derived(
		data?.as_of
			? `Seberapa kuat tekanan beli vs jual dari broker, sampai ${data.as_of}`
			: "Seberapa kuat tekanan beli vs jual dari broker"
	);
</script>

<Card
	class={className}
	title={title}
	{subtitle}
	info="Skor 0–100 menunjukkan arah tekanan broker. Di atas garis putus-putus (50) berarti lebih banyak yang mengumpulkan saham; di bawah berarti lebih banyak yang melepas. Garis abu-abu = rata-rata pasar hari itu sebagai pembanding."
>
	{#snippet right()}
		<div class="flex items-center gap-1">
			{#each ZOOMS as z (z)}
				<button
					type="button"
					onclick={() => (zoom = z)}
					class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors {zoom === z
						? 'bg-[var(--accent)] text-white'
						: 'text-muted hover:bg-white/[0.06]'}"
				>
					{ZOOM_LABEL[z]}
				</button>
			{/each}
		</div>
	{/snippet}

	{#if activity.error}
		<ErrorState
			message="Gagal memuat timeline: {activity.error instanceof Error
				? activity.error.message
				: String(activity.error)}"
		/>
	{:else if activity.isLoading || !data}
		<Skeleton class="h-44 w-full" />
	{:else if view.length < 2}
		<EmptyState
			message="Belum ada riwayat skor yang cukup untuk timeline (butuh ≥ 2 sesi berskor; faktor aliran juga harus tervalidasi IC)."
		/>
	{:else}
		<div>
			<div class="text-muted mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
				<span class="flex items-center gap-1.5">
					<span class="inline-block h-2 w-3 rounded-sm" style="background-color: {SCORE_LINE}"></span>
					Skor emiten
				</span>
				<span class="flex items-center gap-1.5">
					<span class="inline-block w-3 border-t border-dashed" style="border-color: {MEDIAN_LINE}"></span>
					Rata-rata pasar
				</span>
			</div>

			<LineArea
				labels={view.map((p) => p.date)}
				series={[
					{
						name: "Skor",
						values: view.map((p) => p.score),
						color: SCORE_LINE,
						kind: "area",
						fill: "var(--chart-area-fill)",
						width: 2,
						fmt: (v) => v.toFixed(1)
					},
					{
						name: "Median pasar",
						values: view.map((p) => p.median),
						color: MEDIAN_LINE,
						width: 1.5,
						dashed: true,
						fmt: (v) => v.toFixed(1)
					}
				]}
				height={200}
				yDomain={[0, 100]}
				yTicks={[0, 50, 100]}
				yFmt={(v) => String(Math.round(v))}
				xFmt={(d) => d.slice(5)}
				refs={[{ y: 50, color: "var(--chart-ref-soft)", dashed: true }]}
				legend={false}
				xTickGap={24}
			/>

			{#if view.length >= 2}
				<div class="mt-1">
					<div class="flex h-2 w-full gap-px overflow-hidden rounded-full">
						{#each view as p (p.date)}
							<div
								class="h-full flex-1"
								style="background-color: {phaseColor(p.score, p.median)}"
								title="{p.date} · skor {p.score.toFixed(0)} (median {p.median?.toFixed(0) ?? '-'})"
							></div>
						{/each}
					</div>
					<div class="text-muted mt-1 flex items-center justify-between text-[10px]">
						<span>Dilepas (jual)</span>
						<span>Warna per hari: makin pekat, makin kuat tekanannya</span>
						<span>Dikumpulkan (beli)</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</Card>
