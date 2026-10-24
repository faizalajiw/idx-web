<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { searchStocks } from '#lib/api.ts';
	import type { StockSearchResult } from '#lib/types.ts';

	type Action = { id: string; label: string; href: string; keywords: string };

	/** Item hasil gabungan: halaman (navigasi) atau emiten (cari ticker). */
	type Item =
		| { kind: 'nav'; id: string; label: string; href: string; current: boolean; header: string | null }
		| { kind: 'stock'; id: string; code: string; name: string | null; header: string | null };

	/** Navigasi utama — sinkron dengan NAV_GROUPS di Sidebar. */
	const NAV_ACTIONS: Action[] = [
		{ id: 'home', label: 'Dashboard', href: '/', keywords: 'beranda home dashboard' },
		{ id: 'pantau', label: 'Pantau', href: '/pantau', keywords: 'pantau alert notifikasi' },
		{ id: 'screener', label: 'Screener AI', href: '/screener', keywords: 'screener filter scan cari' },
		{ id: 'rekomendasi', label: 'Rekomendasi Beli', href: '/rekomendasi', keywords: 'rekomendasi beli sinyal' },
		{ id: 'keputusan', label: 'Ruang Keputusan', href: '/keputusan', keywords: 'keputusan decision' },
		{ id: 'jejak-sinyal', label: 'Jejak Sinyal', href: '/jejak-sinyal', keywords: 'jejak sinyal history' },
		{ id: 'backtest', label: 'Backtest', href: '/backtest', keywords: 'backtest simulasi strategi' },
		{ id: 'faktor', label: 'Faktor & Kalibrasi', href: '/faktor', keywords: 'faktor kalibrasi ic' },
		{ id: 'radar', label: 'Radar Smart Money', href: '/radar', keywords: 'radar smart money bandarmologi' },
		{ id: 'foreign', label: 'Foreign Flow', href: '/foreign', keywords: 'foreign asing net' },
		{ id: 'flow', label: 'Aliran Dana Emiten', href: '/flow', keywords: 'aliran dana flow' },
		{ id: 'sentimen', label: 'Sentimen', href: '/sentimen', keywords: 'sentimen berita' },
		{ id: 'broker-activity', label: 'Aktivitas Broker', href: '/broker-activity', keywords: 'broker bandar' },
		{ id: 'sectors', label: 'Sektor', href: '/sectors', keywords: 'sektor sector rotasi' }
	];

	const STOCK_DEBOUNCE_MS = 250;

	let open = $state(false);
	let query = $state('');
	let activeIndex = $state(0);
	let stocks = $state<StockSearchResult[]>([]);
	let stocksLoading = $state(false);
	let input = $state<HTMLInputElement | null>(null);
	let list = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
		query = '';
		activeIndex = 0;
		stocks = [];
		stocksLoading = false;
	}

	function toggle() {
		if (open) {
			close();
			return;
		}
		query = '';
		activeIndex = 0;
		stocks = [];
		open = true;
	}

	onMount(() => {
		// Cmd+K / Ctrl+K buka, Esc tutup.
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				toggle();
				return;
			}
			if (e.key === 'Escape') close();
		};
		// Di layar sentuh tidak ada Ctrl+K, jadi header ponsel memicu event ini.
		const onOpenEvent = () => toggle();
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('ml:palette', onOpenEvent);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('ml:palette', onOpenEvent);
		};
	});

	// Autofokus input saat dibuka.
	$effect(() => {
		if (!open) return;
		const id = requestAnimationFrame(() => input?.focus());
		return () => cancelAnimationFrame(id);
	});

	// Kunci gulir halaman saat terbuka.
	$effect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	// Cari emiten (debounced) — hasil basi dari request sebelumnya diabaikan.
	$effect(() => {
		if (!open) {
			stocks = [];
			stocksLoading = false;
			return;
		}
		const q = query.trim();
		if (!q) {
			stocks = [];
			stocksLoading = false;
			return;
		}
		let cancelled = false;
		stocksLoading = true;
		const id = setTimeout(() => {
			searchStocks(q)
				.then((rows) => {
					if (!cancelled) stocks = rows;
				})
				.catch(() => {
					// Gagal fetch bukan error fatal — navigasi halaman tetap jalan.
					if (!cancelled) stocks = [];
				})
				.finally(() => {
					if (!cancelled) stocksLoading = false;
				});
		}, STOCK_DEBOUNCE_MS);
		return () => {
			cancelled = true;
			clearTimeout(id);
		};
	});

	// Filter halaman berdasarkan label + kata kunci.
	const navFiltered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return NAV_ACTIONS;
		return NAV_ACTIONS.filter((a) => `${a.label} ${a.href} ${a.keywords}`.toLowerCase().includes(q));
	});

	// Gabungan: emiten dulu (lebih relevan saat mengetik ticker), lalu halaman.
	const items = $derived.by<Item[]>(() => {
		const out: Item[] = [];
		let lastKind: Item['kind'] | null = null;
		for (const s of stocks) {
			out.push({
				kind: 'stock',
				id: `stock-${s.code}`,
				code: s.code,
				name: s.name,
				header: lastKind === 'stock' ? null : 'Emiten'
			});
			lastKind = 'stock';
		}
		for (const a of navFiltered) {
			out.push({
				kind: 'nav',
				id: a.id,
				label: a.label,
				href: a.href,
				current: page.url.pathname === a.href,
				header: lastKind === 'nav' ? null : 'Halaman'
			});
			lastKind = 'nav';
		}
		return out;
	});

	// Hasil baru = pilihan kembali ke atas.
	$effect(() => {
		query;
		stocks;
		activeIndex = 0;
	});

	// Scroll item aktif ke pandangan.
	$effect(() => {
		if (activeIndex < 0) return;
		list?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: 'nearest' });
	});

	function hrefOf(item: Item): string {
		return item.kind === 'stock' ? `/stock/${item.code}` : item.href;
	}

	function onKeyDown(e: KeyboardEvent) {
		const total = items.length;
		if (total === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % total;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + total) % total;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = items[activeIndex];
			if (!item) return;
			const href = hrefOf(item);
			close();
			goto(href);
		}
	}
