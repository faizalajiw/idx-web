<script lang="ts">
	import { ArrowLeftRight } from '@lucide/svelte';
	import { page } from '$app/state';
	import StubPage from '#lib/components/StubPage.svelte';

	const code = $derived((page.params.code ?? '').toUpperCase());
</script>

<StubPage title="Aliran Dana" accent={code} icon={ArrowLeftRight} />
