<script lang="ts">
	import { useStockBrokers } from '#lib/hooks.svelte.ts';
	import { fmtCompact } from '#lib/format.ts';
	import type { BrokerRow } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	let { code }: { code: string } = $props();

	const brokers = useStockBrokers(() => code);
	const data = $derived(brokers.data);
	const error = $derived(brokers.error);
	const isLoading = $derived(brokers.isLoading);

	const subtitle = $derived(data?.date ? `EOD ${data.date}` : 'Estimasi dari data agregat');
	const kosong = $derived(!data || (data.top_buyers.length === 0 && data.top_sellers.length === 0));
</script>

{#snippet side(title: string, rows: BrokerRow[], kind: 'buy' | 'sell')}
	{@const tone = kind === 'buy' ? 'text-up' : 'text-down'}
	<div>
		<p class="mb-2 text-xs font-semibold {tone}">{title}</p>
		{#if rows.length === 0}
			<EmptyState />
		{:else}
			<ul class="space-y-1.5">
				{#each rows as r (r.broker)}
					<li class="flex items-center justify-between gap-3 text-sm">
						<span class="truncate font-medium" title={r.broker}>{r.broker}</span>
						<span class="shrink-0 font-semibold tabular-nums {tone}">
							{fmtCompact(kind === 'buy' ? r.buy_value : r.sell_value)}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/snippet}

<Card
	title="Aliran Dana (proxy)"
	{subtitle}
	info="Perkiraan pihak mana yang paling banyak membeli & menjual saham ini. Disebut 'proxy' karena diperkirakan dari data agregat, bukan angka broker resmi — jadikan gambaran kasar saja."
>
	{#if error}
		<ErrorState
			message="Gagal memuat aliran dana: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<Skeleton class="h-40" />
	{:else if kosong}
		<EmptyState message="Belum ada data aliran dana untuk emiten ini." />
	{:else}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
			{@render side('Sisi Beli', data.top_buyers, 'buy')}
			{@render side('Sisi Jual', data.top_sellers, 'sell')}
		</div>
		<p class="text-muted mt-3 text-xs leading-relaxed">
			Data broker tidak tersedia dari sumber gratis. Angka ini
			<span class="text-warn font-medium">estimasi</span>: agregat asing + proxy domestik dari
			imbalance bid/offer intraday (× harga close).
		</p>
	{/if}
</Card>
