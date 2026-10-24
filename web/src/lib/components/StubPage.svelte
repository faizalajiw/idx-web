<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';

	let {
		title,
		accent = '',
		icon: Icon,
		note = 'Isi halaman ini sedang diporting dari Next ke SvelteKit.'
	}: { title: string; accent?: string; icon: LucideIcon; note?: string } = $props();

	const heading = $derived(accent ? `${title} ${accent}` : title);
</script>

<svelte:head>
	<title>{heading} · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
		<Icon size={26} class="text-accent" aria-hidden="true" />
		{title}
		{#if accent}<span class="gradient-text">{accent}</span>{/if}
	</h1>
	<div class="card text-muted p-5 text-sm">{note}</div>
</main>
