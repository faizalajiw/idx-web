<script lang="ts">
	import {
		Banknote,
		GitCommitHorizontal,
		Minus,
		ShieldAlert,
		TrendingDown,
		TrendingUp,
		type LucideIcon
	} from '@lucide/svelte';
	import { useStockSmartMoney } from '#lib/hooks.svelte.ts';
	import { fmtDateStr, fmtNum, fmtPct } from '#lib/format.ts';
	import type { SmartMoneyPattern } from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import InfoHint from '#lib/components/InfoHint.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TickerLogo from '#lib/components/TickerLogo.svelte';

	/** Tone warna berdasarkan arah verdict. */
	function sideTone(side: string): { text: string; chip: string; icon: LucideIcon } {
		if (side === 'akumulasi')
			return { text: 'text-up', chip: 'bg-up/15 text-up', icon: TrendingUp };
		if (side === 'distribusi')
			return { text: 'text-down', chip: 'bg-down/15 text-down', icon: TrendingDown };
		return { text: 'text-muted', chip: 'bg-white/10 text-muted', icon: Minus };
	}

	const SIDE_LABEL: Record<string, string> = {
		akumulasi: 'SEDANG DITIMBUN',
		distribusi: 'SEDANG DIBUANG',
		netral: 'ARUS SEIMBANG'
	};

	/**
	 * Banner "Jejak Smart Money" untuk satu emiten — satu verdict yang bisa
	 * dipahami orang awam di satu layar, lalu angka detail di bawahnya.
	 *
	 * Susunan (verdict dulu, angka belakangan):
	 *  1. Kepala: arah besar + kekuatan + streak
	 *  2. Narasi plain-language (kalimat dari backend)
	 *  3. Pola klasik yang terdeteksi (chip)
	 *  4. Level: rentang konsolidasi + invalidasi
	 *  5. Konteks sektor: "1 dari N emiten sektor X"
	 */
	let { code }: { code: string } = $props();

	const sm = useStockSmartMoney(() => code);
	const data = $derived(sm.data);
	const v = $derived(data?.verdict ?? null);
</script>

