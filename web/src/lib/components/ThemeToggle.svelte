<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';

	type Theme = 'dark' | 'light';

	const KEY = 'ml-theme';

	let theme = $state<Theme>('dark');

	// Ikon mengikuti kelas yang sudah dipasang skrip inline di app.html.
	onMount(() => {
		theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
	});

	function toggle() {
		const next: Theme = theme === 'dark' ? 'light' : 'dark';
		const root = document.documentElement;
		root.classList.toggle('dark', next === 'dark');
		root.classList.toggle('light', next === 'light');
		try {
			localStorage.setItem(KEY, next);
		} catch {}
		theme = next;
	}

	const label = $derived(theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
</script>

<button type="button" onclick={toggle} class="btn btn-ghost" aria-label={label} title={label}>
	{#if theme === 'dark'}
		<Sun size={18} aria-hidden="true" />
	{:else}
		<Moon size={18} aria-hidden="true" />
	{/if}
</button>
