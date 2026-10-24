<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	type Action = { id: string; label: string; href: string; keywords: string };

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

	let open = $state(false);
	let query = $state('');
	let activeIndex = $state(0);
	let input = $state<HTMLInputElement | null>(null);
	let list = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
		query = '';
		activeIndex = 0;
	}

	function toggle() {
		if (open) {
			close();
			return;
		}
		query = '';
		activeIndex = 0;
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

	// Filter halaman berdasarkan label + kata kunci.
	const navFiltered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return NAV_ACTIONS;
		return NAV_ACTIONS.filter((a) => `${a.label} ${a.href} ${a.keywords}`.toLowerCase().includes(q));
	});

	// Scroll item aktif ke pandangan.
	$effect(() => {
		if (activeIndex < 0) return;
		list?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: 'nearest' });
	});

	function onKeyDown(e: KeyboardEvent) {
		const items = navFiltered;
		if (items.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % items.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + items.length) % items.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = items[activeIndex];
			if (!item) return;
			const href = item.href;
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
						activeIndex = 0;
					}}
					onkeydown={onKeyDown}
					placeholder="Cari halaman atau ticker emiten… (Esc untuk tutup)"
					class="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]"
					aria-label="Cari halaman atau emiten"
				/>
				<div bind:this={list} class="max-h-[50vh] overflow-y-auto py-1">
					{#if navFiltered.length === 0}
						<p class="px-4 py-6 text-center text-sm text-[var(--muted)]">
							Tidak ada hasil untuk "{query}"
						</p>
					{:else}
						<div class="px-4 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
							Halaman
						</div>
						{#each navFiltered as item, i (item.id)}
							{@const active = i === activeIndex}
							{@const current = page.url.pathname === item.href}
							<a
								href={item.href}
								onclick={close}
								data-active={active}
								class="mx-1 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors {active
									? 'bg-white/10'
									: 'hover:bg-white/5'}"
								onmouseenter={() => (activeIndex = i)}
							>
								<span class="flex items-center gap-2">
									<span
										class="inline-block h-1.5 w-1.5 rounded-full {current
											? 'bg-[var(--accent)]'
											: 'bg-[var(--muted)]/50'}"
										aria-hidden="true"
									></span>
									{item.label}
								</span>
								<span class="font-mono text-[10px] text-[var(--muted)]">
									{current ? 'aktif' : item.href}
								</span>
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
