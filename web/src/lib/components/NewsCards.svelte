<script lang="ts">
	import { ArrowUpRight, X } from '@lucide/svelte';
	import { useLatestNews } from '#lib/hooks.svelte.ts';
	import type { NewsItem } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	const PREVIEW_COUNT = 3;

	function relTime(iso: string): string {
		const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
		if (Number.isNaN(diff)) return '';
		if (diff < 1) return 'baru saja';
		if (diff < 60) return `${Math.floor(diff)} menit lalu`;
		if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
		return `${Math.floor(diff / 1440)} hari lalu`;
	}

	const news = useLatestNews();
	const data = $derived(news.data);
	const error = $derived(news.error);
	const isLoading = $derived(news.isLoading);

	const pesanError = $derived(error instanceof Error ? error.message : String(error));

	let showAll = $state(false);
	const modalOpen = $derived(showAll && !!data && !error && data.items.length > PREVIEW_COUNT);

	// Modal: kunci scroll halaman dan tutup dengan Escape, seperti versi Next.
	$effect(() => {
		if (!modalOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') showAll = false;
		};
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			document.body.style.overflow = prev;
		};
	});
</script>

{#snippet newsList(items: NewsItem[])}
	<ol class="space-y-2">
		{#each items as n, i (n.url)}
			<li>
				<a
					href={n.url}
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-white/5"
				>
					<span
						class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold"
					>
						{i + 1}
					</span>
					<span class="min-w-0 flex-1">
						<span class="line-clamp-2 text-sm font-medium group-hover:underline">{n.title}</span>
						<span class="mt-1 flex flex-wrap items-center gap-x-2 text-xs opacity-60">
							<span>{n.source}</span>
							<span>·</span>
							<span>{relTime(n.published_at)}</span>
						</span>
					</span>
				</a>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet newsModal(items: NewsItem[])}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Semua berita"
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
	>
		<button
			type="button"
			tabindex="-1"
			aria-label="Tutup"
			onclick={() => (showAll = false)}
			class="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
		></button>
		<div
			class="relative flex max-h-[80vh] w-[min(600px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl animate-[popIn_180ms_ease-out]"
		>
			<header
				class="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4"
			>
				<div>
					<h3 class="text-base font-semibold tracking-tight">Semua Berita</h3>
					<p class="mt-0.5 text-xs text-[var(--fg-muted)]">
						{items.length} berita · 7 hari terakhir · Stockbit Snips
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showAll = false)}
					aria-label="Tutup"
					class="flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[var(--bg-elev)] hover:text-[var(--fg)]"
				>
					<X size={16} aria-hidden="true" />
				</button>
			</header>
			<ul class="divide-y divide-[var(--border)] overflow-y-auto p-2">
				{#each items as n, i (n.url)}
					<li>
						<a
							href={n.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-start gap-4 rounded-xl px-3 py-3 transition hover:bg-[var(--bg-elev)]"
						>
							<span
								class="mt-0.5 w-5 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--fg-muted)]"
							>
								{i + 1}
							</span>
							<span class="min-w-0 flex-1">
								<span
									class="line-clamp-2 text-sm leading-snug font-medium transition group-hover:text-[var(--accent-text)]"
								>
									{n.title}
								</span>
								<span class="mt-1.5 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
									<span class="font-medium">{n.source}</span>
									<span aria-hidden="true">•</span>
									<span>{relTime(n.published_at)}</span>
								</span>
							</span>
							<ArrowUpRight
								size={14}
								class="mt-1 shrink-0 text-[var(--fg-muted)] opacity-0 transition group-hover:opacity-100"
								aria-hidden="true"
							/>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/snippet}

<Card
	title="MarLabs News"
	subtitle="Berita dan riset terbaru dari Stockbit Snips 7 hari terakhir"
	info="Judul terbaru dari snips.stockbit.com, diurutkan dari yang paling baru. Data diambil otomatis tiap 15 menit. Klik judul untuk membuka sumber asli."
>
	{#if error}
		<ErrorState message={pesanError} onRetry={() => news.mutate()} />
	{:else if isLoading || !data}
		<div class="space-y-3">
			{#each Array.from({ length: PREVIEW_COUNT }) as _, i (i)}
				<Skeleton class="h-14 w-full" />
			{/each}
		</div>
	{:else if data.items.length === 0}
		<EmptyState message="Belum ada berita." />
	{:else}
		{@const preview = data.items.slice(0, PREVIEW_COUNT)}
		{@render newsList(preview)}
		{#if data.items.length > PREVIEW_COUNT}
			<button
				type="button"
				onclick={() => (showAll = true)}
				class="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs font-medium opacity-80 transition hover:bg-white/5 hover:opacity-100"
			>
				Lihat semua ({data.items.length})
			</button>
		{/if}
		{#if modalOpen}
			{@render newsModal(data.items)}
		{/if}
	{/if}
</Card>
