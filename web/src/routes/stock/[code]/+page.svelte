<script lang="ts">
	import { page } from "$app/state";
	import { useWatchlist } from "#lib/hooks.svelte.ts";
	import TechnicalChart from "#lib/components/TechnicalChart.svelte";
	import HistoryTable from "#lib/components/HistoryTable.svelte";
	import SignalsPanel from "#lib/components/SignalsPanel.svelte";
	import BrokerSummary from "#lib/components/BrokerSummary.svelte";
	import ForeignFlowCard from "#lib/components/ForeignFlowCard.svelte";
	import FlowTimelineCard from "#lib/components/FlowTimelineCard.svelte";
	import BrokerFlowCard from "#lib/components/BrokerFlowCard.svelte";
	import BrokerActivityCard from "#lib/components/BrokerActivityCard.svelte";
	import RegimeBanner from "#lib/components/RegimeBanner.svelte";
	import EventStudyCard from "#lib/components/EventStudyCard.svelte";
	import SmartMoneyBanner from "#lib/components/SmartMoneyBanner.svelte";
	import OwnershipCard from "#lib/components/OwnershipCard.svelte";

	const NAV_BTN =
		"card inline-flex min-w-[96px] items-center justify-center px-3 py-2 text-sm transition-colors hover:bg-white/[0.03]";
	const NAV_DISABLED =
		"card inline-flex min-w-[96px] items-center justify-center px-3 py-2 text-sm text-muted opacity-50";

	const code = $derived((page.params.code ?? "").toUpperCase());

	// Prev/next mengikuti watchlist backend (alfabetis, melingkar), jadi saham
	// yang dibuka dari dashboard bisa ditelusuri tanpa kembali dulu.
	const watchlist = useWatchlist();
	const nav = $derived.by(() => {
		const rows = watchlist.data;
		const kosong = { prev: null as string | null, next: null as string | null };
		if (!rows?.length || !code) return kosong;
		const codes = rows.map((r) => r.code).sort((a, b) => a.localeCompare(b));
		const idx = codes.indexOf(code);
		if (idx === -1) return kosong;
		return {
			prev: codes[(idx - 1 + codes.length) % codes.length],
			next: codes[(idx + 1) % codes.length]
		};
	});
</script>

<svelte:head>
	<title>{code} · Market Labs</title>
</svelte:head>

{#if !code}
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
		<p class="text-muted">Kode emiten tidak valid.</p>
	</main>
{:else}
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
		<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<nav class="text-muted text-xs" aria-label="Breadcrumb">
					<a href="/" class="hover:underline">Home</a>
					<span class="mx-1.5">/</span>
					<span class="font-medium text-[var(--fg)]">{code}</span>
				</nav>
				<h1 class="mt-1 text-2xl font-bold tracking-tight">{code}</h1>
			</div>

			<nav
				class="flex max-w-full shrink-0 items-center gap-2 overflow-x-auto"
				aria-label="Navigasi emiten"
			>
				<a href={`/dossier/${code}`} class={NAV_BTN} title="Buka dossier analisis">Dossier</a>
				{#if nav.prev}
					<a href={`/stock/${nav.prev}`} class={NAV_BTN} title={`Ke ${nav.prev}`}>
						<span aria-hidden="true">←</span>&nbsp;{nav.prev}
					</a>
				{:else}
					<span class={NAV_DISABLED}>
						<span aria-hidden="true">←</span>&nbsp;—
					</span>
				{/if}
				{#if nav.next}
					<a href={`/stock/${nav.next}`} class={NAV_BTN} title={`Ke ${nav.next}`}>
						{nav.next}&nbsp;<span aria-hidden="true">→</span>
					</a>
				{:else}
					<span class={NAV_DISABLED}>
						—&nbsp;<span aria-hidden="true">→</span>
					</span>
				{/if}
			</nav>
		</header>

		<div class="space-y-4">
			<SmartMoneyBanner {code} />
			<RegimeBanner />
			<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<div class="xl:col-span-2">
					<TechnicalChart {code} />
				</div>
				<div class="space-y-4">
					<SignalsPanel codes={code} />
					<BrokerSummary {code} />
					<OwnershipCard {code} />
					<ForeignFlowCard {code} />
					<FlowTimelineCard {code} />
					<BrokerFlowCard compact />
					<BrokerActivityCard {code} />
					<EventStudyCard {code} />
					<HistoryTable {code} />
				</div>
			</div>
		</div>
	</main>
{/if}
