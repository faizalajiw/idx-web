<script lang="ts">
	import { BookOpenCheck, TrendingDown, TrendingUp } from "@lucide/svelte";
	import { useSmartMoneyTrackRecord } from "#lib/hooks.svelte.ts";
	import { fmtPct } from "#lib/format.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";

	const HORIZONS = [
		{ key: "fwd1", label: "Hari ini" },
		{ key: "fwd5", label: "1 minggu" },
		{ key: "fwd10", label: "2 minggu" },
		{ key: "fwd21", label: "1 bulan" }
	];

	// hit_rate adalah pecahan (0.54) -> "54%".
	function pctOf(x: number | null | undefined): string {
		return x === null || x === undefined ? "−" : `${Math.round(x * 100)}%`;
	}

	// Kepercayaan dari t-stat mean-vs-nol: |t|>=2 kuat, 1-2 sedang, <1 lemah.
	function confidence(tstat: number | null | undefined): { label: string; cls: string } {
		if (tstat === null || tstat === undefined) return { label: "−", cls: "text-muted" };
		const a = Math.abs(tstat);
		if (a >= 2) return { label: "tinggi", cls: "text-up" };
		if (a >= 1) return { label: "sedang", cls: "text-[var(--accent-text)]" };
		return { label: "lemah", cls: "text-muted" };
	}

	/**
	 * Track record pola klasik jejak smart money — "pola ini terbukti tidak?".
	 * Menjawab rasa skeptis orang awam: bukan cuma hari ini apa yang terjadi,
	 * tapi seberapa sering tiap pola bekerja di 120 sesi terakhir + beat pasar.
	 */
	let { class: className = "" }: { class?: string } = $props();

	const track = useSmartMoneyTrackRecord();
	const data = $derived(track.data);
	let horizon = $state("fwd10");
</script>

{#snippet cardTitle()}
	<BookOpenCheck size={16} aria-hidden /> Pola Klasik — Track Record
{/snippet}

{#snippet cardRight()}
	<div
		class="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5"
		role="group"
		aria-label="Horizon"
	>
		{#each HORIZONS as h (h.key)}
			<button
				type="button"
				onclick={() => (horizon = h.key)}
				class="rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors {horizon === h.key
					? 'bg-[var(--accent)] text-white'
					: 'text-muted hover:bg-white/[0.06]'}"
				aria-pressed={horizon === h.key}
			>
				{h.label}
			</button>
		{/each}
	</div>
{/snippet}

{#if track.error}
	<ErrorState
		message="Gagal memuat track record: {track.error instanceof Error
			? track.error.message
			: String(track.error)}"
	/>
{:else}
	<Card
		class={className}
		title={cardTitle}
		info="Seberapa sering tiap pola berhasil di 120 sesi terakhir. 'Berfungsi' dihitung searah pola: pola beli dihitung berhasil bila harga NAIK, pola jual bila harga TURUN. 'Alpha vs pasar' = return setelah dikurangi rata-rata pasar (beat/lose market). Alat ukur keandalan, bukan rekomendasi."
		subtitle={data
			? `${data.n_episodes} kejadian pola · ${data.history_sessions} sesi terakhir`
			: undefined}
		right={cardRight}
	>
		{#if track.isLoading || !data}
			<Skeleton class="h-56" />
		{:else if data.patterns.length === 0}
			<EmptyState message="Belum ada kejadian pola yang cukup untuk diukur." />
		{:else}
			<div class="space-y-2">
				<div
					class="text-muted grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-[var(--border)] pb-1.5 text-[10px] font-semibold tracking-wide uppercase"
				>
					<span>Pola</span>
					<span class="text-right">Berfungsi</span>
					<span class="text-right">Alpha vs pasar</span>
					<span class="text-right">Kepercayaan</span>
				</div>
				{#each data.patterns as p (p.pattern)}
					{#if p.horizons[horizon]}
						{@const h = p.horizons[horizon]}
						{@const buy = p.direction === "buy-side"}
						{@const conf = confidence(h.tstat)}
						{@const eff = h.effective_alpha}
						{@const works = h.aligned_hit_rate !== null}
						{@const rate = h.aligned_hit_rate}
						{@const effGood = eff !== null && eff > 0}
						<div
							class="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2"
							title="n={p.n} kejadian, {p.n_resolved} terealisasi di horizon ini"
						>
							<span class="flex min-w-0 items-center gap-2">
								{#if buy}
									<TrendingUp size={15} class="shrink-0 text-up" />
								{:else}
									<TrendingDown size={15} class="shrink-0 text-down" />
								{/if}
								<span class="min-w-0">
									<span class="block truncate text-sm font-semibold">{p.label}</span>
									<span class="text-muted block text-[10px] tabular-nums">{p.n}× kejadian</span>
								</span>
							</span>
							<span
								class="text-right text-sm font-bold tabular-nums {works && rate !== null
									? rate >= 0.5
										? 'text-up'
										: 'text-down'
									: 'text-muted'}"
							>
								{pctOf(rate)}
							</span>
							<span
								class="text-right text-sm font-semibold tabular-nums {eff === null
									? 'text-muted'
									: effGood
										? 'text-up'
										: 'text-down'}"
							>
								{eff === null ? "−" : fmtPct(eff)}
							</span>
							<span class="text-right text-xs font-medium {conf.cls}">{conf.label}</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</Card>
{/if}
