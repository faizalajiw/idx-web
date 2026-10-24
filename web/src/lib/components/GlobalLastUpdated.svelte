<script lang="ts">
	import { useMarketOverview } from "#lib/hooks.svelte.ts";
	import LastUpdated from "#lib/components/LastUpdated.svelte";

	const overview = useMarketOverview();
</script>

<!--
	Indikator kesegaran data global: kapan market overview terakhir ter-fetch.
	Ditampilkan di Topbar supaya user selalu tahu data ini fresh atau tidak.
-->
{#if overview.isLoading}
	<span
		class="items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] inline-flex"
	>
		<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]/60"></span>
		Memuat data…
	</span>
{:else if overview.error || !overview.data}
	<span
		class="items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] inline-flex"
	>
		<span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/70"></span>
		Data belum diperbarui
	</span>
{:else}
	<span
		class="items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] inline-flex"
	>
		<span class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]/70"></span>
		<LastUpdated dep={overview.data} />
	</span>
{/if}
