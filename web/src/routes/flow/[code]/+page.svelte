<script lang="ts">
	import { page } from '$app/state';
	import FlowWorkspace from '#lib/components/FlowWorkspace.svelte';

	// `/flow/[code]` deep-link emiten, mis. /flow/BBRI.
	const code = $derived((page.params.code ?? '').toUpperCase());
</script>

<svelte:head>
	<title>Aliran Dana Emiten · Market Labs</title>
</svelte:head>

<FlowWorkspace code={code || null} />
