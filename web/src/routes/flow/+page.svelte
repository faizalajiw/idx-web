<script lang="ts">
	import FlowWorkspace from "#lib/components/FlowWorkspace.svelte";

	// `/flow` tanpa emiten = pemilih + empty state. Deep-link memakai
	// `/flow/[code]`, sama seperti Next (`/flow?code=` tidak didukung).
</script>

<FlowWorkspace code={null} />