{#snippet cardTitle()}
	<Banknote size={16} aria-hidden /> Jejak Smart Money
{/snippet}

<!--
	Satu pola terdeteksi + rekam jejaknya.

	Horizon selalu disebut ("cerita N hari"): inilah yang membedakan pola yang
	masih berjalan dari pola yang sudah selesai — pola akumulasi bercerita
	~3 minggu, pola distribusi ~5 hari. Persentase diberi warna netral
	(bukan hijau/merah) karena pola jual yang terbukti bukan kabar baik:
	warnanya menyatakan KEKUATAN catatan, bukan arah pasar. Di bawah 50%
	ditampilkan apa adanya — pola itu lebih sering meleset.
-->
{#snippet patternRow(pattern: SmartMoneyPattern)}
	{@const buy = pattern.direction === 'buy-side'}
	{@const h = pattern.history}
	{@const rate = h?.aligned_hit_rate ?? null}
	{@const hasEdge = rate !== null && rate >= 0.5}
	<div
		title={pattern.note ?? undefined}
		class="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold {buy
			? 'bg-up/10'
			: 'bg-down/10'}"
	>
		<span class="inline-flex items-center gap-1 {buy ? 'text-up' : 'text-down'}">
			{#if buy}
				<TrendingUp size={12} aria-hidden />
			{:else}
				<TrendingDown size={12} aria-hidden />
			{/if}
			{pattern.label}
		</span>
		{#if h?.horizon_days}
			<span class="text-muted rounded bg-white/10 px-1.5 py-0.5 font-medium">
				cerita {h.horizon_days} hari
			</span>
		{/if}
		{#if rate !== null}
			<span class="font-medium tabular-nums {hasEdge ? 'text-[var(--fg)]' : 'text-muted'}">
				{Math.round(rate * 100)}% sesuai arah
				<span class="text-muted">
					{' '}· n={h?.n_resolved_horizon ?? 0}{h && !h.reliable
						? ' (sampel kecil)'
						: h?.confidence
							? ` · keyakinan ${h.confidence}`
							: ''}
				</span>
			</span>
		{/if}
	</div>
{/snippet}

{#if sm.error}
	<ErrorState
		message="Gagal memuat jejak smart money: {sm.error instanceof Error
			? sm.error.message
			: String(sm.error)}"
	/>
{:else if sm.isLoading || !data}
	<Skeleton class="h-40 w-full" />
{:else if !data.has_data || !v}
	<EmptyState message="Data aliran asing belum cukup untuk menilai jejak smart money emiten ini." />
{:else}
	{@const tone = sideTone(v.side)}
	{@const strength =
		v.strength === 'besar' ? 'aliran besar' : v.strength === 'menengah' ? 'aliran bermakna' : null}
	{@const ToneIcon = tone.icon}
	<Card
		title={cardTitle}
		info="Jejak investor asing (proksi 'pemain besar' — IDX tidak mempublikasikan transaksi per firma di data gratis). Arah dari porsi nilai transaksi yang dibelani asing di 10 sesi terakhir, bukan skor. Ini alat riset, bukan rekomendasi."
		subtitle={data.date ? `Sesi ${fmtDateStr(data.date) ?? data.date}` : undefined}
		class="border-[var(--border)]"
	>
		<!-- 1) kepala verdict -->
		<div class="flex items-center gap-3">
			<TickerLogo code={data.code} size={34} />
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-lg font-bold tracking-tight">{data.code}</span>
					<span
						class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold {tone.chip}"
					>
						<ToneIcon size={16} />
						{SIDE_LABEL[v.side] ?? v.side}
					</span>
					{#if strength}
						<span class="text-muted rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium">
							{strength}
						</span>
					{/if}
				</div>
				{#if data.name}
					<p class="text-muted truncate text-xs">{data.name}</p>
				{/if}
			</div>
			{#if (v.streak ?? 0) >= 3}
				<div class="shrink-0 text-right">
					<p class="flex items-center gap-1 text-sm font-bold tabular-nums {tone.text}">
						<GitCommitHorizontal size={14} aria-hidden />
						{v.streak}× berturut
					</p>
					<p class="text-muted text-[10px]">
						{v.streak_start_date
							? `sejak ${fmtDateStr(v.streak_start_date) ?? v.streak_start_date}`
							: 'sesi searah'}
					</p>
				</div>
			{/if}
		</div>

		<!-- 2) narasi -->
		{#if data.narrative.length > 0}
			<div class="mt-3 space-y-1.5">
				{#each data.narrative as line, i (i)}
					<p
						class="text-sm leading-relaxed {i === 0
							? 'font-medium text-[var(--fg)]'
							: 'text-muted'}"
					>
						{line}
					</p>
				{/each}
			</div>
		{/if}

		<!-- 3) pola klasik + rekam jejaknya -->
		{#if data.patterns.length > 0}
			<div class="mt-3 space-y-1">
				<p
					class="text-muted flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
				>
					Pola terdeteksi
					<InfoHint
						text="'Cerita N hari' = di horizon itulah pola ini punya catatan terbaik. Ini bukan pilihan gaya: pola akumulasi nyaris tak berarti dalam 5 hari dan baru terbaca di ~3 minggu, sementara pola distribusi justru paling jelas dalam ~5 hari. Persentase = berapa kali arah harga benar-benar sesuai pola (dari kejadian serupa di 120 sesi terakhir); di bawah 50% artinya pola ini lebih sering meleset. 'Keyakinan' (dari nilai t) menyatakan seberapa kuat buktinya bukan kebetulan: tinggi / sedang / lemah. Pola diurutkan dari bukti terkuat."
					/>
				</p>
				{#each data.patterns as p (p.id)}
					{@render patternRow(p)}
				{/each}
			</div>
		{/if}

		<!-- 4) level -->
		{#if data.range}
			{@const range = data.range}
			<div
				class="text-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--border)] bg-white/[0.02] p-2.5 text-xs"
			>
				<ShieldAlert size={14} class="shrink-0" aria-hidden />
				<span>
					Rentang {range.lookback} sesi:{' '}
					<strong class="text-[var(--fg)] tabular-nums">{fmtNum(range.low)}</strong>–<strong
						class="text-[var(--fg)] tabular-nums">{fmtNum(range.high)}</strong
					>
					<span class="text-muted"> (lebar {fmtPct(range.range_pct)})</span>
				</span>
				<span>
					Tembus <strong class="text-up tabular-nums">{fmtNum(range.resistance)}</strong> =
					konfirmasi · jebol <strong class="text-down tabular-nums">{fmtNum(range.support)}</strong> =
					batal
				</span>
			</div>
		{/if}

		<!-- 5) konteks pasar -->
		{#if data.market && data.market.distributing !== null}
			{@const market = data.market}
			<p class="text-muted mt-2.5 flex items-start gap-1.5 text-xs leading-snug">
				<InfoHint
					text="Sebaran verdict SELURUH pasar di jendela yang sama (10 sesi), tanpa memotong emiten tipis — penyebutnya sengaja jujur. Persentase dihitung dari emiten yang punya arah (netral & data kurang tidak ikut), karena 'mayoritas pasar' harus dibaca dari yang memang bersuara. Gunanya: memisahkan 'emiten ini istimewa' dari 'seluruh pasar sedang begitu'."
				/>
				<span class="flex-1">
					<strong class="text-[var(--fg)]">Konteks pasar:</strong>{' '}
					<span class="text-down tabular-nums">{fmtNum(market.distributing)}</span> dibuang vs{' '}
					<span class="text-up tabular-nums">{fmtNum(market.accumulating)}</span> ditimbun
					{#if market.distributing_share !== null}
						{' '}— {fmtNum(market.distributing_share, 0)}% dari yang punya arah sedang dibuang
					{/if}
				</span>
			</p>
		{/if}

		<!-- 6) konteks sektor -->
		{#if data.sector?.position}
			{@const sector = data.sector}
			<p class="text-muted mt-2.5 flex items-start gap-1.5 text-xs leading-snug">
				<InfoHint
					text="Berapa emiten di sektor yang sama yang juga searah — membedakan 'saham ini istimewa' dari 'seluruh sektor sedang begitu'. Sektor dari pemetaan kurasi; jika emiten tidak terpetakan, konteks tidak ditampilkan."
				/>
				<span class="flex-1">
					<strong class="text-[var(--fg)]">Konteks {sector.sector}:</strong>{' '}
					{sector.position}
				</span>
			</p>
		{/if}

		<!-- link ke detail -->
		<div class="mt-3 flex gap-2 border-t border-[var(--border)] pt-2.5">
			<a href="/stock/{data.code}" class="text-accent text-xs font-medium hover:underline">
				Detail teknikal →
			</a>
			<a href="/flow/{data.code}" class="text-accent text-xs font-medium hover:underline">
				Arus asing harian →
			</a>
		</div>
	</Card>
{/if}
