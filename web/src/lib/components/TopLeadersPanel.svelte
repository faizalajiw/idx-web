<script lang="ts">
	import { useMarketLeaders } from "#lib/hooks.svelte.ts";
	import { fmtNum, fmtPct, fmtCompact } from "#lib/format.ts";
	import type { LeaderRow, MarketLeaders } from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	type Metric = "volume" | "value" | "frequency";

	const META: Record<
		Metric,
		{ title: string; subtitle: string; info: string; unit: (r: LeaderRow) => string }
	> = {
		volume: {
			title: "Top Volume",
			subtitle: "Lembar diperdagangkan terbanyak",
			info: "Emiten dengan jumlah lembar saham (volume) diperdagangkan terbanyak. Saat jam bursa memakai data realtime; di luar jam pakai data akhir sesi (EOD) terakhir.",
			unit: (r) => fmtCompact(r.volume)
		},
		value: {
			title: "Top Value",
			subtitle: "Nilai transaksi terbesar (Rp)",
			info: "Emiten dengan nilai transaksi (rupiah) terbesar. Saat jam bursa memakai data realtime; di luar jam pakai data akhir sesi (EOD) terakhir.",
			unit: (r) => `Rp ${fmtCompact(r.value)}`
		},
		frequency: {
			title: "Top Frequency",
			subtitle: "Frekuensi transaksi terbanyak",
			info: "Emiten dengan jumlah transaksi (frekuensi) terbanyak. Frekuensi tidak tersedia realtime, jadi panel ini selalu memakai data akhir sesi (EOD) terakhir.",
			unit: (r) => `${fmtNum(r.frequency)}x`
		}
	};

	let {
		metric,
		onSelect,
		selected = null
	}: {
		metric: Metric;
		onSelect?: (code: string) => void;
		selected?: string | null;
	} = $props();

	const leaders = useMarketLeaders(() => metric);
	const data = $derived(leaders.data);
	const error = $derived(leaders.error);
	const isLoading = $derived(leaders.isLoading);
	const meta = $derived(META[metric]);

	let open = $state<Record<string, boolean>>({});

	const pesanError = $derived(
		`Gagal memuat ${meta.title}: ${error instanceof Error ? error.message : String(error)}`
	);
</script>

{#snippet sourceBadge(d: MarketLeaders)}
	{@const live = d.source === "intraday"}
	<span
		title={live
			? "Ranking realtime dari data intraday"
			: "Ranking dari data akhir sesi (EOD) terakhir"}
		class="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase {live
			? 'border-[var(--up)]/40 bg-[var(--up)]/10 text-up'
			: 'border-[var(--border)] text-muted'}"
	>
		{live ? "Live" : "EOD"}
	</span>
{/snippet}

{#snippet detail(label: string, value: string)}
	<div class="flex flex-col">
		<span class="text-muted text-[10px] tracking-wide uppercase">{label}</span>
		<span class="text-xs tabular-nums">{value}</span>
	</div>
{/snippet}

{#snippet right()}
	<div class="flex items-center gap-2">
		{#if data}
			{@render sourceBadge(data)}
		{/if}
		<LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />
	</div>
{/snippet}

<Card title={meta.title} subtitle={meta.subtitle} info={meta.info} right={right}>
	{#if error}
		<ErrorState message={pesanError} />
	{:else if isLoading || !data}
		<div class="grid grid-cols-1 gap-2">
			{#each Array.from({ length: 5 }) as _, i (i)}
				<Skeleton class="h-[46px]" />
			{/each}
		</div>
	{:else if data.rows.length === 0}
		<EmptyState message="Belum ada data ranking." />
	{:else}
		<div class="grid grid-cols-1 gap-2">
			{#each data.rows as r, i (r.code)}
				{@const up = (r.percent ?? 0) >= 0}
				<div
					class="rounded-lg border border-[var(--border)] transition-colors hover:bg-white/[0.04] {selected ===
					r.code
						? 'ring-1 ring-[var(--accent)]'
						: ''}"
				>
					<button
						type="button"
						onclick={() => {
							open[r.code] = !open[r.code];
							onSelect?.(r.code);
						}}
						aria-expanded={open[r.code] ?? false}
						class="flex w-full items-center gap-2.5 px-3 py-2 text-left"
					>
						<span class="text-muted w-4 shrink-0 text-center text-xs font-semibold tabular-nums">
							{i + 1}
						</span>
						<TickerLogo code={r.code} size={22} />
						<div class="flex min-w-0 flex-col">
							<span class="text-sm font-semibold">{r.code}</span>
							{#if r.name}
								<span class="text-muted truncate text-[10px]">{r.name}</span>
							{/if}
						</div>
						<div class="ml-auto flex flex-col items-end">
							<span class="text-sm font-semibold tabular-nums">{meta.unit(r)}</span>
							<span class="text-[11px] tabular-nums {up ? 'text-up' : 'text-down'}">
								{fmtPct(r.percent)}
							</span>
						</div>
					</button>
					{#if open[r.code]}
						<div class="grid grid-cols-4 gap-2 border-t border-[var(--border)] px-3 py-2">
							{@render detail("Harga", fmtNum(r.close))}
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
