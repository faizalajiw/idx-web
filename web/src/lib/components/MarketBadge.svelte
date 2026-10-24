<script lang="ts">
	import { onMount } from 'svelte';
	import { marketStatus, type MarketState } from '#lib/marketStatus.ts';

	const REFRESH = 30_000;

	let state = $state<MarketState | null>(null);

	// Dihitung setelah mount supaya batas menit tidak memicu kedipan saat muat.
	onMount(() => {
		state = marketStatus();
		const id = setInterval(() => (state = marketStatus()), REFRESH);
		return () => clearInterval(id);
	});

	function badgeClass(status: MarketState['status']): string {
		if (status === 'OPEN') return 'badge badge-buy';
		if (status === 'PRE') return 'badge badge-pre';
		return 'badge badge-hold';
	}
</script>

{#if !state}
	<span class="badge badge-hold">—</span>
{:else}
	<span class={badgeClass(state.status)} title={state.detail}>
		<span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current"></span>
		{state.label} · {state.detail}
	</span>
{/if}