</script>

{#if open}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Command palette"
		tabindex="-1"
		class="fixed inset-0 z-50"
		onmousedown={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div class="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-hidden="true"></div>
		<div class="relative mx-auto mt-[12vh] w-[min(560px,92vw)]">
			<div class="card overflow-hidden border border-[var(--border)] shadow-2xl">
				<input
					bind:this={input}
					value={query}
					oninput={(e) => {
						query = e.currentTarget.value;
					}}
					onkeydown={onKeyDown}
					placeholder="Cari halaman atau ticker emiten… (Esc untuk tutup)"
					class="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]"
					aria-label="Cari halaman atau emiten"
				/>
				<div bind:this={list} class="max-h-[50vh] overflow-y-auto py-1">
					{#if items.length === 0}
						<p class="px-4 py-6 text-center text-sm text-[var(--muted)]">
							{stocksLoading ? 'Mencari emiten…' : `Tidak ada hasil untuk "${query}"`}
						</p>
					{:else}
						{#each items as item, i (item.id)}
							{@const active = i === activeIndex}
							{#if item.header}
								<div
									class="px-4 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]"
								>
									{item.header}
								</div>
							{/if}
							<a
								href={hrefOf(item)}
								onclick={close}
								data-active={active}
								class="mx-1 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors {active
									? 'bg-white/10'
									: 'hover:bg-white/5'}"
								onmouseenter={() => (activeIndex = i)}
							>
								{#if item.kind === 'stock'}
									<span class="flex min-w-0 items-center gap-2">
										<span
											class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/70"
											aria-hidden="true"
										></span>
										<span class="font-semibold">{item.code}</span>
										{#if item.name}
											<span class="truncate text-xs text-[var(--muted)]">{item.name}</span>
										{/if}
									</span>
									<span class="shrink-0 font-mono text-[10px] text-[var(--muted)]">
										/stock/{item.code}
									</span>
								{:else}
									<span class="flex items-center gap-2">
										<span
											class="inline-block h-1.5 w-1.5 rounded-full {item.current
												? 'bg-[var(--accent)]'
												: 'bg-[var(--muted)]/50'}"
											aria-hidden="true"
										></span>
										{item.label}
									</span>
									<span class="font-mono text-[10px] text-[var(--muted)]">
										{item.current ? 'aktif' : item.href}
									</span>
								{/if}
							</a>
						{/each}
					{/if}
				</div>
				<div
					class="flex items-center justify-between border-t border-[var(--border)] px-4 py-1.5 text-[10px] text-[var(--muted)]"
				>
					<span>↑↓ pilih · ↵ buka</span>
					<span>⌘K / Ctrl+K</span>
				</div>
			</div>
		</div>
	</div>
{/if}
