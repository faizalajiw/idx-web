<script lang="ts">
	import { Crown, Landmark, Users } from '@lucide/svelte';
	import { useStockOwnership } from '#lib/hooks.svelte.ts';
	import { fmtDateStr, fmtNum, fmtPct } from '#lib/format.ts';
	import type { OwnershipChange } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	// Label ramah untuk kategori pemegang saham IDX.
	const CATEGORY_LABEL: Record<string, string> = {
		publik: 'masyarakat',
		besar: '>5%',
		manajemen: 'manajemen',
		treasury: 'treasury',
		lain: 'lain'
	};

	const CHANGE_WORD: Record<string, string> = {
		tambah: 'menambah',
		kurang: 'mengurangi',
		baru: 'masuk (baru)',
		keluar: 'keluar'
	};

	function categoryOf(cat: string | null): string {
		const c = (cat ?? '').trim();
		if (c === 'Masyarakat Warkat' || c === 'Masyarakat Non Warkat') return 'publik';
		if (c === 'Saham Treasury') return 'treasury';
		if (c === 'Direksi' || c === 'Komisaris') return 'manajemen';
		if (c.startsWith('Lebih dari') || c.includes('5%')) return 'besar';
		return 'lain';
	}

	let { code }: { code: string } = $props();

	const ownership = useStockOwnership(() => code);
	const data = $derived(ownership.data);
	const error = $derived(ownership.error);
	const isLoading = $derived(ownership.isLoading);

	const controller = $derived(
		data && data.controller.length > 0 ? data.controller.join(', ') : null
	);
	const holders = $derived((data?.holders ?? []).filter((h) => h.pct !== null).slice(0, 10));
	const freeFloat = $derived(data?.free_float_pct ?? null);
	const subtitle = $derived(
		data?.as_of ? `Snapshot ${fmtDateStr(data.as_of) ?? data.as_of}` : undefined
	);
</script>

{#snippet cardTitle()}
	<Users size={16} aria-hidden="true" /> Pemilik & Aksi Pemilik
{/snippet}

{#snippet freeFloatBadge()}
	{#if freeFloat !== null}
		<div class="text-right">
			<p class="text-accent text-lg font-bold tabular-nums">{fmtNum(freeFloat, 1)}%</p>
			<p class="text-muted text-[10px]">free float publik</p>
		</div>
	{/if}
{/snippet}

{#snippet changeRow(c: OwnershipChange)}
	{@const up = c.action === 'tambah' || c.action === 'baru'}
	{@const cls = up ? 'text-up' : 'text-down'}
	<li class="flex items-center gap-2 text-xs">
		<span class="min-w-0 flex-1 truncate">{c.holder_name}</span>
		<span class="shrink-0 font-medium {cls}">{CHANGE_WORD[c.action] ?? c.action}</span>
		<span class="w-16 shrink-0 text-right font-semibold tabular-nums {cls}">
			{c.delta_pct !== null
				? fmtPct(c.delta_pct)
				: c.curr_pct !== null
					? `${fmtNum(c.curr_pct, 2)}%`
					: '—'}
		</span>
	</li>
{/snippet}

{#if error}
	<ErrorState
		message="Gagal memuat kepemilikan: {error instanceof Error ? error.message : String(error)}"
	/>
{:else if isLoading || !data}
	<Skeleton class="h-44 w-full" />
{:else if !data.has_data}
	<Card title={cardTitle}>
		<EmptyState
			message="Komposisi pemegang saham belum ada di basis data. Jalankan `idx ownership` untuk mengambilnya dari keterbukaan IDX."
		/>
	</Card>
{:else}
	<!--
		Kartu "Pemilik & Aksi Pemilik": siapa pemain besar di emiten ini, free float
		publik, dan (bila sudah ada >= 2 snapshot) siapa yang menambah/mengurangi porsi.
	-->
	<Card
		title={cardTitle}
		{subtitle}
		info="Komposisi pemegang saham dari keterbukaan IDX (gratis). Free float = porsi publik (masyarakat Warkat + Non Warkat) — makin kecil, makin sedikit saham yang benar-benar beredar. 'Aksi pemilik' = perubahan porsi vs snapshot sebelumnya (jalankan `idx ownership` berkala). Data bulanan, bukan harian."
		right={freeFloatBadge}
	>
		{#if controller}
			<p
				class="mb-3 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/[0.02] px-2.5 py-2 text-xs"
			>
				<Crown size={13} class="text-accent shrink-0" aria-hidden="true" />
				<span class="text-muted">
					Pengendali: <strong class="text-[var(--fg)]">{controller}</strong>
				</span>
			</p>
		{/if}

		<!-- daftar pemilik terbesar -->
		<ul class="space-y-1">
			{#each holders as h (h.holder_name)}
				{@const cat = categoryOf(h.category)}
				<li class="flex items-center gap-2 rounded-lg px-2 py-1.5 odd:bg-white/[0.02]">
					<span class="min-w-0 flex-1 truncate text-sm">
						{#if h.is_controller}
							<Crown size={11} class="text-accent mr-1 inline" aria-hidden="true" />
						{/if}
						{h.holder_name}
					</span>
					<span class="text-muted shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
						{CATEGORY_LABEL[cat] ?? cat}
					</span>
					<span class="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
						{fmtNum(h.pct, 2)}%
					</span>
				</li>
			{/each}
		</ul>

		<!-- aksi pemilik -->
		<div class="mt-3 border-t border-[var(--border)] pt-2.5">
			<p
				class="text-muted mb-1.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
			>
				<Landmark size={12} aria-hidden="true" /> Aksi pemilik
			</p>
			{#if data.prev_date === null}
				<p class="text-muted text-xs leading-snug">
					Snapshot pertama tersimpan. Perubahan porsi (siapa menambah/mengurangi) muncul setelah
					snapshot berikutnya — jalankan
					<code class="text-[var(--fg)]">idx ownership</code> berkala.
				</p>
			{:else if data.changes.length === 0}
				<p class="text-muted text-xs">
					Tidak ada perubahan porsi berarti sejak {data.prev_date}.
				</p>
			{:else}
				<ul class="space-y-1">
					{#each data.changes.slice(0, 8) as c (c.holder_name)}
						{@render changeRow(c)}
					{/each}
				</ul>
			{/if}
		</div>
	</Card>
{/if}
