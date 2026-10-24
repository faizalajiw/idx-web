<script lang="ts">
	import type { LayoutProps } from './$types';
	import CommandPalette from '#lib/components/CommandPalette.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import MobileNav from '#lib/components/MobileNav.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import Topbar from '#lib/components/Topbar.svelte';
	import '../app.css';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Market Labs</title>
	<meta
		name="description"
		content="Near-real-time Indonesia Stock Exchange market data, analytics & quant research"
	/>
</svelte:head>

<MobileNav />
<Sidebar />
<div class="app-main">
	<Topbar />
	{@render children()}
	<Footer />
</div>
<CommandPalette />
