<script lang="ts">
	import { Menu, Search, X } from '@lucide/svelte';
	import { afterNavigate } from '$app/navigation';
	import Brand from './Brand.svelte';
	import GlobalLastUpdated from './GlobalLastUpdated.svelte';
	import MarketBadge from './MarketBadge.svelte';
	import NavList from './NavList.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	const PANEL_ID = 'm-nav-drawer';

	let open = $state(false);
	let menuBtn = $state<HTMLButtonElement | null>(null);
	let closeBtn = $state<HTMLButtonElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);

	// Layout bertahan saat navigasi klien, jadi drawer ditutup diam-diam setelah
	// pengguna memilih halaman: tanpa mengembalikan fokus, karena halaman berganti.
	afterNavigate(() => {
		open = false;
	});

	// Kunci gulir halaman selama drawer terbuka.
	$effect(() => {
		const root = document.documentElement;
		root.classList.toggle('drawer-open', open);
		return () => root.classList.remove('drawer-open');
	});

	// Fokus masuk ke tombol tutup saat dibuka.
	$effect(() => {
		if (open) closeBtn?.focus();
	});

	// Fokus dikembalikan ke tombol menu dulu, baru ditutup: kalau terbalik,
	// fokus tersangkut di elemen yang sudah inert dan hilang dari halaman.
	function close() {
		menuBtn?.focus();
		open = false;
	}

	// Esc menutup; Tab berputar di dalam panel, tidak pernah keluar ke belakang.
	$effect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}
			if (e.key !== 'Tab') return;
			const el = panel;
			if (!el) return;
			const focusables = el.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement as HTMLElement | null;
			const inside = active ? el.contains(active) : false;
			if (e.shiftKey && (!inside || active === first)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && (!inside || active === last)) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

<div class="app-mobile-chrome">
	<header class="m-header glass-strong">
		<button
			bind:this={menuBtn}
			type="button"
			class="m-icon-btn"
			aria-label="Buka menu"
			aria-expanded={open}
			aria-controls={PANEL_ID}
			onclick={() => (open = true)}
		>
			<Menu size={20} aria-hidden="true" />
		</button>
		<Brand />
		<button
			type="button"
			class="m-icon-btn ml-auto"
			aria-label="Cari halaman atau emiten"
			onclick={() => window.dispatchEvent(new Event('ml:palette'))}
		>
			<Search size={19} aria-hidden="true" />
		</button>
	</header>

	<div class="m-status">
		<GlobalLastUpdated />
		<MarketBadge />
	</div>

	<div
		id={PANEL_ID}
		role="dialog"
		aria-modal="true"
		aria-label="Menu navigasi"
		class="drawer-layer"
		data-open={open}
		inert={!open}
	>
		<button
			type="button"
			class="drawer-scrim"
			aria-label="Tutup menu"
			tabindex="-1"
			onclick={close}
		></button>
		<div bind:this={panel} class="drawer-panel">
			<div class="drawer-head">
				<Brand />
				<button
					bind:this={closeBtn}
					type="button"
					class="m-icon-btn"
					aria-label="Tutup menu"
					onclick={close}
				>
					<X size={20} aria-hidden="true" />
				</button>
			</div>
			<div class="drawer-nav">
				<NavList />
			</div>
			<div class="drawer-foot">
				<div class="flex items-center justify-between gap-2 px-1">
					<span class="text-muted text-xs">Tema</span>
					<ThemeToggle />
				</div>
			</div>
		</div>
	</div>
</div>
