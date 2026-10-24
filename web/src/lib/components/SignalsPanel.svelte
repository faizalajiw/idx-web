<script lang="ts">
	import { useSignals } from '#lib/hooks.svelte.ts';
	import { fmtNum, fmtPct } from '#lib/format.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';

	type SignalFilter = 'BUY' | 'SELL' | 'HOLD';

	let {
		codes,
		onSelect,
		selected = null
	}: {
		codes?: string;
		onSelect?: (code: string) => void;
		selected?: string | null;
	} = $props();

	function badgeClass(sig: string): string {
		if (sig === 'BUY') return 'badge badge-buy';
		if (sig === 'SELL') return 'badge badge-sell';
		return 'badge badge-hold';
	}

	const signals = useSignals(() => codes);
	const data = $derived(signals.data);
	const error = $derived(signals.error);
	const isLoading = $derived(signals.isLoading);

	let filter = $state<SignalFilter | null>(null);

	function toggleFilter(f: SignalFilter) {
		filter = filter === f ? null : f;
	}

	const shown = $derived(data && filter ? data.filter((s) => s.signal === filter) : data);

	const tallyItems = $derived.by(() => {
		const counts = { BUY: 0, SELL: 0, HOLD: 0 };
		for (const s of data ?? []) {
			if (s.signal === 'BUY') counts.BUY++;
			else if (s.signal === 'SELL') counts.SELL++;
			else counts.HOLD++;
		}
		return [
			{ label: 'BUY' as SignalFilter, value: counts.BUY, dot: 'bg-[var(--up)]', text: 'text-up' },
			{
				label: 'HOLD' as SignalFilter,
				value: counts.HOLD,
				dot: 'bg-[var(--muted)]',
				text: 'text-muted'
			},
			{
				label: 'SELL' as SignalFilter,
				value: counts.SELL,
				dot: 'bg-[var(--down)]',
				text: 'text-down'
			}
		];
	});

	const pesanError = $derived(
		`Gagal memuat signals: ${error instanceof Error ? error.message : String(error)}`
	);
</script>

{#snippet metric(label: string, value: string, tone?: 'up' | 'down')}
	<div class="flex flex-col">
		<span class="text-muted text-[10px] tracking-wide uppercase">{label}</span>
		<span
			class="text-xs tabular-nums {tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : ''}"
		>
			{value}
		</span>
	</div>
{/snippet}

{#snippet right()}
	<div class="ml-auto flex flex-wrap items-center justify-end gap-2">
		{#if data && data.length > 0}
			<div class="flex items-center gap-1.5">
				{#each tallyItems as it (it.label)}
					{@const isActive = filter === it.label}
					<button
						type="button"
						onclick={() => toggleFilter(it.label)}
						aria-pressed={isActive}
						title={isActive ? 'Tampilkan semua' : `Filter ${it.label} saja`}
						class="flex items-center gap-1.5 rounded-full border bg-white/[0.02] px-2.5 py-1 transition-colors {isActive
							? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
							: 'border-[var(--border)] hover:border-[var(--fg)]/40'}"
					>
						<span class="h-1.5 w-1.5 rounded-full {it.dot}"></span>
						<span class="text-muted text-[10px] font-medium tracking-wide uppercase">
							{it.label}
						</span>
						<span class="text-xs font-semibold tabular-nums {it.text}">{it.value}</span>
					</button>
				{/each}
			</div>
		{/if}
		<LastUpdated dep={data} sessionDate={data?.[0]?.as_of} updatedAt={data?.[0]?.generated_at} />
	</div>
{/snippet}

<Card
	title="Trading Signals"
	subtitle="SMA20/50 + RSI(14) rule-based"
	info="Sinyal beli/jual/tahan otomatis berdasarkan rumus teknikal (rata-rata harga & momentum). Ini alat bantu, BUKAN ajakan beli. Selalu cek konteks lain dan jangan ikut buta."
	{right}
>
	{#if error}
		<ErrorState message={pesanError} />
	{:else if isLoading || !data}
		<div class="grid grid-cols-1 gap-2">
			{#each Array.from({ length: 6 }) as _, i (i)}
				<Skeleton class="h-[76px]" />
			{/each}
		</div>
	{:else if data.length === 0}
		<EmptyState />
	{:else if shown && shown.length === 0}
		<EmptyState message={`Tidak ada emiten dengan sinyal ${filter}.`} />
	{:else}
		<div class="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1">
			{#each shown ?? [] as s (s.code)}
				{@const up = (s.pct ?? 0) >= 0}
				<button
					type="button"
					onclick={() => onSelect?.(s.code)}
					class="flex flex-col gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-white/[0.04] {selected ===
					s.code
						? 'ring-1 ring-[var(--accent)]'
						: ''}"
				>
					<div class="flex items-center gap-2">
						<span
							class="h-1.5 w-1.5 shrink-0 rounded-full {s.trend_up
								? 'bg-[var(--up)]'
								: 'bg-[var(--down)]'}"
						></span>
						<TickerLogo code={s.code} size={22} />
						<span class="text-sm font-semibold">{s.code}</span>
						<span class="{badgeClass(s.signal)} shrink-0">{s.signal}</span>
						{#if s.div_adjusted}
							<span
								title={`SELL mentah dibatalkan: harga turun mekanis ex-dividend (Rp ${s.div_cash ?? 0}/saham) — bukan tekanan jual`}
								class="shrink-0 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase text-[var(--accent-text)]"
							>
								ex-div
							</span>
						{/if}
						<span class="ml-auto text-sm font-semibold tabular-nums">{fmtNum(s.close)}</span>
						<span class="text-xs tabular-nums {up ? 'text-up' : 'text-down'}">
							{fmtPct(s.pct)}
						</span>
					</div>
					<div class="grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-2">
						{@render metric(
							'RSI',
							s.rsi !== null ? s.rsi.toFixed(1) : '-',
							s.rsi !== null ? (s.rsi >= 70 ? 'down' : s.rsi <= 30 ? 'up' : undefined) : undefined
						)}
						{@render metric('SMA20', fmtNum(s.sma20))}
						{@render metric(
							'MACD',
							s.macd !== null ? s.macd.toFixed(2) : '-',
							s.macd !== null ? (s.macd >= 0 ? 'up' : 'down') : undefined
						)}
						{@render metric('Trend', s.trend_up ? 'Naik' : 'Turun', s.trend_up ? 'up' : 'down')}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</Card>
