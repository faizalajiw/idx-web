<script lang="ts">
	import Brand from './Brand.svelte';
	import GlobalLastUpdated from './GlobalLastUpdated.svelte';
	import MarketBadge from './MarketBadge.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<header
	class="app-topbar glass-strong sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] px-4 sm:px-6"
>
	<span class="topbar-brand lg:hidden">
		<Brand />
	</span>
	<div class="ml-auto flex items-center gap-2">
		<GlobalLastUpdated />
		<ThemeToggle />
		<MarketBadge />
	</div>
</header>
