<script lang="ts">
	import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '#lib/hooks.svelte.ts';
	import { fmtNum, fmtPct, fmtCompact } from '#lib/format.ts';
	import type { WatchlistRow } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';

	const CODE_RE = /^[A-Z]{4}$/; // IDX tickers: four letters

	type MoveFilter = 'up' | 'down';

	let {
		codes,
		onSelect,
		selected
	}: {
		codes?: string;
		onSelect?: (code: string) => void;
		selected?: string | null;
	} = $props();

	const watchlist = useWatchlist(() => codes);
	// Getter `data`/`error`/`isLoading` hanya reaktif bila dibaca lewat objeknya;
	// salin ke `$derived` supaya tidak terkunci pada nilai awal.
	const data = $derived(watchlist.data);
	const error = $derived(watchlist.error);
	const isLoading = $derived(watchlist.isLoading);
	const addToWatchlist = useAddToWatchlist();
	const removeFromWatchlist = useRemoveFromWatchlist();

	let filter = $state('');
	let moveFilter = $state<MoveFilter | null>(null);
	let newCode = $state('');
	let mutateError = $state<string | null>(null);
	let busy = $state(false);

	function toggleMove(f: MoveFilter) {
		moveFilter = moveFilter === f ? null : f;
	}

	function tally(rows: WatchlistRow[]) {
		let naik = 0;
		let turun = 0;
		for (const r of rows) {
			if ((r.percent ?? 0) >= 0) naik++;
			else turun++;
		}
		const items: {
			label: string;
			key: MoveFilter;
			value: number;
			dot: string;
			text: string;
		}[] = [
			{ label: 'Naik', key: 'up', value: naik, dot: 'bg-[var(--up)]', text: 'text-up' },
			{ label: 'Turun', key: 'down', value: turun, dot: 'bg-[var(--down)]', text: 'text-down' }
		];
		return items;
	}

	const rows = $derived.by(() => {
		if (!data) return [];
		const q = filter.trim().toUpperCase();
		let filtered = q ? data.filter((r) => r.code.includes(q)) : data;
		if (moveFilter === 'up') filtered = filtered.filter((r) => (r.percent ?? 0) >= 0);
		else if (moveFilter === 'down') filtered = filtered.filter((r) => (r.percent ?? 0) < 0);
		return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
	});

	const inputCode = $derived(newCode.trim().toUpperCase());
	const inputValid = $derived(CODE_RE.test(inputCode));
	const inputExists = $derived(!!data?.some((r) => r.code === inputCode));
	const inputMessage = $derived(
		!inputCode
			? 'Contoh: BBCA'
			: !inputValid
				? 'Kode harus 4 huruf, mis. BBCA'
				: inputExists
					? `${inputCode} sudah ada di watchlist`
					: null
	);
	const filtering = $derived(filter.trim().length > 0);

	async function handleAdd() {
		if (!inputValid || busy) return;
		busy = true;
		mutateError = null;
		try {
			await addToWatchlist([inputCode]);
			newCode = '';
		} catch (e) {
			mutateError = e instanceof Error ? e.message : 'Gagal menambah emiten';
		} finally {
			busy = false;
		}
	}

	async function handleRemove(code: string) {
		if (busy) return;
		busy = true;
		mutateError = null;
		try {
			await removeFromWatchlist(code);
		} catch (e) {
			mutateError = e instanceof Error ? e.message : 'Gagal menghapus emiten';
		} finally {
			busy = false;
		}
	}
</script>

{#snippet moveTally(
	items: ReturnType<typeof tally>,
	active: MoveFilter | null,
	onToggle: (f: MoveFilter) => void
)}
	<div class="flex items-center gap-1.5">
		{#each items as it (it.key)}
			{@const isActive = active === it.key}
			<button
				type="button"
				onclick={() => onToggle(it.key)}
				aria-pressed={isActive}
				title={isActive ? `Tampilkan semua` : `Filter ${it.label} saja`}
				class="flex items-center gap-1.5 rounded-full border bg-white/[0.02] px-2.5 py-1 transition-colors {isActive
					? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
					: 'border-[var(--border)] hover:border-[var(--fg)]/40'}"
			>
				<span class="h-1.5 w-1.5 rounded-full {it.dot}"></span>
				<span class="text-muted text-[10px] font-medium uppercase tracking-wide">{it.label}</span>
				<span class="text-xs font-semibold tabular-nums {it.text}">{it.value}</span>
			</button>
		{/each}
	</div>
{/snippet}

