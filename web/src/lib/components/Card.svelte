<script lang="ts">
	import type { Snippet } from "svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";

	let {
		title,
		subtitle,
		info,
		right,
		children,
		class: className = "",
		hover = false
	}: {
		title?: string | Snippet;
		subtitle?: string;
		info?: string;
		right?: Snippet;
		children: Snippet;
		class?: string;
		hover?: boolean;
	} = $props();
</script>

<section class="card min-w-0 p-4 sm:p-5 {hover ? 'card-hover' : ''} {className}">
	{#if title || right}
		<header class="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
			<div class="min-w-0">
				{#if title}
					<h2 class="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
						{#if typeof title === "string"}
							{title}
						{:else}
							{@render title()}
						{/if}
						{#if info}<InfoHint text={info} />{/if}
					</h2>
				{/if}
				{#if subtitle}<p class="text-muted mt-0.5 text-xs">{subtitle}</p>{/if}
			</div>
			{#if right}{@render right()}{/if}
		</header>
	{/if}
	{@render children()}
</section>
