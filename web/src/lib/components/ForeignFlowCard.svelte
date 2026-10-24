<script lang="ts">
	import { useStockForeignFlow } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtDateStr, fmtNum } from "#lib/format.ts";
	import type { StockForeignFlowDay, StockForeignFlowPeer } from "#lib/types.ts";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";
	import Bars from "#lib/components/Bars.svelte";

	const UP = "var(--chart-up)"; // asing net beli
	const DOWN = "var(--chart-down)"; // asing net jual
	const FLIP = "var(--chart-flip)"; // hari asing balik arah

	type FlowPoint = {
		label: string;
		date: string;
		net: number;
		flip: boolean;
		raw: number;
	};

	/**
	 * Arus asing per emiten dalam bahasa awam: ringkasan arah hari ini, grafik
	 * net harian, dan pembanding sektor. `compact` menyembunyikan pembanding.
	 */
	let {
		code,
		compact = false,
		class: className = ""
	}: {
		code: string;
		compact?: boolean;
		class?: string;
	} = $props();

	const sf = useStockForeignFlow(() => code, 30, 10);
	const data = $derived(sf.data);
	const fs = $derived(data?.flip_summary);

	// Net sesi terakhir yang BERNILAI (hari tanpa data dilewati, bukan 0).
	const lastNet = $derived.by<number | null>(() => {
		const flow = data?.flow ?? [];
		for (let i = flow.length - 1; i >= 0; i--) {
			const net = flow[i]?.net;
			if (net !== null && net !== undefined) return net;
		}
		return null;
	});

	// Net harian per sesi dalam miliar rupiah; hari tanpa nilai tidak digambar.
	const points = $derived<FlowPoint[]>(
		(data?.flow ?? [])
			.filter((p: StockForeignFlowDay) => p.net !== null)
			.map((p: StockForeignFlowDay) => ({
				label: fmtDateStr(p.date)?.slice(0, 6) ?? p.date,
				date: p.date,
				net: (p.net as number) / 1e9,
				flip: p.flip === true,
				raw: p.net as number
			}))
	);

	const isBuy = $derived(fs?.current_side === "net_buy");
	const isSell = $derived(fs?.current_side === "net_sell");
	const headline = $derived(
		isBuy
			? "Asing sedang net beli"
			: isSell
				? "Asing sedang net jual"
				: "Asing belum punya arah jelas"
	);
	const tone = $derived(isBuy ? "text-up" : isSell ? "text-down" : "");

	const LEGEND = [
		{ color: UP, text: "Asing net beli" },
		{ color: DOWN, text: "Asing net jual" },
		{ color: FLIP, text: "Hari asing balik arah" }
	];

	const netFmt = (v: number) =>
		`${v > 0 ? "Asing net beli" : "Asing net jual"} Rp ${fmtCompact(Math.abs(v) * 1e9)}`;
</script>

