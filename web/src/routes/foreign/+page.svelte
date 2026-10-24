<script lang="ts">
	import { Earth, TrendingDown, TrendingUp, type LucideIcon } from "@lucide/svelte";
	import { useForeignFlow } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtNum, fmtPct } from "#lib/format.ts";
	import type { ForeignFlow } from "#lib/types.ts";
	import Bars from "#lib/components/Bars.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import RegimeBanner from "#lib/components/RegimeBanner.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";

	type Side = "in" | "out";
	type Mover = { code: string; name: string | null; net: number | null; percent: number | null };

	const TABS: { value: Side; label: string; icon: LucideIcon }[] = [
		{ value: "in", label: "Net beli", icon: TrendingUp },
		{ value: "out", label: "Net jual", icon: TrendingDown }
	];

	const flow = useForeignFlow(20);
	const data = $derived<ForeignFlow | undefined>(flow.data);
	let side = $state<Side>("in");

	// Hari tanpa nilai tidak digambar: `Bars` memetakan null ke 0, yang akan
	// terbaca seperti "tidak ada arus" padahal datanya tidak ada.
	const chartData = $derived(
		(data?.days ?? [])
			.filter((d) => d.net !== null)
			.map((d) => ({ label: d.date.slice(5), net: (d.net as number) / 1e9 }))
	);

	const net = $derived(data?.total_net ?? 0);
	const buy = $derived(data?.total_buy ?? 0);
	const sell = $derived(data?.total_sell ?? 0);
	const buyShare = $derived(buy + sell > 0 ? (buy / (buy + sell)) * 100 : 50);
	const movers = $derived<Mover[]>(side === "in" ? (data?.top_net_in ?? []) : (data?.top_net_out ?? []));
	const maxMover = $derived(Math.max(0, ...movers.map((m) => Math.abs(m.net ?? 0))));
	const isNetIn = $derived(net >= 0);
</script>

