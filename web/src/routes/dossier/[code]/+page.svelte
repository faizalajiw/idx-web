<script lang="ts">
	import { page } from '$app/state';
	import { useStockDossier } from '#lib/hooks.svelte.ts';
	import { API_BASE } from '#lib/api.ts';
	import type { DossierSection, StockDossier } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	const SECTION_ORDER: { key: keyof StockDossier['sections']; title: string }[] = [
		{ key: 'profil', title: 'Profil' },
		{ key: 'valuasi', title: 'Valuasi' },
		{ key: 'faktor', title: 'Faktor & Verdict' },
		{ key: 'arus_asing', title: 'Arus Asing' },
		{ key: 'aktivitas_broker', title: 'Aktivitas Broker' },
		{ key: 'sentimen', title: 'Sentimen' },
		{ key: 'catatan_risiko', title: 'Catatan Risiko' }
	];

	type Obj = Record<string, unknown>;

	function fmtValue(v: unknown): string {
		if (v === null || v === undefined) return '—';
		if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
		if (typeof v === 'number') return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
		if (Array.isArray(v)) {
			if (v.length === 0) return '—';
			return v.every((x) => typeof x === 'string')
				? (v as string[]).join('; ')
				: `${v.length} item`;
		}
		if (typeof v === 'object') return 'Lihat detail';
		return String(v);
	}

	function fmtTimestamp(iso: string): string {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'Asia/Jakarta'
		});
	}

	function isPlainObject(v: unknown): v is Obj {
		return v !== null && typeof v === 'object' && !Array.isArray(v);
	}

	function partitionRows(data: Obj) {
		const scalars: [string, unknown][] = [];
		const nested: [string, Obj][] = [];
		const textLists: [string, string[]][] = [];
		const objectLists: [string, number][] = [];

		for (const [k, v] of Object.entries(data)) {
			if (v === null || v === undefined) continue;
			if (isPlainObject(v)) nested.push([k, v]);
			else if (Array.isArray(v)) {
				if (v.length === 0) continue;
				if (v.every((x) => typeof x === 'string')) textLists.push([k, v as string[]]);
				else objectLists.push([k, v.length]);
			} else scalars.push([k, v]);
		}

		return { scalars, nested, textLists, objectLists };
	}

	/** Baris daftar objek ditampilkan sebagai jumlah item, sama seperti app Next. */
	function objectListRows(rows: [string, number][]): [string, unknown][] {
		return rows.map(([k, n]) => [k, `${n} item`]);
	}

	const code = $derived((page.params.code ?? '').toUpperCase());
	const dossier = useStockDossier(() => code || null);
	const data = $derived(dossier.data);
	const error = $derived(dossier.error);
	const isLoading = $derived(dossier.isLoading);
</script>

<svelte:head>
	<title>Dossier {code} · Market Labs</title>
</svelte:head>

{#snippet scalarDl(rows: [string, unknown][])}
	<dl class="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
		{#each rows as [k, v] (k)}
			<div class="flex justify-between gap-3 border-b border-[var(--border)] py-1 last:border-0">
				<dt class="text-muted capitalize">{k.replace(/_/g, ' ')}</dt>
				<dd class="max-w-[60%] text-right font-medium tabular-nums break-words">{fmtValue(v)}</dd>
			</div>
		{/each}
	</dl>
{/snippet}

<!-- Skalar sebagai tabel, objek bersarang sebagai sub-grup, daftar teks sebagai
     butir penuh lebar, daftar objek sebagai jumlah item. -->
{#snippet scalarRows(data: Obj)}
	{@const rows = partitionRows(data)}
	{#if rows.scalars.length + rows.nested.length + rows.textLists.length + rows.objectLists.length === 0}
		<EmptyState message="Tidak ada data untuk bagian ini." />
	{:else}
		<div class="space-y-3">
			{#if rows.scalars.length > 0}
				{@render scalarDl(rows.scalars)}
			{/if}
			{#if rows.objectLists.length > 0}
				{@render scalarDl(objectListRows(rows.objectLists))}
			{/if}
			{#each rows.nested as [k, obj] (k)}
				{@const subRows = Object.entries(obj).filter(
					([, v]) => v !== null && v !== undefined && !isPlainObject(v) && !Array.isArray(v)
				)}
				{#if subRows.length > 0}
					<div>
						<p class="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">
							{k.replace(/_/g, ' ')}
						</p>
						{@render scalarDl(subRows)}
					</div>
				{/if}
			{/each}
			{#each rows.textLists as [k, items] (k)}
				<div>
					<p class="text-muted mb-1 text-xs capitalize">{k.replace(/_/g, ' ')}</p>
					<ul class="list-disc space-y-1 pl-5 text-sm leading-snug">
						{#each items as it, i (i)}
							<li>{it}</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet sectionCard(title: string, section: DossierSection)}
	<Card
		{title}
		subtitle={section.session_date ? `Data sesi ${section.session_date}` : 'Tanpa tanggal sesi'}
	>
		{#snippet right()}
			{#if section.stale}
				<span class="badge badge-warn">Lebih lama dari sesi terakhir</span>
			{:else if section.session_date}
				<span class="badge badge-buy">Segar</span>
			{/if}
		{/snippet}
		{#if section.error}
			<ErrorState message="Bagian ini gagal dimuat: {section.error}" />
		{:else if section.data && Object.keys(section.data).length > 0}
			{@render scalarRows(section.data)}
		{:else if section.data}
			<EmptyState message="Tidak ada data untuk bagian ini pada sesi tersebut." />
		{:else}
			<EmptyState message="Tidak ada data untuk bagian ini." />
		{/if}
	</Card>
{/snippet}

{#if !code}
	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6">
		<p class="text-muted">Kode emiten tidak valid.</p>
	</main>
{:else}
	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
		<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<nav class="text-muted text-xs" aria-label="Breadcrumb">
					<a href="/" class="hover:underline">Home</a>
					<span class="mx-1.5">/</span>
					<a href="/stock/{code}" class="hover:underline">{code}</a>
					<span class="mx-1.5">/</span>
					<span class="font-medium text-[var(--fg)]">Dossier</span>
				</nav>
				<h1 class="mt-1 text-2xl font-bold tracking-tight">Dossier {code}</h1>
				{#if data}
					<p class="text-muted mt-1 text-xs">
						Sesi terakhir pasar: {data.latest_session ?? '—'} · Dibuat {fmtTimestamp(
							data.generated_at
						)} WIB
					</p>
				{/if}
			</div>
			<a
				href="{API_BASE}/api/stocks/{encodeURIComponent(code)}/dossier.pdf"
				class="btn btn-primary"
				download
			>
				Unduh PDF
			</a>
		</header>

		{#if error}
			<ErrorState
				message="Gagal memuat dossier: {error instanceof Error ? error.message : String(error)}"
			/>
		{/if}
		{#if isLoading && !data}
			<Skeleton class="h-96 w-full" />
		{/if}

		{#if data}
			{#if data.stale_sections.length > 0}
				<p class="badge-warn mb-4 rounded-lg px-3 py-2 text-xs">
					Ada {data.stale_sections.length} bagian yang datanya lebih lama dari sesi terakhir: {data.stale_sections.join(
						', '
					)}.
				</p>
			{/if}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each SECTION_ORDER as { key, title } (key)}
					{@render sectionCard(title, data.sections[key])}
				{/each}
			</div>
			<p class="text-muted mt-6 text-xs">
				Ringkasan data dari sumber yang sudah ada, bukan rekomendasi beli atau jual.
			</p>
		{/if}
	</main>
{/if}
