<script lang="ts">
	import { Radar } from '@lucide/svelte';
	import { page } from '$app/state';
	import StubPage from '#lib/components/StubPage.svelte';

	const code = $derived((page.params.code ?? '').toUpperCase());
</script>

<StubPage title="Radar" accent={code} icon={Radar} />
