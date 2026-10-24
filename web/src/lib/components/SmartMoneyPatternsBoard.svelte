<script lang="ts">
	import { Activity, TrendingDown, TrendingUp } from "@lucide/svelte";
	import { useSmartMoneyPatternsBoard } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtDateStr, fmtNum } from "#lib/format.ts";
	import Card from "#lib/components/Card.svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	const CONFIDENCE_CLS: Record<string, string> = {
		tinggi: "bg-white/10 text-[var(--fg)]",
		sedang: "bg-white/5 text-muted",
		lemah: "bg-white/5 text-muted"
	};

	/**
	 * Papan "pola terkuat hari ini" di /radar — pola yang menyala di sesi terakhir,
	 * dikelompokkan per pola dan diurutkan berdasar kekuatan bukti.
	 *
	 * Kenapa per pola, bukan per emiten: angka historisnya (berapa persen arahnya
	 * benar, di horizon berapa, sekuat apa) memang milik POLA, bukan milik emiten.
	 * Daftar rata per emiten akan menuliskan statistik yang sama puluhan kali dan
	 * justru menyembunyikan pesannya. Yang membedakan antar emiten adalah ukuran
	 * aliran dan streak-nya.
	 *
	 * Gunanya: pola dengan catatan terkuat (mis. inisiasi volume) hanya menyala
	 * sesekali, jadi tanpa papan ini ia nyaris tak pernah terlihat.
	 */
	let { class: className = "" }: { class?: string } = $props();

	const board = useSmartMoneyPatternsBoard();
	const data = $derived(board.data);
</script>

{#snippet cardTitle()}
	<Activity size={16} aria-hidden /> Pola Terkuat Hari Ini
{/snippet}

{#snippet cardRight()}
	{#if data?.date}
		<span class="text-muted text-[10px]">Sesi {fmtDateStr(data.date) ?? data.date}</span>
	{/if}
{/snippet}

{#if board.error}
	<ErrorState
		message="Gagal memuat papan pola: {board.error instanceof Error
			? board.error.message
			: String(board.error)}"
	/>
{:else}
	<Card
		class={className}
		title={cardTitle}
		info="Pola klasik yang menyala di sesi terakhir, diurutkan dari bukti terkuat. Tiap kelompok membawa rekam jejaknya: persentase (berapa kali arah harga benar-benar sesuai pola, dari kejadian serupa di 120 sesi terakhir), horizon tempat catatannya terbaik, dan kata keyakinan. Emiten di dalam kelompok urut besar |net asing|; emiten yang nyaris tak diperdagangkan disaring keluar. Ini jejak, bukan rekomendasi."
		subtitle={data
			? `${data.groups.length} pola menyala · ${fmtNum(data.scanned)} emiten dipindai`
			: undefined}
		right={cardRight}
	>
		{#if board.isLoading || !data}
			<Skeleton class="h-64" />
		{:else if data.groups.length === 0}
			<EmptyState message="Tidak ada pola klasik yang menyala di sesi terakhir." />
		{:else}
			<div class="space-y-3">
				{#each data.groups as g (g.pattern)}
					{@const buy = g.direction === "buy-side"}
					{@const rate = g.aligned_hit_rate}
					{@const hidden = g.fired - g.count}
					<div class="rounded-lg border border-[var(--border)] bg-white/[0.02] p-2.5">
						<!-- kepala kelompok: label + rekam jejak pola -->
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<span
								class="inline-flex items-center gap-1 text-sm font-semibold {buy
									? 'text-up'
									: 'text-down'}"
							>
								{#if buy}
									<TrendingUp size={14} aria-hidden />
								{:else}
									<TrendingDown size={14} aria-hidden />
								{/if}
								{g.label}
							</span>
							{#if g.horizon_days}
								<span
									class="text-muted rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium"
								>
									cerita {g.horizon_days} hari
								</span>
							{/if}
							{#if rate !== null}
								<span
									class="text-[11px] font-medium tabular-nums {rate >= 0.5
										? 'text-[var(--fg)]'
										: 'text-muted'}"
								>
									{Math.round(rate * 100)}% sesuai arah · n={g.n_resolved_horizon ?? 0}
								</span>
							{/if}
							{#if g.confidence}
								<span
									class="rounded px-1.5 py-0.5 text-[10px] font-medium {CONFIDENCE_CLS[g.confidence] ??
										'bg-white/5 text-muted'}"
									title="|t| terbaik lintas horizon — seberapa yakin catatan ini bukan kebetulan{g.edge_pct !==
									null
										? `; besar efek ${g.edge_pct.toFixed(2)}%`
										: ''}"
								>
									keyakinan {g.confidence}
								</span>
							{/if}
							<span class="text-muted ml-auto text-[10px] tabular-nums">
								{g.count} emiten
								{hidden > 0 ? ` (dari ${g.fired} yang menyala)` : ""}
							</span>
						</div>

						<!-- emiten yang memicu pola -->
						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each g.emitters as e (e.code)}
								<a
									href="/stock/{e.code}"
									title="{e.name ?? e.code} — net asing {fmtCompact(e.net_sum_idr)}{e.streak &&
									e.streak >= 3
										? `, ${e.streak} sesi searah`
										: ''}"
									class="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] transition-colors hover:bg-white/[0.06]"
								>
									<TickerLogo code={e.code} size={16} />
									<span class="font-semibold">{e.code}</span>
									<span class="tabular-nums {buy ? 'text-up' : 'text-down'}">
										{fmtCompact(e.net_sum_idr)}
									</span>
									{#if e.streak !== null && e.streak >= 3}
										<span class="text-muted">· {e.streak}×</span>
									{/if}
								</a>
							{/each}
						</div>

						{#if hidden > 0}
							<p class="text-muted mt-1.5 text-[10px] leading-snug">
								{hidden} emiten lain juga memicu pola ini tapi disaring (nilai transaksi di bawah lantai
								likuiditas) — papannya sengaja tidak menempelkan nama yang nyaris tak diperdagangkan.
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card>
{/if}
