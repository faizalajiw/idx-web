<script lang="ts">
	import { page } from "$app/state";
	import FlowWorkspace from "#lib/components/FlowWorkspace.svelte";

	// `/flow` tanpa kode = pemilih + empty state; `/flow?code=BBRI` = workspace emiten.
	const code = $derived((page.url.searchParams.get("code") ?? "").trim().toUpperCase() || null);
</script>

<FlowWorkspace {code} />
