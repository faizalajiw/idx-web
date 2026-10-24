<script lang="ts">
	import { TrendingDown, TrendingUp } from "@lucide/svelte";
	import { useMarketOverview } from "#lib/hooks.svelte.ts";
	import { fmtNum, fmtPct } from "#lib/format.ts";
	import type { Mover } from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	const overview = useMarketOverview();
	const data = $derived(overview.data);
	const error = $derived(overview.error);
	const isLoading = $derived(overview.isLoading);

	const pesanError = $derived(
		`Gagal memuat market overview: ${error instanceof Error ? error.message : String(error)}`
	);
</script>

{#snippet movers(items: Mover[], kind: "gain" | "lose")}
	<div>
		<div
			class="text-muted grid grid-cols-[1.25rem_1fr_4.5rem_4.5rem] items-center gap-2 border-b border-[var(--border)] px-2 pb-1.5 text-[10px] font-medium tracking-wide uppercase sm:grid-cols-[1.5rem_1fr_5rem_4rem] sm:gap-3"
		>
			<span class="text-right">#</span>
			<span>Kode</span>
			<span class="text-right">Harga</span>
			<span class="text-right">%</span>
		</div>
		<ul class="mt-1 space-y-1">
			{#each items as m, i (m.code)}
				<li
					class="grid grid-cols-[1.25rem_1fr_4.5rem_4.5rem] items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.04] sm:grid-cols-[1.5rem_1fr_5rem_4rem] sm:gap-3"
				>
					<span class="text-muted text-right text-xs tabular-nums">{i + 1}</span>
					<span class="flex items-center gap-2 font-medium">
						<TickerLogo code={m.code} size={22} />
						{m.code}
					</span>
					<span class="text-muted text-right tabular-nums">{fmtNum(m.close)}</span>
					<span
						class="text-right font-semibold tabular-nums {kind === 'gain' ? 'text-up' : 'text-down'}"
					>
						{fmtPct(m.percent)}
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet gainersTitle()}
	<TrendingUp size={15} class="text-up" aria-hidden="true" /> Top Gainers
{/snippet}

{#snippet losersTitle()}
	<TrendingDown size={15} class="text-down" aria-hidden="true" /> Top Losers
{/snippet}

{#snippet right()}
	<LastUpdated sessionDate={data?.index?.captured_at} updatedAt={data?.index?.captured_at} />
{/snippet}

{#if error}
	<ErrorState message={pesanError} />
{:else}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card
			title={gainersTitle}
			info="Saham dengan kenaikan harga persentase terbesar hari ini. Naik banyak belum tentu bagus untuk dibeli — bisa jadi sudah telanjur mahal atau baru pom-pom sesaat."
			right={right}
			hover
		>
			{#if isLoading || !data}
				<Skeleton class="h-40" />
			{:else}
				{@render movers(data.top_gainers, "gain")}
			{/if}
		</Card>
		<Card
			title={losersTitle}
			info="Saham dengan penurunan harga persentase terbesar hari ini. Turun banyak bukan berarti murah — cek dulu alasannya sebelum tergoda 'beli di harga diskon'."
			right={right}
			hover
		>
			{#if isLoading || !data}
				<Skeleton class="h-40" />
			{:else}
				{@render movers(data.top_losers, "lose")}
			{/if}
		</Card>
	</div>
{/if}
