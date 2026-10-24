<script lang="ts">
	import InfoHint from '#lib/components/InfoHint.svelte';
	import type { Tone } from '#lib/backtest/constants.ts';
	import { toneClass } from '#lib/backtest/format.ts';

	let { label, value, tone, hint }: { label: string; value: string; tone?: Tone; hint?: string } =
		$props();
</script>

<div class="card p-4">
	<p class="text-muted flex items-center gap-1 text-xs">
		{label}
		{#if hint}<InfoHint text={hint} />{/if}
	</p>
	<p class="mt-1 text-xl font-bold tabular-nums {toneClass(tone)}">{value}</p>
</div>
