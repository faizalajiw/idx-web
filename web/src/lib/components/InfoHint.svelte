<script lang="ts">
	import { Info } from "@lucide/svelte";

	let {
		text,
		label = "Penjelasan"
	}: {
		text: string;
		label?: string;
	} = $props();

	let open = $state(false);
	let geser = $state(0);
	let tip = $state<HTMLSpanElement | null>(null);

	// Tooltip 240px yang dipusatkan pada ikon dekat tepi layar bisa keluar
	// viewport dan membuat halaman menggulir mendatar. Ukur setelah tampil, lalu
	// geser seperlunya supaya seluruh teksnya tetap di dalam layar.
	$effect(() => {
		if (!open) {
			geser = 0;
			return;
		}
		const el = tip;
		if (!el) return;
		const tepi = 8;
		const r = el.getBoundingClientRect();
		if (r.left < tepi) geser = tepi - r.left;
		else if (r.right > window.innerWidth - tepi) geser = window.innerWidth - tepi - r.right;
		else geser = 0;
	});
</script>

<span class="relative inline-flex items-center">
	<button
		type="button"
		aria-label={label}
		class="text-muted hover:text-[var(--accent-text)] focus:text-[var(--accent-text)] inline-flex cursor-help items-center outline-none transition-colors"
		onmouseenter={() => (open = true)}
		onmouseleave={() => (open = false)}
		onfocus={() => (open = true)}
		onblur={() => (open = false)}
		onclick={(e) => {
			e.preventDefault();
			// Selalu buka, jangan balik-tutup: sentuhan memicu focus lalu click
			// sekaligus, jadi toggle menutup tooltip yang baru saja dibuka dan
			// di layar sentuh (tanpa hover) penjelasannya jadi tak bisa dijangkau.
			open = true;
		}}
	>
		<Info size={13} strokeWidth={2.5} />
	</button>
	{#if open}
		<span
			bind:this={tip}
			role="tooltip"
			style="transform: translateX(calc(-50% + {geser}px))"
			class="animate-in fade-in absolute top-full left-1/2 z-50 mt-1.5 w-60 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs leading-relaxed font-normal tracking-normal text-[var(--fg)] shadow-lg"
		>
			{text}
		</span>
	{/if}
</span>
