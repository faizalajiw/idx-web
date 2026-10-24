<script lang="ts">
	import { LayoutGrid } from '@lucide/svelte';
	import { useSectors } from '#lib/hooks.svelte.ts';
	import { fmtCompact, fmtPct } from '#lib/format.ts';
	import Card from '#lib/components/Card.svelte';
	import SectorRotationTable from '#lib/components/SectorRotationTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import RegimeBanner from '#lib/components/RegimeBanner.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';

	function heatColor(pct: number | null): string {
		if (pct === null) return 'var(--bg-elev)';
		const clamped = Math.max(-3, Math.min(3, pct));
		const share = (10 + (Math.abs(clamped) / 3) * 40).toFixed(0);
		const base = clamped >= 0 ? 'var(--chart-net-up)' : 'var(--chart-net-down)';
		return `color-mix(in srgb, ${base} ${share}%, transparent)`;
	}

	const sectors = useSectors();
	const rows = $derived(sectors.data?.sectors ?? []);
</script>

<svelte:head>
	<title>Analisis Sektor · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<LayoutGrid size={26} class="text-accent" aria-hidden="true" />
			Analisis <span class="gradient-text">Sektor</span>
		</h1>
		<p class="text-muted mt-0.5 flex items-center gap-2 text-sm">
			Rata-rata pergerakan, nilai transaksi, dan arus asing per sektor ·&nbsp;
			{sectors.data?.date ?? '-'}
			<LastUpdated sessionDate={sectors.data?.date} />
		</p>
	</div>

	<RegimeBanner />

	<SectorRotationTable />

	<Card
		title="Peta Sektor"
		subtitle="Diurutkan dari sektor terkuat"
		info="Perbandingan performa antar sektor (perbankan, energi, konsumer, dll). Membantu melihat 'sektor mana yang lagi panas' — sering lebih penting daripada memilih satu saham saja."
	>
		{#if sectors.error}
			<ErrorState
				message="Gagal memuat sektor: {sectors.error instanceof Error
					? sectors.error.message
					: String(sectors.error)}"
			/>
		{:else if sectors.isLoading}
			<Skeleton class="h-96" />
		{:else if rows.length === 0}
			<EmptyState />
		{:else}
			<div class="overflow-x-auto">
				<table class="data-table">
					<thead>
						<tr>
							<th class="text-left">Sektor</th>
							<th class="text-right">Rata-rata %</th>
							<th class="text-center">Breadth</th>
							<th class="text-right">Value</th>
							<th class="text-right">Foreign Net</th>
							<th class="text-left">Top Stock</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as s (s.sector)}
							<tr>
								<td>
									<div
										class="-mx-2 rounded-lg px-2 py-1.5"
										style="background: {heatColor(s.avg_percent)}"
									>
										<span class="font-semibold">{s.sector}</span>
										<span class="text-muted ml-2 text-xs">{s.stock_count} saham</span>
									</div>
								</td>
								<td
									class="text-right font-bold tabular-nums {(s.avg_percent ?? 0) >= 0
										? 'text-up'
										: 'text-down'}"
								>
									{fmtPct(s.avg_percent)}
								</td>
								<td>
									<div class="flex h-2 overflow-hidden rounded-full" style="min-width: 90px">
										<div class="bg-[var(--up)]" style="flex-grow: {s.gainers + 0.001}"></div>
										<div class="bg-[var(--down)]" style="flex-grow: {s.losers + 0.001}"></div>
									</div>
									<span class="text-muted text-xs">{s.gainers}▲ / {s.losers}▼</span>
								</td>
								<td class="text-right tabular-nums">{fmtCompact(s.total_value)}</td>
								<td
									class="text-right tabular-nums {(s.total_foreign_net ?? 0) >= 0
										? 'text-up'
										: 'text-down'}"
								>
									{fmtCompact(s.total_foreign_net)}
								</td>
								<td>
									{#if s.top_stock}
										<a href="/stock/{s.top_stock.code}" class="font-medium hover:underline">
											{s.top_stock.code}
											<span class="text-up text-xs">{fmtPct(s.top_stock.percent)}</span>
										</a>
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>

	<p class="text-muted text-xs leading-relaxed">
		Catatan: klasifikasi sektor memakai mapping kurasi internal (gaya IDX-IC) untuk emiten likuid;
		emiten di luar mapping masuk kategori “Lainnya”.
	</p>
</main>
