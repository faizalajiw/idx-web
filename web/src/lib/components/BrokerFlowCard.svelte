<script lang="ts">
	import { useBrokerFlow } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtDateStr } from "#lib/format.ts";
	import type {
		BrokerFlow,
		BrokerFlowCategory,
		BrokerFlowCategoryStat,
		BrokerFlowTopRow
	} from "#lib/types.ts";
	import Card from "#lib/components/Card.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import Bars from "#lib/components/Bars.svelte";

	// Warna konsisten dengan legenda broker di seluruh dashboard (lihat lib/brokerType).
	const CAT_META: Record<BrokerFlowCategory, { label: string; color: string }> = {
		asing: { label: "Asing", color: "var(--chart-foreign)" },
		lokal: { label: "Lokal", color: "var(--chart-local)" },
		bumn: { label: "BUMN", color: "var(--chart-bumn)" }
	};
	const CATS: BrokerFlowCategory[] = ["asing", "lokal", "bumn"];

	type HistoryPoint = {
		label: string;
		asing: number;
		lokal: number;
		bumn: number;
		asing_value: number;
		lokal_value: number;
		bumn_value: number;
		total_value: number | null;
	};

	let { compact = false, class: className = "" }: { compact?: boolean; class?: string } = $props();

	const flow = useBrokerFlow(20, 5);
	const data = $derived(flow.data);
	let showMap = $state(false);

	const points = $derived<HistoryPoint[]>(
		(data?.history ?? [])
			.filter((h) => h.asing_share !== null && h.lokal_share !== null && h.bumn_share !== null)
			.map((h) => ({
				label: fmtDateStr(h.date)?.slice(0, 6) ?? h.date,
				asing: Number((h.asing_share! * 100).toFixed(2)),
				lokal: Number((h.lokal_share! * 100).toFixed(2)),
				bumn: Number((h.bumn_share! * 100).toFixed(2)),
				// Nilai mentah ikut disimpan supaya tooltip bisa menampilkan rupiahnya.
				asing_value: h.asing_value,
				lokal_value: h.lokal_value,
				bumn_value: h.bumn_value,
				total_value: h.total_value
			}))
	);

	const subtitle = $derived(
		data?.date
			? `Nilai transaksi asing / lokal / BUMN — sesi ${fmtDateStr(data.date)}`
			: "Nilai transaksi asing / lokal / BUMN"
	);

	function historyFooter(i: number): string | null {
		const p = points[i];
		if (!p) return null;
		return `Nilai: Rp ${fmtCompact(p.asing_value)} asing · Rp ${fmtCompact(p.lokal_value)} lokal · Rp ${fmtCompact(p.bumn_value)} BUMN · Total Rp ${fmtCompact(p.total_value)}`;
	}

	const sharePct = (s: number | null) => (s === null ? "-" : `${(s * 100).toFixed(1)}%`);
</script>