{#snippet fact(label: string, value: string, toneClass = "")}
	<div class="rounded-xl border border-[var(--border)] p-3">
		<p class="text-muted text-[11px]">{label}</p>
		<p class="mt-0.5 text-sm font-semibold tabular-nums {toneClass}">{value}</p>
	</div>
{/snippet}

{#snippet legend()}
	<div class="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
		{#each LEGEND as item (item.text)}
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-2 w-2 rounded-full" style="background-color: {item.color}"></span>
				{item.text}
			</span>
		{/each}
	</div>
{/snippet}

{#snippet peerList(peers: StockForeignFlowPeer[], comparable: boolean)}
	{@const maxAbs = Math.max(...peers.map((p) => Math.abs(p.net_sum)), 1)}
	{@const days = peers[0]?.n_days ?? 10}
	<div>
		<p class="mb-2 flex items-center gap-1 text-sm font-semibold">
			Dibandingkan saham sejenis
			<InfoHint
				text="Total net asing tiap emiten se-sektor selama {days} sesi bursa terakhir. Hijau = asing lebih banyak membeli, merah = lebih banyak menjual. Saham yang sedang kamu lihat ditandai ←."
			/>
		</p>
		<ul class="space-y-2">
			{#each peers as p (p.code)}
				{@const share = (Math.abs(p.net_sum) / maxAbs) * 50}
				<li
					class="flex items-center gap-2 rounded-lg px-2 py-1 text-xs {p.is_self
						? 'bg-[var(--accent)]/10'
						: ''}"
				>
					<span class="flex w-20 shrink-0 items-center gap-1.5">
						<TickerLogo code={p.code} size={16} />
						<span class="font-semibold {p.is_self ? 'text-up' : ''}">
							{p.code}
							{p.is_self ? " ←" : ""}
						</span>
					</span>
					<span class="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
						<span
							class="absolute top-0 h-full rounded-full"
							style="width: {share}%; {p.net_sum >= 0 ? 'left' : 'right'}: 50%; background-color: {p.net_sum >=
							0
								? UP
								: DOWN}"
						></span>
						<span class="absolute top-0 left-1/2 h-full w-px bg-white/25"></span>
					</span>
					<span
						class="w-20 shrink-0 text-right tabular-nums {p.net_sum >= 0 ? 'text-up' : 'text-down'}"
					>
						{p.net_sum >= 0 ? "+" : "-"}Rp {fmtCompact(Math.abs(p.net_sum))}
					</span>
				</li>
			{/each}
		</ul>
		{#if !comparable}
			<p class="text-muted mt-2 text-[11px] leading-snug">
				Sektor saham ini belum terpetakan, jadi pembanding hanya gambaran kasar.
			</p>
		{/if}
	</div>
{/snippet}

<section class="card min-w-0 p-5 {className}">
	<header class="mb-4 flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="text-base font-semibold">Arus Asing</h2>
			<p class="text-muted mt-0.5 text-sm">
				Apakah investor asing sedang membeli atau menjual saham ini{data?.sector
					? ` · ${data.sector}`
					: ""}.
			</p>
		</div>
		<LastUpdated sessionDate={data?.date} updatedAt={null} dep={data} />
	</header>

	{#if sf.error}
		<ErrorState
			message="Gagal memuat arus asing: {sf.error instanceof Error
				? sf.error.message
				: String(sf.error)}"
		/>
	{:else if sf.isLoading || !data}
		<Skeleton class="h-52 w-full" />
	{:else if data.flow.length === 0 || data.flow.every((p) => p.net === null)}
		<EmptyState
			message="Belum ada data aliran asing untuk emiten ini (data EOD diisi lewat `idx serve` atau backfill)."
		/>
	{:else}
		<div class="space-y-5">
			<div class="rounded-xl bg-[var(--bg-elev)] p-4">
				<p class="text-lg font-bold {tone}">{headline}</p>
				<p class="text-muted mt-1 text-sm tabular-nums">
					{#if lastNet !== null}
						Sesi terakhir
						<span class={lastNet >= 0 ? "text-up font-semibold" : "text-down font-semibold"}>
							{lastNet >= 0 ? "+" : "-"}Rp {fmtCompact(Math.abs(lastNet))}
						</span>
						{fs?.current_streak ? ` · sudah ${fs.current_streak} sesi berturut-turut` : ""}
					{:else}
						Belum ada nilai sesi terakhir.
					{/if}
				</p>
			</div>

			<div class="grid gap-3 {compact ? 'grid-cols-1' : 'grid-cols-2'}">
				{@render fact(
					"Terakhir berbalik arah",
					fs?.last_flip
						? fs.last_flip.to === "net_buy"
							? "Dari jual ke beli"
							: "Dari beli ke jual"
						: "Belum pernah",
					fs?.last_flip?.to === "net_buy"
						? "text-up"
						: fs?.last_flip?.to === "net_sell"
							? "text-down"
							: ""
				)}
				{@render fact(
					"Sudah berjalan sejak balik arah",
					fs?.days_since_flip !== null && fs?.days_since_flip !== undefined
						? fs.days_since_flip === 0
							? "Hari ini"
							: `${fs.days_since_flip} sesi`
						: "-"
				)}
			</div>

			<div>
				<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
					<p class="flex items-center gap-1 text-sm font-semibold">
						Net asing harian
						<InfoHint
							text="Batang ke atas = asing net beli, ke bawah = asing net jual, dalam miliar rupiah. Amber = hari asing berbalik arah."
						/>
					</p>
					{@render legend()}
				</div>
				{#if points.length > 0}
					<Bars
						labels={points.map((p) => p.label)}
						series={[
							{
								name: "Net asing harian",
								values: points.map((p) => p.net),
								color: UP,
								colors: points.map((p) => (p.flip ? FLIP : p.raw > 0 ? UP : DOWN)),
								fmt: netFmt
							}
						]}
						height={170}
						maxBarSize={22}
						radius={3}
						refY={0}
						yFmt={(v) => `${fmtNum(Math.round(v))} M`}
						footer={(i) => (points[i]?.flip ? "Hari asing balik arah" : null)}
						xTickGap={24}
					/>
				{/if}
			</div>

			{#if !compact && data.peers.length > 1}
				{@render peerList(data.peers, data.comparable)}
			{/if}

			{#if !compact && data.peer_rank.count > 1}
				<p class="text-muted text-xs leading-relaxed">
					Saham ini ada di urutan <strong class="text-[var(--fg)]">#{data.peer_rank.rank}</strong
					> dari
					{data.peer_rank.count} saham sejenis.
				</p>
			{/if}
		</div>
	{/if}
</section>
