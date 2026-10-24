<script lang="ts">
	import { page } from "$app/state";
	import DecisionWorkspace from "#lib/components/DecisionWorkspace.svelte";

	const code = $derived((page.params.code ?? "").toUpperCase());
</script>

<svelte:head>
	<title>Keputusan {code} · Market Labs</title>
</svelte:head>

<!-- /keputusan/[code] — deep-link emiten, mis. /keputusan/BBRI. -->
<DecisionWorkspace code={code || null} />
