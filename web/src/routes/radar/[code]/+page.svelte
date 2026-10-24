<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import SmartMoneyBanner from '#lib/components/SmartMoneyBanner.svelte';
	import SmartMoneyTrackRecordCard from '#lib/components/SmartMoneyTrackRecordCard.svelte';

	// `/radar/[code]` deep-link dari Radar Smart Money, mis. /radar/BBRI.
	const code = $derived((page.params.code ?? '').toUpperCase());
</script>

<svelte:head>
	<title>Radar Smart Money{code ? ` ${code}` : ''} · Market Labs</title>
</svelte:head>

{#if !code}
	<main class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
		<p class="text-muted">Kode emiten tidak valid.</p>
	</main>
{:else}
	<main class="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
		<div class="flex items-center justify-between">
			<a
				href="/radar"
				class="text-accent hover:underline inline-flex items-center gap-1.5 text-sm font-medium"
			>
				<ArrowLeft size={15} aria-hidden="true" />
				Radar Smart Money
			</a>
			<div class="text-muted flex items-center gap-1.5 text-xs">
				<a href="/stock/{code}" class="hover:underline">Detail teknikal</a>
				<span>/</span>
				<a href="/flow/{code}" class="hover:underline">Arus asing</a>
			</div>
		</div>

		<SmartMoneyBanner {code} />

		<SmartMoneyTrackRecordCard />
	</main>
{/if}
