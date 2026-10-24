<script lang="ts">
	import { PanelLeftClose, PanelLeftOpen } from '@lucide/svelte';
	import Brand from './Brand.svelte';
	import NavList from './NavList.svelte';

	const SIDEBAR_KEY = 'ml-sidebar-collapsed';

	/** Status disimpan sebagai kelas di <html> + localStorage, sama dengan skrip
	 *  inline di app.html supaya tidak ada kedipan saat muat ulang. */
	function toggleSidebar() {
		const root = document.documentElement;
		const next = !root.classList.contains('sidebar-collapsed');
		root.classList.toggle('sidebar-collapsed', next);
		try {
			localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
		} catch {
			// localStorage bisa diblokir (mode privat); rail tetap bekerja tanpa memori.
		}
	}
</script>

<aside
	class="app-sidebar glass-strong fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--border)]"
>
	<div class="sidebar-header flex h-16 items-center border-b border-[var(--border)] px-3">
		<Brand />
		<button
			type="button"
			onclick={toggleSidebar}
			class="btn btn-ghost sidebar-toggle-btn"
			aria-label="Sembunyikan atau tampilkan sidebar"
			title="Sembunyikan / tampilkan sidebar"
		>
			<PanelLeftClose size={18} class="icon-expanded" aria-hidden="true" />
			<PanelLeftOpen size={18} class="icon-rail" aria-hidden="true" />
		</button>
	</div>
	<div class="flex-1 overflow-y-auto px-2 py-5">
		<NavList />
	</div>
</aside>
