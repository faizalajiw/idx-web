<script lang="ts">
	import {
		Activity,
		Bell,
		Layers,
		Minus,
		TrendingDown,
		TrendingUp,
		type LucideIcon
	} from '@lucide/svelte';
	import { useSmartMoneyWatchlist } from '#lib/hooks.svelte.ts';
	import { fmtNum } from '#lib/format.ts';
	import Card from '#lib/components/Card.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';
	import InfoHint from '#lib/components/InfoHint.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import type { SmartMoneyWatchRow } from '#lib/types.ts';

	type FilterKey = 'aktif' | 'akumulasi' | 'distribusi' | 'semua';

	const FILTERS: { key: FilterKey; label: string; icon: LucideIcon }[] = [
		{ key: 'aktif', label: 'Ada aliran', icon: Activity },
		{ key: 'akumulasi', label: 'Ditimbun', icon: TrendingUp },
		{ key: 'distribusi', label: 'Dibuang', icon: TrendingDown },
		{ key: 'semua', label: 'Semua', icon: Layers }
	];

	function sideStyle(side: string | null, insufficient: boolean) {
		if (insufficient || side === 'netral' || !side)
			return { Icon: Minus, cls: 'text-muted', chip: 'bg-white/5 text-muted' };
		if (side === 'akumulasi') return { Icon: TrendingUp, cls: 'text-up', chip: 'bg-up/15 text-up' };
		return { Icon: TrendingDown, cls: 'text-down', chip: 'bg-down/15 text-down' };
	}

	const SIDE_WORD: Record<string, string> = {
		akumulasi: 'ditimbun',
		distribusi: 'dibuang',
		netral: 'seimbang'
	};

	/**
	 * Kartu "Jejak Smart Money — Watchlist" untuk halaman Pantau.
	 *
	 * Memberi tahu bahwa watchlist dipantau otomatis: begitu verdict salah satu
	 * emiten berubah (pemain besar masuk/keluar/balik arah), Telegram berbunyi.
	 * Daftar di bawah = kondisi SEKARANG — baseline-nya, bukan rekomendasi.
	 */
	const watch = useSmartMoneyWatchlist();
	// Getter hook: baca lewat objek, lalu salin ke `$derived` agar tetap reaktif.
	const data = $derived(watch.data);
	const error = $derived(watch.error);
	const isLoading = $derived(watch.isLoading);
	let filter = $state<FilterKey>('aktif');

	const rows = $derived(data?.rows ?? []);
	const counts = $derived.by(() => {
		let acc = 0,
			dist = 0;
		for (const r of rows) {
			if (r.insufficient || r.side === 'netral' || !r.side) continue;
			if (r.side === 'akumulasi') acc += 1;
			else dist += 1;
		}
		return { aktif: acc + dist, akumulasi: acc, distribusi: dist, semua: rows.length };
	});

	const shown = $derived.by(() => {
		if (filter === 'semua') return rows;
		if (filter === 'akumulasi')
			return rows.filter((r) => !r.insufficient && r.side === 'akumulasi');
		if (filter === 'distribusi')
			return rows.filter((r) => !r.insufficient && r.side === 'distribusi');
		return rows.filter(
			(r) => !r.insufficient && (r.side === 'akumulasi' || r.side === 'distribusi')
		);
	});
</script>

{#snippet watchRow(row: SmartMoneyWatchRow)}
	{@const style = sideStyle(row.side, row.insufficient)}
	{@const Ikon = style.Icon}
	{@const streak = row.streak ?? 0}
	<a
		href="/radar/{row.code}"
		class="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.05]"
	>
		<Ikon size={15} class="shrink-0 {style.cls}" aria-hidden />
		<TickerLogo code={row.code} size={22} />
		<span class="min-w-0 flex-1">
			<span class="block text-sm font-semibold">{row.code}</span>
			{#if row.name}
				<span class="text-muted block truncate text-[11px]">{row.name}</span>
			{/if}
		</span>
		<span class="flex shrink-0 items-center gap-2">
			{#if streak >= 3}
				<span
					class="rounded px-1 text-[10px] font-semibold {style.chip}"
					title={`${streak} sesi berturut-turut`}
				>
					{streak}×
				</span>
			{/if}
			<span class="text-xs font-semibold tabular-nums {style.cls}">
				{row.insufficient || !row.side ? '—' : `${fmtNum(row.netval_pct, 1)}%`}
			</span>
			<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {style.chip}">
				{row.insufficient ? 'belum cukup' : (SIDE_WORD[row.side ?? ''] ?? '—')}
			</span>
		</span>
	</a>
{/snippet}

{#if error}
	<ErrorState
		message="Gagal memuat jejak smart money: {error instanceof Error
			? error.message
			: String(error)}"
	/>
{:else}
	<Card subtitle={data ? `Terpantau ${data.n} emiten · alert saat verdict berubah` : 'Memuat…'}>
		{#snippet title()}
			<Bell size={16} aria-hidden /> Jejak Smart Money — Watchlist
			<InfoHint
				text="Alert otomatis untuk SEMUA emiten di watchlist kamu: begitu verdict jejak asingnya berubah (mulai ditimbun / mulai dibuang / balik arah), kamu dapat pesan Telegram — sekali per perubahan, tidak tiap hari. Daftar di bawah = kondisi sekarang (baseline). Tidak perlu pasang aturan satu-satu. Bukan rekomendasi."
			/>
		{/snippet}

		{#snippet right()}
			{#if data}
				<span
					class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold {data.telegram_enabled
						? 'bg-up/15 text-up'
						: 'bg-white/10 text-muted'}"
					title={data.telegram_enabled
						? 'Telegram tersambung — alert akan dikirim'
						: 'Telegram belum diatur — alert hanya bisa dilihat di dashboard'}
				>
					<Bell size={11} aria-hidden />
					{data.telegram_enabled ? 'Telegram aktif' : 'Telegram belum diatur'}
				</span>
			{/if}
		{/snippet}

		{#if isLoading || !data}
			<Skeleton class="h-48" />
		{:else if rows.length === 0}
			<EmptyState message="Watchlist masih kosong — tambahkan emiten di atas." />
		{:else}
			<div class="space-y-3">
				<!-- tab filter: jumlah per kategori langsung terlihat -->
				<div
					role="tablist"
					aria-label="Filter watchlist"
					class="flex flex-wrap gap-1 border-b border-[var(--border)]"
				>
					{#each FILTERS as f (f.key)}
						{@const active = filter === f.key}
						{@const FilterIcon = f.icon}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (filter = f.key)}
							class="group -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {active
								? 'border-[var(--accent)] text-[var(--fg)]'
								: 'border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'}"
						>
							<FilterIcon
								size={15}
								aria-hidden
								class={active ? 'text-[var(--accent-text)]' : 'opacity-70 group-hover:opacity-100'}
							/>
							{f.label}
							<span
								class="rounded-full px-1.5 text-[10px] font-semibold tabular-nums {active
									? 'bg-[var(--accent)]/15 text-[var(--accent-text)]'
									: 'bg-white/5 text-muted'}"
							>
								{counts[f.key]}
							</span>
						</button>
					{/each}
				</div>

				<div class="max-h-80 space-y-1 overflow-y-auto pr-1">
					{#if shown.length === 0}
						<EmptyState message="Tidak ada emiten dengan aliran bermakna saat ini." />
					{:else}
						{#each shown as r (r.code)}
							{@render watchRow(r)}
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</Card>
{/if}