{#snippet metric(label: string, value: string | number, tone?: 'up' | 'down')}
	<div class="flex flex-col">
		<span class="text-muted text-[10px] uppercase tracking-wide">{label}</span>
		<span
			class="text-xs tabular-nums {tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : ''}"
			>{value}</span
		>
	</div>
{/snippet}

{#snippet watchRow(r: WatchlistRow)}
	{@const up = (r.percent ?? 0) >= 0}
	<!-- Baris bisa diklik untuk memilih chart; tautan dan tombol di dalamnya
	     menghentikan propagasi supaya aksi sendiri tidak ikut memilih. -->
	<div
		role="button"
		tabindex="0"
		onclick={() => onSelect?.(r.code)}
		onkeydown={(e) => {
			if (e.key !== 'Enter' && e.key !== ' ') return;
			if (e.target !== e.currentTarget) return;
			e.preventDefault();
			onSelect?.(r.code);
		}}
		class="flex cursor-pointer flex-col gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-white/[0.04] {selected ===
		r.code
			? 'ring-1 ring-[var(--accent)]'
			: ''}"
	>
		<div class="flex items-center gap-2">
			<span class="h-1.5 w-1.5 shrink-0 rounded-full {up ? 'bg-[var(--up)]' : 'bg-[var(--down)]'}"
			></span>
			<a
				href="/stock/{r.code}"
				onclick={(e) => e.stopPropagation()}
				class="flex items-center gap-2 text-sm font-semibold hover:underline"
			>
				<TickerLogo code={r.code} size={22} />
				{r.code}
			</a>
			<span class="ml-auto text-sm font-semibold tabular-nums">{fmtNum(r.close)}</span>
			<span class="text-xs tabular-nums {up ? 'text-up' : 'text-down'}">{fmtPct(r.percent)}</span>
			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation();
					void handleRemove(r.code);
				}}
				disabled={busy}
				title={`Hapus ${r.code} dari watchlist`}
				aria-label={`Hapus ${r.code} dari watchlist`}
				class="text-muted ml-1 shrink-0 rounded px-1.5 py-0.5 transition-colors hover:text-down disabled:cursor-not-allowed disabled:opacity-40"
			>
				×
			</button>
		</div>
		<div class="grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-2">
			{@render metric('Change', fmtNum(r.change), (r.change ?? 0) >= 0 ? 'up' : 'down')}
			{@render metric('Volume', fmtCompact(r.volume))}
			{@render metric(
				'Foreign Net',
				fmtCompact(r.foreign_net),
				(r.foreign_net ?? 0) >= 0 ? 'up' : 'down'
			)}
			{@render metric('Hari', r.hist_days)}
		</div>
	</div>
{/snippet}

<Card
	title="Watchlist"
	subtitle="Snapshot terakhir per emiten · klik untuk chart"
	info="Daftar saham yang kamu pantau. Tambahkan kode saham favoritmu di sini agar harga dan sinyalnya mudah dicek sekali lihat. Klik kartu untuk melihat grafik detailnya."
>
	{#snippet right()}
		<div class="flex items-center gap-2">
			<LastUpdated dep={data} />
			{#if data && data.length > 0}
				{@render moveTally(tally(data), moveFilter, toggleMove)}
			{/if}
		</div>
	{/snippet}

	{#if error}
		<ErrorState
			message="Gagal memuat watchlist: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else if isLoading || !data}
		<div class="grid grid-cols-1 gap-2">
			{#each Array.from({ length: 6 }) as _, i (i)}
				<Skeleton class="h-[76px]" />
			{/each}
		</div>
	{:else}
		<!-- Add / remove form -->
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<div class="flex items-center gap-2">
				<input
					value={newCode}
					oninput={(e) => (newCode = e.currentTarget.value.toUpperCase())}
					onkeydown={(e) => {
						if (e.key === 'Enter') void handleAdd();
					}}
					placeholder="Tambah kode…"
					maxlength={4}
					aria-invalid={!!newCode && !inputValid}
					class="input w-28 uppercase placeholder:normal-case"
				/>
				<button
					type="button"
					onclick={() => void handleAdd()}
					disabled={!inputValid || busy || inputExists}
					class="btn btn-primary"
				>
					+ Tambah
				</button>
			</div>
			<input
				value={filter}
				oninput={(e) => (filter = e.currentTarget.value)}
				placeholder="Filter kode…"
				class="input w-28 uppercase placeholder:normal-case"
			/>
			{#if inputMessage && newCode}
				<span class="text-muted text-xs">{inputMessage}</span>
			{/if}
			{#if mutateError}<ErrorState message={mutateError} />{/if}
		</div>

		{#if rows.length === 0}
			<EmptyState
				message={filtering
					? `Tidak ada emiten yang cocok dengan "${filter.trim()}".`
					: moveFilter
						? `Tidak ada emiten yang ${moveFilter === 'up' ? 'naik' : 'turun'}.`
						: undefined}
			/>
		{:else}
			<div class="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1">
				{#each rows as r (r.code)}
					{@render watchRow(r)}
				{/each}
			</div>
		{/if}
	{/if}
</Card>