{#snippet moverList(items: Mover[], direction: Side, max: number)}
	{@const tone = direction === "in" ? "text-up" : "text-down"}
	{@const bar = direction === "in" ? "bg-up" : "bg-down"}
	<div
		class="text-muted flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 text-xs"
	>
		<span class="pl-[52px]">Saham</span>
		<span class="flex gap-6">
			<span>Net nilai (Rp)</span>
			<span class="w-14 text-right">Harga %</span>
		</span>
	</div>
	<ul class="divide-y divide-[var(--border)]">
		{#each items as m, i (m.code)}
			{@const absNet = Math.abs(m.net ?? 0)}
			{@const width = max > 0 ? Math.max(4, (absNet / max) * 100) : 0}
			<li class="flex items-center gap-3 py-3">
				<span class="text-muted w-5 text-xs tabular-nums">{i + 1}</span>
				<TickerLogo code={m.code} size={28} />
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-semibold">{m.code}</span>
						<span class="font-semibold tabular-nums {tone}">{fmtCompact(m.net)}</span>
					</div>
					<div class="mt-1.5 flex items-center gap-2">
						<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
							<div class="h-full rounded-full {bar}" style="width: {width}%"></div>
						</div>
						<span class="text-muted w-14 text-right text-xs tabular-nums">
							{fmtPct(m.percent)}
						</span>
					</div>
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

<svelte:head>
	<title>Foreign Flow · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
	<div>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Earth size={26} class="text-accent" aria-hidden="true" />
			Foreign <span class="gradient-text">Flow</span>
		</h1>
		<p class="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
			Pantau ke mana investor asing mengalirkan dana di pasar reguler.
			<LastUpdated sessionDate={data?.date} />
		</p>
	</div>

	<RegimeBanner />

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<section class="card card-hover p-5">
			<div class="flex items-center justify-between">
				<p
					class="text-muted flex items-center gap-1 text-xs font-semibold tracking-widest uppercase"
				>
					Posisi asing · {data?.date ?? "-"}
					<InfoHint
						text="Selisih total beli dikurangi total jual oleh investor asing. Hijau = asing net masuk, merah = asing net keluar."
					/>
				</p>
				{#if data}
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-semibold {isNetIn
							? 'badge-buy'
							: 'badge-sell'}"
					>
						{isNetIn ? "Net masuk" : "Net keluar"}
					</span>
				{/if}
			</div>
			{#if flow.isLoading || !data}
				<Skeleton class="mt-3 h-24" />
			{:else}
				<p class="mt-3 text-3xl font-bold tabular-nums {isNetIn ? 'text-up' : 'text-down'}">
					{isNetIn ? "+" : "-"}Rp {fmtCompact(Math.abs(net) || null)}
				</p>
				<div class="mt-4">
					<div class="flex h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
						<div class="h-full bg-up" style="width: {buyShare}%"></div>
						<div class="h-full bg-down" style="width: {100 - buyShare}%"></div>
					</div>
					<div class="text-muted mt-2 flex justify-between text-xs tabular-nums">
						<span>Beli Rp {fmtCompact(buy)}</span>
						<span>Jual Rp {fmtCompact(sell)}</span>
					</div>
				</div>
			{/if}
		</section>

		<section class="card p-5 lg:col-span-2">
			<div class="flex items-center justify-between">
				<p class="text-muted text-xs font-semibold tracking-widest uppercase">Tren harian</p>
				<div class="text-muted flex items-center gap-3 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-up"></span>Masuk
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-down"></span>Keluar
					</span>
				</div>
			</div>
			<div class="mt-3">
				{#if flow.error}
					<ErrorState
						message="Gagal memuat: {flow.error instanceof Error
							? flow.error.message
							: String(flow.error)}"
					/>
				{:else if flow.isLoading}
					<Skeleton class="h-48" />
				{:else if chartData.length === 0}
					<EmptyState message="Belum ada data foreign flow." />
				{:else}
					<Bars
						labels={chartData.map((d) => d.label)}
						series={[
							{
								name: "Net asing",
								values: chartData.map((d) => d.net),
								color: "var(--chart-net-up)",
								colors: chartData.map((d) =>
									d.net >= 0 ? "var(--chart-net-up)" : "var(--chart-net-down)"
								),
								fmt: (v) =>
									`${v >= 0 ? "Asing masuk" : "Asing keluar"} Rp ${Math.abs(v).toFixed(1)} miliar`
							}
						]}
						height={190}
						maxBarSize={26}
						radius={4}
						refY={0}
						yFmt={(v) => fmtNum(Math.round(v))}
					/>
				{/if}
			</div>
		</section>
	</div>

	<section class="card p-5">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="text-base font-semibold">Saham paling banyak disentuh asing</h2>
				<p class="text-muted text-sm">Akumulasi (beli) atau distribusi (jual) terbesar hari ini.</p>
			</div>
			<div
				role="tablist"
				aria-label="Arah arus asing"
				class="flex gap-1 border-b border-[var(--border)]"
			>
				{#each TABS as t (t.value)}
					{@const Icon = t.icon}
					{@const active = side === t.value}
					<button
						type="button"
						role="tab"
						aria-selected={active}
						onclick={() => (side = t.value)}
						class="-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none {active
							? 'border-[var(--accent)] text-[var(--fg)]'
							: 'border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'}"
					>
						<Icon
							size={15}
							aria-hidden="true"
							class={active ? (t.value === "in" ? "text-up" : "text-down") : "opacity-70"}
						/>
						{t.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-2">
			{#if flow.isLoading || !data}
				<Skeleton class="mt-4 h-64" />
			{:else if flow.error}
				<!-- Pesan error sudah tampil di kartu tren harian. -->
			{:else if movers.length === 0}
				<EmptyState />
			{:else}
				{@render moverList(movers, side, maxMover)}
			{/if}
		</div>
	</section>

	<p class="text-muted text-xs leading-relaxed">
		Catatan: IDX mempublikasikan volume asing dalam lembar saham; nilai rupiah di atas adalah estimasi
		notional (lembar × close). Data diperbarui tiap hari bursa (EOD). Net beli besar bukan jaminan
		harga naik.
	</p>
</main>
