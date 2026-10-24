<script lang="ts">
	import {
		Activity,
		BuildingComplex,
		Handshake,
		Landmark,
		LayoutDashboard,
		Minus,
		TrendingDown,
		TrendingUp,
		Wallet,
		type LucideIcon
	} from "@lucide/svelte";
	import { useMarketOverview, useMarketTradeSummary } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtDateStr, fmtNum, fmtPct } from "#lib/format.ts";
	import DataHealthCard from "#lib/components/DataHealthCard.svelte";
	import FreshnessBadge from "#lib/components/FreshnessBadge.svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import LatestNewsCard from "#lib/components/NewsCards.svelte";
	import MarketOverview from "#lib/components/MarketOverview.svelte";
	import MarketRegimeCard from "#lib/components/MarketRegimeCard.svelte";
	import SignalsPanel from "#lib/components/SignalsPanel.svelte";
	import TechnicalChart from "#lib/components/TechnicalChart.svelte";
	import TopBrokersPanel from "#lib/components/TopBrokersPanel.svelte";
	import TopLeadersPanel from "#lib/components/TopLeadersPanel.svelte";

	type Tile = {
		label: string;
		value: string;
		sub?: string;
		warn?: boolean;
		title?: string;
		icon: LucideIcon;
		color: string;
	};

	let selected = $state<string | null>(null);

	const overview = useMarketOverview();
	// Ringkasan pasar reguler/non-reguler dipakai di grid SAMA di bawah, bukan
	// kartu terpisah. Volume/Value hero jadi TOTAL pasar saat data itu ada
	// (kalau tidak, fallback ke angka lama dari overview).
	const tradeQuery = useMarketTradeSummary();

	const data = $derived(overview.data);
	const trade = $derived(tradeQuery.data);
	const hasTrade = $derived(trade?.date != null && trade?.total.value != null);

	const idx = $derived(data?.index ?? null);
	const chg = $derived(idx?.change ?? 0);
	const pct = $derived(idx?.percent ?? 0);
	const up = $derived(chg > 0);
	const down = $derived(chg < 0);
	const badgeTone = $derived(up ? "badge-buy" : down ? "badge-sell" : "badge-hold");
	const DirIcon = $derived(up ? TrendingUp : down ? TrendingDown : Minus);

	const indexValue = $derived(idx?.current ?? idx?.close ?? null);

	const stocks = $derived(trade?.stock_count || data?.totals.stock_count || 0);
	const volLot = $derived(trade?.total.volume_lot ?? null);
	const totalValue = $derived(
		trade && hasTrade ? trade.total.value : (data?.totals.total_value ?? null)
	);

	const tiles = $derived<Tile[]>([
		{
			label: "Volume",
			value: volLot != null ? `${fmtCompact(volLot)} lot` : "-",
			icon: Activity,
			color: "#38bdf8"
		},
		{
			label: "Nilai Transaksi",
			value: totalValue != null ? `Rp ${fmtCompact(totalValue)}` : "-",
			icon: Wallet,
			color: "#4ade80"
		},
		{ label: "Emiten Aktif", value: fmtNum(stocks), icon: BuildingComplex, color: "#c4b5fd" }
	]);

	const segments = $derived<Tile[]>([
		{
			label: "Pasar Reguler",
			warn: false,
			icon: Landmark,
			color: "#fbbf24",
			title: "1 lot = 100 lembar",
			value: trade?.regular?.value != null ? `Rp ${fmtCompact(trade.regular.value)}` : "-",
			sub:
				trade?.regular?.volume_lot != null ? `${fmtCompact(trade.regular.volume_lot)} lot` : undefined
		},
		{
			label: "Pasar Non-Reguler",
			warn: true,
			icon: Handshake,
			color: "#fb923c",
			title: "1 lot = 100 lembar",
			value: trade?.non_regular?.value != null ? `Rp ${fmtCompact(trade.non_regular.value)}` : "-",
			sub:
				trade?.non_regular?.volume_lot != null
					? `${fmtCompact(trade.non_regular.volume_lot)} lot`
					: undefined
		}
	]);

	// Angka IHSG: count-up halus saat nilai berubah, hormati reduced-motion.
	let display = $state<number | null>(null);
	let fromRef: number | null = null;

	$effect(() => {
		const value = indexValue;
		if (value == null) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const from = fromRef ?? value;
		fromRef = value;
		if (reduce || from === value) {
			display = value;
			return;
		}
		const start = performance.now();
		const duration = 700;
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			display = from + (value - from) * eased;
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

{#snippet statTile(t: Tile)}
	{@const Ikon = t.icon}
	<div class="stat-box flex items-center gap-3 px-3.5 py-3" title={t.title}>
		<span
			class="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
			style="background: color-mix(in srgb, {t.color} 16%, transparent); color: {t.color}"
		>
			<Ikon size={18} aria-hidden="true" />
		</span>
		<div class="flex min-w-0 flex-col gap-0.5">
			<p class="text-[11px] leading-tight font-medium {t.warn ? 'text-warn' : 'text-muted'}">
				{t.label}
			</p>
			<p class="text-base font-semibold tabular-nums sm:text-lg">{t.value}</p>
			{#if t.sub}
				<p class="text-muted text-[11px] tabular-nums">{t.sub}</p>
			{/if}
		</div>
	</div>
{/snippet}

<svelte:head>
	<title>Dashboard · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<LayoutDashboard size={26} class="text-accent" aria-hidden="true" />
			Dashboard <span class="gradient-text">Pasar</span>
		</h1>
		<p class="text-muted mt-0.5 flex flex-wrap items-center gap-2 text-sm">
			<span>DataIDX delayed ~5–15 menit · auto-refresh 30 detik</span>
			<FreshnessBadge />
		</p>
	</div>

	<!-- Hero IHSG: volume/value total + rincian pasar reguler vs non-reguler -->
	<div
		class="card card-hover fade-up flex h-full flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
	>
		<div class="flex min-w-0 flex-col gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<p class="text-muted text-[11px] font-semibold tracking-[0.16em] uppercase">
					IHSG · Composite
				</p>
				<span class="badge tabular-nums {badgeTone}">
					<DirIcon size={12} class="mr-1" aria-hidden="true" />
					{fmtNum(chg, 2)} ({fmtPct(pct)})
				</span>
			</div>
			{#key indexValue}
				<p class="index-value text-4xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl">
					{fmtNum(display, 2)}
				</p>
			{/key}
			<LastUpdated
				sessionDate={data?.index?.captured_at}
				updatedAt={data?.index?.captured_at}
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-3">
			<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
				{#each tiles as t (t.label)}
					{@render statTile(t)}
				{/each}
			</div>

			<div class="grid grid-cols-2 gap-2.5">
				{#each segments as s (s.label)}
					{@render statTile(s)}
				{/each}
			</div>

			<p class="text-muted flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] break-words">
				{#if trade && hasTrade}
					<span class="min-w-0">Sesi bursa {fmtDateStr(trade.date)}</span>
					{#if trade.non_regular_share_value != null}
						<span class="min-w-0">
							· non-reguler {(trade.non_regular_share_value * 100).toFixed(1)}% value
						</span>
					{/if}
					{#if trade.non_regular_share_volume != null}
						<span class="min-w-0">
							· {(trade.non_regular_share_volume * 100).toFixed(1)}% volume
						</span>
					{/if}
					<span class="min-w-0">· angka final setelah pasar tutup</span>
				{:else}
					<span class="min-w-0">
						Pasar reguler/non-reguler: data sesi terbaru belum tersedia · angka final setelah pasar
						tutup
					</span>
				{/if}
				<InfoHint
					text="Pasar reguler = lelang terus-menerus + pra-closing (dipakai harga referensi). Pasar non-reguler = pasar tunai + negosiasi, umumnya transaksi besar di luar lelang. 1 lot = 100 lembar."
				/>
			</p>
		</div>
	</div>

	<!-- Gerbang kepercayaan: kalau data bolong, sisa angka di bawah ikut diragukan -->
	<DataHealthCard />
	<MarketRegimeCard />
	<LatestNewsCard />
	<MarketOverview />

	<!-- Leaderboard likuiditas: realtime saat jam bursa, EOD di luar jam -->
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
		<TopLeadersPanel metric="volume" onSelect={(code) => (selected = code)} {selected} />
		<TopLeadersPanel metric="value" onSelect={(code) => (selected = code)} {selected} />
		<TopLeadersPanel metric="frequency" onSelect={(code) => (selected = code)} {selected} />
		<TopBrokersPanel />
	</div>

	<!-- Sinyal teknikal, ikut memilih emiten untuk chart di bawah -->
	<SignalsPanel onSelect={(code) => (selected = code)} {selected} />

	<!-- Shared detail canvas fed by both selectors above -->
	<TechnicalChart code={selected} />
</main>