{#snippet categoryColumn(cat: BrokerFlowCategory, stat: BrokerFlowCategoryStat, top: BrokerFlowTopRow[])}
	{@const meta = CAT_META[cat]}
	<div class="rounded-lg border border-[var(--border)] p-3">
		<div class="flex items-baseline justify-between gap-2">
			<span class="inline-flex items-center gap-1.5 text-xs font-semibold">
				<span class="inline-block h-2 w-2 rounded-full" style="background-color: {meta.color}"></span>
				{meta.label}
			</span>
			<span class="text-sm font-semibold tabular-nums">{sharePct(stat.share)}</span>
		</div>
		<p class="text-muted mt-0.5 text-[11px] tabular-nums">
			Rp {fmtCompact(stat.value)} · {stat.n_brokers} firma
		</p>
		{#if top.length > 0}
			<ul class="mt-2 space-y-1 border-t border-[var(--border)] pt-2">
				{#each top as b (b.broker_code)}
					<li class="flex items-center gap-2 text-[11px]">
						<span class="w-7 shrink-0 font-semibold">{b.broker_code}</span>
						<span class="text-muted min-w-0 flex-1 truncate">{b.broker_name ?? "-"}</span>
						<span class="shrink-0 tabular-nums">{sharePct(b.share)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/snippet}

{#snippet body(d: BrokerFlow)}
	<div class="space-y-4">
		<div>
			<div class="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
				{#each CATS as c (c)}
					{@const s = d.categories[c].share}
					{#if s !== null && s > 0}
						<div
							class="h-full"
							style="width: {s * 100}%; background-color: {CAT_META[c].color}"
							title="{CAT_META[c].label} {(s * 100).toFixed(1)}%"
						></div>
					{/if}
				{/each}
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
				{#each CATS as c (c)}
					<span class="inline-flex items-center gap-1.5">
						<span
							class="inline-block h-2 w-2 rounded-full"
							style="background-color: {CAT_META[c].color}"
						></span>
						<span class="font-medium">{CAT_META[c].label}</span>
						<span class="tabular-nums">{sharePct(d.categories[c].share)}</span>
					</span>
				{/each}
			</div>
		</div>

		<div class="grid gap-2 {compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}">
			{#each CATS as c (c)}
				{@render categoryColumn(c, d.categories[c], d.top[c])}
			{/each}
		</div>

		{#if !compact && d.history.length > 1 && points.length > 0}
			<div>
				<p class="text-muted mb-1 flex items-center gap-1 text-[11px]">
					Tren porsi per sesi
					<InfoHint
						text="Porsi nilai transaksi tiap kategori terhadap total pasar per hari bursa. Ketinggian batang selalu 100% — yang dibaca adalah pergeseran komposisinya, bukan besaran pasarnya."
					/>
				</p>
				<Bars
					labels={points.map((p) => p.label)}
					series={[
						{
							name: "Asing",
							values: points.map((p) => p.asing),
							color: CAT_META.asing.color,
							fmt: (v) => `${v.toFixed(1)}%`
						},
						{
							name: "Lokal",
							values: points.map((p) => p.lokal),
							color: CAT_META.lokal.color,
							fmt: (v) => `${v.toFixed(1)}%`
						},
						{
							name: "BUMN",
							values: points.map((p) => p.bumn),
							color: CAT_META.bumn.color,
							fmt: (v) => `${v.toFixed(1)}%`
						}
					]}
					height={160}
					stacked
					maxBarSize={36}
					yDomain={[0, 100]}
					yFmt={(v) => `${Math.round(v)}%`}
					footer={historyFooter}
					xTickGap={24}
				/>
			</div>
		{/if}

		<div class="space-y-1">
			<p class="text-muted text-[11px] leading-snug">
				Yang diukur adalah <strong>porsi nilai transaksi</strong> (setiap trade dihitung sekali di broker
				pembeli dan sekali di broker penjual, jadi totalnya dua sisi perdagangan) — bukan net beli/jual: IDX
				tidak mempublikasikan split beli/jual per broker di data gratis. Kategori dari map kurasi kode broker{' '}
				<button
					type="button"
					class="underline decoration-dotted hover:underline"
					onclick={() => (showMap = !showMap)}
				>
					{showMap ? "sembunyikan" : "lihat klasifikasi"}
				</button>
				.
			</p>
			{#if showMap}
				<div class="max-h-56 overflow-y-auto rounded-md border border-[var(--border)] p-2">
					<table class="w-full text-[11px]">
						<tbody>
							{#each d.classification as b (b.broker_code)}
								<tr class="border-b border-[var(--border)] last:border-0">
									<td class="py-0.5 pr-2 font-semibold">{b.broker_code}</td>
									<td class="text-muted py-0.5 pr-2">{b.broker_name ?? "-"}</td>
									<td class="py-0.5 text-right">
										<span
											class="inline-flex items-center gap-1"
											style="color: {CAT_META[b.category as BrokerFlowCategory]?.color}"
										>
											{CAT_META[b.category as BrokerFlowCategory]?.label ?? b.category}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<Card
	class={className}
	title="Komposisi Broker"
	{subtitle}
	info="Porsi nilai transaksi pasar per kategori broker. Sekuritas asing (UBS, CGS, J.P. Morgan, dll) dipisah dari lokal, dan sekuritas milik BUMN (Mandiri, BNI, BRI Danareksa, Bahana) dipisah sendiri."
>
	{#snippet right()}
		<LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />
	{/snippet}

	{#if flow.error}
		<ErrorState
			message="Gagal memuat komposisi broker: {flow.error instanceof Error
				? flow.error.message
				: String(flow.error)}"
		/>
	{:else if flow.isLoading || !data}
		<Skeleton class="h-44 w-full" />
	{:else if data.n_brokers === 0 || data.total_value === null}
		<EmptyState
			message="Belum ada data broker. Isi lewat `idx serve` (job refresh_s2 16:10 WIB) atau `python -m scripts.backfill_broker_eod`."
		/>
	{:else}
		{@render body(data)}
	{/if}
</Card>
