<script lang="ts">
	import {
		ChartColumn,
		Circle,
		Droplet,
		Mountain,
		Rocket,
		TrendingDown,
		TrendingUp,
		type LucideIcon
	} from '@lucide/svelte';
	import { useStockEvents } from '#lib/hooks.svelte.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	const EVENT_LABEL: Record<string, { label: string; icon: LucideIcon }> = {
		jump_up: { label: 'Jump Up', icon: Rocket },
		jump_down: { label: 'Jump Down', icon: Droplet },
		vol_spike: { label: 'Volume Spike', icon: ChartColumn },
		near_high: { label: 'Dekat Puncak 63h', icon: Mountain },
		ma_cross_up: { label: 'SMA20↑50', icon: TrendingUp },
		ma_cross_down: { label: 'SMA20↓50', icon: TrendingDown }
	};

	const pct = (v: number | null, digits = 1) =>
		v === null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;

	function tone(v: number | null): string {
		if (v === null) return 'text-muted';
		return v >= 0 ? 'text-up' : 'text-down';
	}

	let { code }: { code: string } = $props();

	const events = useStockEvents(() => code);
	const data = $derived(events.data);
	const error = $derived(events.error);
	const isLoading = $derived(events.isLoading);
</script>

<!--
	Event study satu emiten: seberapa sering event terjadi, median forward return
	21 hari emiten itu sendiri, abnormal vs pasar, dibandingkan baseline pasar.
-->
<Card
	title="Event Study"
	subtitle="Median return 21 hari bursa setelah event (entry T+1), vs baseline seluruh pasar"
	info="Melihat rata-rata pergerakan harga saham SETELAH kejadian tertentu (mis. lonjakan volume) di masa lalu. Menjawab: 'kalau pola ini muncul, biasanya harga ke mana?' — berdasar sejarah, bukan ramalan."
>
	{#if error}
		<ErrorState message="Gagal memuat event study." />
	{:else if isLoading || !data}
		<Skeleton class="h-48 w-full" />
	{:else}
		<div class="space-y-3">
			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th class="text-left">Event</th>
							<th class="text-right">Kali</th>
							<th class="text-right">Terakhir</th>
							<th class="text-right" title="Median forward return 21 hari emiten ini">
								Median 21h
							</th>
							<th class="text-right" title="Median emiten dikurangi median pasar">Abnormal</th>
							<th class="text-right" title="Hit-rate semua emiten (baseline pasar)"> Pasar hit </th>
						</tr>
					</thead>
					<tbody>
						{#each data.events as e (e.event)}
							{@const meta = EVENT_LABEL[e.event] ?? { label: e.event, icon: Circle }}
							{@const EventIcon = meta.icon}
							{@const noData = e.my_count === 0}
							<tr>
								<td>
									<EventIcon size={13} class="mr-1 inline align-[-2px]" aria-hidden="true" />
									{meta.label}
								</td>
								<td class="text-right tabular-nums {noData ? 'text-muted' : 'font-semibold'}">
									{e.my_count}
								</td>
								<td class="text-muted text-right tabular-nums">{e.my_last_date ?? '-'}</td>
								<td class="text-right tabular-nums {noData ? '' : tone(e.my_median_fwd)}">
									{noData ? '-' : pct(e.my_median_fwd)}
								</td>
								<td class="text-right tabular-nums {noData ? '' : tone(e.my_median_abnormal)}">
									{noData ? '-' : pct(e.my_median_abnormal)}
								</td>
								<td class="text-muted text-right tabular-nums">
									{e.market_hit_rate !== null
										? `${(e.market_hit_rate * 100).toFixed(0)}% (${e.market_count})`
										: '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.events.every((e) => e.my_count === 0)}
				<EmptyState message="Belum ada event pada emiten ini dalam cakupan data." />
			{/if}
			<p class="text-muted text-[11px] leading-snug">
				Baseline pasar = seluruh emiten dengan event serupa (jumlah di kolom kanan). Abnormal =
				median emiten dikurangi median pasar. Angka historis-indikatif, bukan prediksi; event
				dihitung point-in-time dengan eksekusi T+1.
			</p>
		</div>
	{/if}
</Card>
