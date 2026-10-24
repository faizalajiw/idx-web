<script lang="ts">
	import {
		ChartColumn,
		Info,
		Minus,
		Radio,
		TrendingDown,
		TrendingUp,
		WavesHorizontal,
		type LucideIcon
	} from '@lucide/svelte';
	import { useSentiment } from '#lib/hooks.svelte.ts';
	import type { SentimentItem } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';

	const pct1 = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`);
	const signedPct = (n: number | null | undefined, digits = 1) =>
		n == null ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}%`;
	const signed = (n: number | null | undefined, digits = 2) =>
		n == null ? '—' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}`;

	const MARKET_TONE: Record<string, { tone: string; Icon: LucideIcon; hint: string }> = {
		'RISK-ON': { tone: 'text-up', Icon: TrendingUp, hint: 'Pasar cenderung optimistis.' },
		'RISK-OFF': { tone: 'text-down', Icon: TrendingDown, hint: 'Pasar cenderung defensif.' },
		NETRAL: { tone: 'text-muted', Icon: Minus, hint: 'Pasar belum punya arah yang jelas.' }
	};
	const FALLBACK_TONE = {
		tone: 'text-accent',
		Icon: Radio,
		hint: 'Data sentimen belum tersedia.'
	};

	/** Komponen skor pasar (rentang -1..+1, positif = mendukung risk-on). */
	const COMPONENT_META: Record<string, { label: string; hint: string }> = {
		breadth: { label: 'Lebar pasar', hint: 'Berapa banyak saham yang naik dibanding yang turun.' },
		index: { label: 'Gerak IHSG', hint: 'Arah dan besar pergerakan indeks hari ini.' },
		foreign: { label: 'Arus asing', hint: 'Apakah investor asing cenderung membeli atau menjual.' }
	};

	/** Nama tampilan untuk komponen bobot skor per emiten. */
	const EMITEN_WEIGHT_LABEL: Record<string, string> = {
		foreign: 'Arus asing (persentil)',
		imbalance: 'Ketimpangan buku',
		absorption: 'Absorpsi buku'
	};

	/** Label emiten dari backend bisa "AKUMULASI KUAT", "DISTRIBUSI", dst. */
	function labelBadge(label: string): string {
		if (label.startsWith('AKUMULASI')) return 'badge badge-buy';
		if (label.startsWith('DISTRIBUSI')) return 'badge badge-sell';
		return 'badge badge-hold';
	}

	type Side = 'akumulasi' | 'distribusi';

	type Tile = {
		key: string;
		label: string;
		hint: string;
		value: number;
		tone: string;
		Icon: LucideIcon;
		c: string;
	};

	const sentiment = useSentiment(15);
	// Getter hasil hook hanya reaktif bila dibaca lewat objeknya; salin ke
	// `$derived` supaya nilai awal tidak terkunci.
	const data = $derived(sentiment.data);
	const isLoading = $derived(sentiment.isLoading);
	const error = $derived(sentiment.error);

	/** Emiten yang panel rinciannya sedang terbuka (`sisi:kode`). */
	let expanded = $state<string | null>(null);

	const market = $derived(data?.market);
	const tone = $derived(MARKET_TONE[(market?.label ?? '').toUpperCase()] ?? FALLBACK_TONE);

	const accumulation = $derived(data?.accumulation ?? []);
	const distribution = $derived(data?.distribution ?? []);
	const stats = $derived(data?.stats ?? {});
	const weightRows = $derived(Object.entries(data?.weights ?? {}));

	const tiles = $derived.by((): Tile[] => [
		{
			key: 'analyzed',
			label: 'Dianalisis',
			hint: 'Emiten yang dinilai',
			value: stats.analyzed ?? 0,
			tone: 'text-[var(--fg)]',
			Icon: ChartColumn,
			c: 'var(--accent)'
		},
		{
			key: 'accumulation',
			label: 'Akumulasi',
			hint: 'Ditekan pembelian',
			value: stats.accumulation ?? 0,
			tone: 'text-up',
			Icon: TrendingUp,
			c: 'var(--up)'
		},
		{
			key: 'distribution',
			label: 'Distribusi',
			hint: 'Ditekan penjualan',
			value: stats.distribution ?? 0,
			tone: 'text-down',
			Icon: TrendingDown,
			c: 'var(--down)'
		},
		{
			key: 'neutral',
			label: 'Netral',
			hint: 'Tanpa sinyal kuat',
			value: stats.neutral ?? 0,
			tone: 'text-muted',
			Icon: Minus,
			c: 'var(--fg-muted)'
		}
	]);

	function toPct(n: number | null | undefined): number | null {
		return n == null ? null : n * 100;
	}

	function toneOf(n: number | null | undefined): string {
		if (n == null) return 'text-[var(--fg)]';
		return n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-[var(--fg)]';
	}

	function toggle(key: string) {
		expanded = expanded === key ? null : key;
	}
</script>

<svelte:head>
	<title>Sentimen Pasar · Market Labs</title>
</svelte:head>

<!-- Gauge skor pasar 0..100, busur setengah lingkaran r=80. -->
{#snippet scoreGauge(score: number, label: string)}
	{@const clamped = Math.max(0, Math.min(100, score))}
	{@const value = (clamped / 100) * 251.3}
	{@const key = (label ?? '').toUpperCase()}
	{@const color =
		key === 'RISK-ON' ? 'var(--up)' : key === 'RISK-OFF' ? 'var(--down)' : 'var(--accent)'}
	<div class="relative h-[146px] w-[240px] shrink-0">
		<svg
			viewBox="0 0 180 110"
			class="h-full w-full"
			role="img"
			aria-label={`Skor sentimen ${score.toFixed(0)} dari 100`}
		>
			<path
				d="M10 95 A80 80 0 0 1 170 95"
				fill="none"
				stroke="var(--bg-elev)"
				stroke-width={14}
				stroke-linecap="round"
			/>
			<path
				d="M10 95 A80 80 0 0 1 170 95"
				fill="none"
				stroke={color}
				stroke-width={14}
				stroke-linecap="round"
				stroke-dasharray="251.3"
				stroke-dashoffset={251.3 - value}
				style="transition: stroke-dashoffset 0.7s ease"
			/>
		</svg>
		<div class="absolute inset-x-0 bottom-0 text-center">
			<div class="text-4xl font-bold tracking-tight tabular-nums">{score.toFixed(0)}</div>
			<div class="text-muted text-[11px] font-semibold uppercase tracking-wide">{label}</div>
		</div>
	</div>
{/snippet}

<!-- Bar komponen dari tengah: kanan = mendukung risk-on, kiri = risk-off. -->
{#snippet componentBar(label: string, hint: string, value: number | null)}
	{@const v = value == null ? null : Math.max(-1, Math.min(1, value))}
	{@const pos = v != null && v >= 0}
	{@const width = v == null ? 0 : Math.abs(v) * 50}
	{@const toneCls = v == null ? 'text-muted' : pos ? 'text-up' : 'text-down'}
	<li class="min-w-0" title={hint}>
		<div class="mb-1.5 flex items-center justify-between text-xs">
			<span class="text-muted font-medium">{label}</span>
			<span class="font-semibold tabular-nums {toneCls}">{signed(v)}</span>
		</div>
		<div class="relative h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)]" aria-hidden="true">
			<span class="absolute inset-y-0 left-1/2 w-px bg-[var(--border-strong)]"></span>
			<span
				class="absolute inset-y-0 rounded-full {pos ? 'left-1/2 bg-up' : 'right-1/2 bg-down'}"
				style="width: {width}%"
			></span>
		</div>
	</li>
{/snippet}

{#snippet breadthBar(up: number, flat: number, down: number)}
	{@const total = up + flat + down}
	{@const share = (n: number) => (total > 0 ? (n / total) * 100 : 0)}
	<div>
		<div
			class="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg-elev)]"
			role="img"
			aria-label={`${up} saham naik, ${flat} stagnan, ${down} turun`}
		>
			<div class="bg-up h-full" style="width: {share(up)}%"></div>
			<div class="h-full bg-[var(--border-strong)]" style="width: {share(flat)}%"></div>
			<div class="bg-down h-full" style="width: {share(down)}%"></div>
		</div>
		<div class="text-muted mt-2 flex justify-between text-xs tabular-nums">
			<span>Naik {up}</span>
			<span>Stagnan {flat}</span>
			<span>Turun {down}</span>
		</div>
	</div>
{/snippet}

{#snippet stat(label: string, value: string, hint: string | undefined, tone: string)}
	<div class="min-w-0" title={hint}>
		<dt class="text-muted text-[11px] font-medium">{label}</dt>
		<dd class="mt-0.5 text-base font-semibold tabular-nums {tone}">{value}</dd>
	</div>
{/snippet}

{#snippet sentimentList(items: SentimentItem[], side: Side)}
	{@const max = Math.max(1, ...items.map((i) => Math.abs(i.score ?? 0)))}
	<ul class="-mx-1 space-y-1">
		{#each items as it (it.code)}
			{@const key = `${side}:${it.code}`}
			{@const open = expanded === key}
			{@const score = it.score ?? 0}
			{@const width = Math.max(4, (Math.abs(score) / max) * 100)}
			{@const reasons = it.reasons ?? []}
			<li class="min-w-0">
				<button
					type="button"
					onclick={() => toggle(key)}
					aria-expanded={open}
					class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors {open
						? 'bg-[var(--bg-elev)]'
						: 'hover:bg-[var(--bg-elev)]'}"
				>
					<TickerLogo code={it.code} size={28} />
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-mono text-sm font-semibold">{it.code}</span>
							<span class={labelBadge(it.label)}>{it.label}</span>
						</div>
						<div class="text-muted mt-0.5 truncate text-xs">{it.name ?? '—'}</div>
					</div>
					<div class="hidden w-24 shrink-0 sm:block">
						<div class="bg-[var(--bg-elev)] h-1.5 overflow-hidden rounded-full">
							<div
								class="h-full rounded-full transition-[width] duration-500 {score >= 0
									? 'bg-up'
									: 'bg-down'}"
								style="width: {width}%"
							></div>
						</div>
					</div>
					<div
						class="w-14 shrink-0 text-right text-sm font-bold tabular-nums {score >= 0
							? 'text-up'
							: 'text-down'}"
					>
						{signed(score)}
					</div>
				</button>
				{#if open}
					<div class="bg-[var(--bg-elev)] mx-2 mb-1 space-y-2 rounded-xl px-4 py-3 text-xs">
						<div class="text-muted flex flex-wrap gap-x-4 gap-y-1">
							<span>
								Persentil asing <b class="text-[var(--fg)]">{pct1((it.foreign_rank ?? 0) * 100)}</b>
							</span>
							<span>
								Imbalance OB <b class="text-[var(--fg)]">{signed(it.ob_imbalance)}</b>
							</span>
							<span>
								Serapan OB <b class="text-[var(--fg)]">{signed(it.ob_absorption)}</b>
							</span>
						</div>
						{#if reasons.length > 0}
							<ul class="text-muted list-inside list-disc space-y-0.5">
								{#each reasons as r, i (i)}
									<li>{r}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet sideCard(
	side: Side,
	title: string,
	subtitle: string,
	Icon: LucideIcon,
	items: SentimentItem[],
	emptyMessage: string
)}
	{@const toneCls = side === 'akumulasi' ? 'text-up' : 'text-down'}
	{#snippet headTitle()}
		<Icon size={15} class={toneCls} aria-hidden="true" />
		{title}
	{/snippet}
	<Card title={headTitle} {subtitle}>
		{#snippet right()}
			{#if !isLoading}
				<span class="text-muted text-xs tabular-nums">{items.length} emiten</span>
			{/if}
		{/snippet}
		{#if isLoading}
			<div class="space-y-2">
				{#each Array.from({ length: 6 }) as _, i (i)}
					<Skeleton class="h-12 w-full" />
				{/each}
			</div>
		{:else if items.length === 0}
			<EmptyState message={emptyMessage} />
		{:else}
			{@render sentimentList(items, side)}
		{/if}
	</Card>
{/snippet}

<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="min-w-0">
			<h1 class="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
				<WavesHorizontal size={26} class="text-accent" aria-hidden="true" />
				<span>
					Sentimen <span class="gradient-text">Pasar</span>
				</span>
			</h1>
			<p class="text-muted mt-1 flex max-w-2xl flex-wrap items-center gap-2 text-sm">
				Suasana pasar hari ini dan emiten mana yang sedang ditekan akumulasi atau distribusi asing.
				<LastUpdated sessionDate={data?.as_of} updatedAt={data?.generated_at} />
			</p>
		</div>
		{#if market}
			{@const MarketIcon = tone.Icon}
			<span
				class="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3.5 py-1.5 text-xs font-semibold {tone.tone}"
			>
				<MarketIcon size={15} aria-hidden="true" />
				{market.label}
			</span>
		{/if}
	</header>

	{#if error}
		<ErrorState
			message="Gagal memuat sentimen: {error instanceof Error ? error.message : String(error)}"
		/>
	{:else}
		<!-- Baris 1: suhu pasar (kiri) + ringkasan breadth (kanan) -->
		<section class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
			<Card
				title="Suhu Pasar"
				subtitle={tone.hint}
				info="Gabungan breadth harga, gerak IHSG, dan breadth arus asing. 50 = netral; di atas 60 = risk-on; di bawah 40 = risk-off."
			>
				{#if market}
					<div class="flex flex-col gap-6">
						<div class="flex justify-center">
							{@render scoreGauge(market.score, market.label)}
						</div>
						<ul class="space-y-3.5">
							{#each Object.entries(COMPONENT_META) as [key, meta] (key)}
								{@render componentBar(meta.label, meta.hint, market.components?.[key] ?? null)}
							{/each}
						</ul>
					</div>
				{:else}
					<Skeleton class="h-72 w-full" />
				{/if}
			</Card>

			<div class="flex min-w-0 flex-col gap-4">
				<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
					{#each tiles as t (t.key)}
						{@const TileIcon = t.Icon}
						<div class="stat-box p-4 pt-5" style="--stat-c: {t.c}">
							<div class="text-muted flex items-center gap-1.5 text-xs font-medium">
								<TileIcon size={14} aria-hidden="true" />
								{t.label}
							</div>
							{#if isLoading}
								<Skeleton class="mt-3 h-8 w-14" />
							{:else}
								<div class="mt-2 text-2xl font-bold tracking-tight tabular-nums {t.tone}">
									{t.value}
								</div>
							{/if}
							<div class="text-muted mt-1 text-[11px]">{t.hint}</div>
						</div>
					{/each}
				</div>

				<Card title="Breadth & Aliran" subtitle="Kondisi pasar pada sesi bursa terakhir.">
					{#if market}
						<div class="flex flex-col gap-5">
							{@render breadthBar(market.up, market.flat, market.down)}
							<dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
								{@render stat(
									'IHSG',
									signedPct(market.index_percent, 2),
									undefined,
									toneOf(market.index_percent)
								)}
								{@render stat(
									'Porsi asing',
									pct1(toPct(market.foreign_breadth)),
									'Saham dengan arus asing positif',
									'text-[var(--fg)]'
								)}
								{@render stat(
									'Asing / nilai',
									pct1(toPct(market.foreign_to_value)),
									'Transaksi asing terhadap total nilai',
									'text-[var(--fg)]'
								)}
							</dl>
						</div>
					{:else}
						<Skeleton class="h-28 w-full" />
					{/if}
				</Card>
			</div>
		</section>

		<!-- Baris 2: akumulasi & distribusi berdampingan -->
		<section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			{@render sideCard(
				'akumulasi',
				'Akumulasi',
				'Arus asing peringkat atas & bid lebih tebal dari offer.',
				TrendingUp,
				accumulation,
				'Tidak ada emiten dengan sinyal akumulasi.'
			)}
			{@render sideCard(
				'distribusi',
				'Distribusi',
				'Arus asing peringkat bawah & offer lebih tebal dari bid.',
				TrendingDown,
				distribution,
				'Tidak ada emiten dengan sinyal distribusi.'
			)}
		</section>

		<!-- Baris 3: metodologi & catatan -->
		<section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card
				title="Bobot Skor Emiten"
				subtitle="Seberapa besar tiap faktor memengaruhi skor satu emiten."
			>
				{#if !data}
					<Skeleton class="h-32 w-full" />
				{:else if weightRows.length === 0}
					<EmptyState message="Belum ada data bobot." />
				{:else}
					<ul class="space-y-3">
						{#each weightRows as [k, v] (k)}
							<li class="min-w-0">
								<div class="mb-1 flex items-center justify-between text-sm">
									<span class="text-muted">{EMITEN_WEIGHT_LABEL[k] ?? k}</span>
									<span class="font-semibold tabular-nums">{(v * 100).toFixed(0)}%</span>
								</div>
								<div class="bg-[var(--bg-elev)] h-1.5 overflow-hidden rounded-full">
									<div class="bg-accent h-full rounded-full" style="width: {v * 100}%"></div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>

			<Card title="Catatan" subtitle="Cara membaca halaman ini.">
				<div class="space-y-3 text-sm">
					{#if !isLoading && data && !data.orderbook_available}
						<p
							class="text-muted flex items-start gap-2 rounded-xl border border-dashed border-[var(--border)] px-3.5 py-2.5 text-xs"
						>
							<Info size={14} class="mt-px shrink-0" aria-hidden="true" />
							Orderbook tidak tersedia pada sesi ini. Sinyal akumulasi dan distribusi memakai arus asing
							dan breadth sebagai proksi.
						</p>
					{/if}
					{#if data?.disclaimer}
						<p class="text-muted text-xs leading-relaxed">{data.disclaimer}</p>
					{:else}
						<p class="text-muted text-xs leading-relaxed">
							Skor dihitung dari jejak transaksi yang sudah tersimpan — bukan berita atau opini.
							Dipakai sebagai konteks, bukan sinyal beli/jual.
						</p>
					{/if}
				</div>
			</Card>
		</section>
	{/if}
</main>
