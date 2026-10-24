<script lang="ts">
	import { useTopBrokers } from "#lib/hooks.svelte.ts";
	import { fmtNum, fmtCompact } from "#lib/format.ts";
	import type { BrokerFlowCategory, BrokerLeaderRow } from "#lib/types.ts";
	import { getBrokerType, BROKER_TYPE_META } from "#lib/brokerType.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	const BROKER_TYPES = ["asing", "lokal", "bumn"] as const;

	/**
	 * Kategori prioritas dari backend (map kurasi kode broker). Fallback ke
	 * classifier nama lama kalau respons berasal dari backend versi sebelum ada
	 * field `category`.
	 */
	function rowCategory(r: Pick<BrokerLeaderRow, "category" | "broker_name">): BrokerFlowCategory {
		if (r.category === "asing" || r.category === "lokal" || r.category === "bumn") {
			return r.category;
		}
		return getBrokerType(r.broker_name);
	}

	const topBrokers = useTopBrokers();
	const data = $derived(topBrokers.data);
	const error = $derived(topBrokers.error);
	const isLoading = $derived(topBrokers.isLoading);

	let open = $state<Record<string, boolean>>({});

	const pesanError = $derived(
		`Gagal memuat Top Broker: ${error instanceof Error ? error.message : String(error)}`
	);
</script>

{#snippet brokerTypeLegend()}
	<span class="inline-flex items-center gap-2 text-[10px]">
		{#each BROKER_TYPES as t (t)}
			<span class="inline-flex items-center gap-1">
				<span
					class="inline-block h-2 w-2 rounded-full"
					style="background-color: {BROKER_TYPE_META[t].color}"
				></span>
				<span class={BROKER_TYPE_META[t].twClass}>{BROKER_TYPE_META[t].label}</span>
			</span>
		{/each}
	</span>
{/snippet}

{#snippet detail(label: string, value: string)}
	<div class="flex flex-col">
		<span class="text-muted text-[10px] tracking-wide uppercase">{label}</span>
		<span class="text-xs tabular-nums">{value}</span>
	</div>
{/snippet}

{#snippet right()}
	<span class="inline-flex items-center gap-2.5">
		{@render brokerTypeLegend()}
		<LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />
	</span>
{/snippet}

<Card
	title="Top Broker"
	subtitle="Broker teraktif per nilai transaksi"
	info="Broker dengan nilai transaksi terbesar pada sesi bursa terakhir (data akhir sesi)."
	right={right}
>
	{#if error}
		<ErrorState message={pesanError} />
	{:else if isLoading || !data}
		<div class="grid grid-cols-1 gap-2">
			{#each Array.from({ length: 5 }) as _, i (i)}
				<Skeleton class="h-[46px]" />
			{/each}
		</div>
	{:else if data.rows.length === 0}
		<EmptyState message="Belum ada data broker." />
	{:else}
		<div class="grid grid-cols-1 gap-2">
			{#each data.rows as r, i (r.broker_code)}
				{@const type = rowCategory(r)}
				<div
					class="rounded-lg border border-[var(--border)] transition-colors hover:bg-white/[0.04]"
				>
					<button
						type="button"
						onclick={() => (open[r.broker_code] = !open[r.broker_code])}
						aria-expanded={open[r.broker_code] ?? false}
						class="flex w-full items-center gap-2.5 px-3 py-2 text-left"
					>
						<span class="text-muted w-4 shrink-0 text-center text-xs font-semibold tabular-nums">
							{i + 1}
						</span>
						<TickerLogo code={r.broker_code} basePath="/logos/brokers" size={22} />
						<div class="flex min-w-0 flex-col">
							<span class="text-sm font-semibold {BROKER_TYPE_META[type].twClass}">
								{r.broker_code}
							</span>
							{#if r.broker_name}
								<span class="text-muted truncate text-[10px]">{r.broker_name}</span>
							{/if}
						</div>
						<span class="ml-auto text-sm font-semibold tabular-nums">
							Rp {fmtCompact(r.value)}
						</span>
					</button>
					{#if open[r.broker_code]}
						<div class="grid grid-cols-3 gap-2 border-t border-[var(--border)] px-3 py-2">
							{@render detail("Volume", fmtCompact(r.volume))}
							{@render detail("Value", `Rp ${fmtCompact(r.value)}`)}
							{@render detail("Freq", r.frequency !== null ? `${fmtNum(r.frequency)}x` : "-")}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</Card>
