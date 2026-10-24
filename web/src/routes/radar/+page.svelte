<script lang="ts">
	import { ChevronRight, Radar, TrendingDown, TrendingUp, type LucideIcon } from "@lucide/svelte";
	import { useSmartMoneyRadar } from "#lib/hooks.svelte.ts";
	import { fmtCompact, fmtNum } from "#lib/format.ts";
	import type { SmartMoneyRadarRow } from "#lib/types.ts";
	import InfoHint from "#lib/components/InfoHint.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import Skeleton from "#lib/components/Skeleton.svelte";
	import LastUpdated from "#lib/components/LastUpdated.svelte";
	import TickerLogo from "#lib/components/TickerLogo.svelte";
	import SmartMoneyTrackRecordCard from "#lib/components/SmartMoneyTrackRecordCard.svelte";
	import SmartMoneyPatternsBoard from "#lib/components/SmartMoneyPatternsBoard.svelte";

	/** Jendela waktu agregasi (hari bursa). */
	const WINDOWS = [
		{ days: 1, label: "Hari ini" },
		{ days: 5, label: "1 minggu" },
		{ days: 10, label: "2 minggu" },
		{ days: 21, label: "1 bulan" }
	];

	type Side = "akumulasi" | "distribusi";

	const SIDES: { key: Side; label: string; hint: string; icon: LucideIcon }[] = [
		{
			key: "akumulasi",
			label: "Asing sedang borong",
			hint: "Dana asing net beli",
			icon: TrendingUp
		},
		{
			key: "distribusi",
			label: "Asing sedang lepas",
			hint: "Dana asing net jual",
			icon: TrendingDown
		}
	];

	let days = $state(10);
	let side = $state<Side>("akumulasi");

	const radar = useSmartMoneyRadar(() => days);
	const data = $derived(radar.data);
	const acc = $derived(data?.accumulation ?? []);
	const dist = $derived(data?.distribution ?? []);
	const hasAny = $derived(acc.length > 0 || dist.length > 0);
	const rows = $derived(side === "akumulasi" ? acc : dist);
</script>

{#snippet radarList(rows: SmartMoneyRadarRow[], side: Side, days: number)}
	{@const isAcc = side === "akumulasi"}
	{@const maxAbs = Math.max(...rows.map((r) => Math.abs(r.net_sum_idr ?? 0)), 1)}
	{#if rows.length === 0}
		<EmptyState
			message={`Belum ada emiten yang ${isAcc
				? "diborong"
				: "dilepas"} asing dalam ${WINDOWS.find((w) => w.days === days)?.label.toLowerCase() ?? `${days} sesi`} terakhir.`}
		/>
	{:else}
		<ul class="divide-y divide-[var(--border)]">
			{#each rows as r, i (r.code)}
				{@const value = Math.abs(r.net_sum_idr ?? 0)}
				<li>
					<a
						href="/radar/{r.code}"
						class="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-white/[0.03] sm:px-3"
					>
						<span class="text-muted w-5 shrink-0 text-center text-xs tabular-nums">{i + 1}</span>
						<TickerLogo code={r.code} size={32} />
						<span class="min-w-0 flex-1">
							<span class="flex items-baseline gap-2">
								<span class="text-sm font-bold">{r.code}</span>
								{#if r.name}
									<span class="text-muted hidden truncate text-xs sm:inline">{r.name}</span>
								{/if}
							</span>
							<span class="relative mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/5">
								<span
									class="absolute inset-y-0 left-0 rounded-full {isAcc ? 'bg-up' : 'bg-down'}"
									style="width: {(value / maxAbs) * 100}%"
								></span>
							</span>
						</span>
						<span class="flex shrink-0 flex-col items-end">
							<span
								class="text-sm font-bold tabular-nums {isAcc ? 'text-up' : 'text-down'}"
							>
								{isAcc ? "+" : "−"}Rp {fmtCompact(value)}
							</span>
							<span class="text-muted flex items-center gap-1.5 text-[11px] tabular-nums">
								{fmtNum(r.netval_pct, 1)}% dari transaksi
								{#if (r.streak ?? 0) >= 3}
									<span
										class="rounded bg-white/10 px-1 font-semibold {isAcc
											? 'text-up'
											: 'text-down'}"
										title="{r.streak} sesi berturut-turut"
									>
										{r.streak} hari berturut
									</span>
								{/if}
							</span>
						</span>
						<ChevronRight
							size={16}
							class="text-muted shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
							aria-hidden
						/>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<svelte:head>
	<title>Radar Smart Money · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
	<!-- Header -->
	<header class="space-y-1">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Radar size={26} class="text-accent" aria-hidden />
			Radar <span class="gradient-text">Smart Money</span>
		</h1>
		<p class="text-muted text-sm">
			Saham yang sedang paling banyak diborong atau dilepas investor asing.
			{#if data}<LastUpdated sessionDate={data.date} />{/if}
		</p>
	</header>

	<!-- Panduan singkat -->
	<div
		class="text-muted flex items-start gap-2 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3.5 text-sm leading-relaxed"
	>
		<span class="flex-1">
			Tap emiten untuk melihat detail jejaknya. Angka di kanan adalah total uang asing yang masuk
			(hijau) atau keluar (merah) dalam periode yang kamu pilih.
		</span>
		<InfoHint
			text="Smart money di sini = investor asing (IDX menggabungkan semua firma asing; tidak ada breakdown per firma di data gratis). Verdict dari porsi nilai transaksi yang dibeli/dijual asing, bukan skor. Lantai likuiditas: nilai transaksi periode >= Rp 500 juta. Ini alat riset, bukan rekomendasi jual/beli."
		/>
	</div>

	<!-- Pemilih periode -->
	<div class="flex flex-wrap gap-1.5" role="group" aria-label="Periode">
		{#each WINDOWS as w (w.days)}
			<button
				type="button"
				onclick={() => (days = w.days)}
				aria-pressed={days === w.days}
				class="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors {days === w.days
					? 'bg-[var(--accent)] text-white'
					: 'border border-[var(--border)] text-muted hover:text-[var(--fg)]'}"
			>
				{w.label}
			</button>
		{/each}
	</div>

	<div class="grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
		{#if radar.error}
			<ErrorState
				message="Gagal memuat radar: {radar.error instanceof Error
					? radar.error.message
					: String(radar.error)}"
			/>
		{:else if radar.isLoading || !data}
			<Skeleton class="h-80" />
		{:else if !hasAny}
			<EmptyState
				message="Belum ada data aliran asing yang cukup. Data EOD perlu diisi lewat `idx serve`."
			/>
		{:else}
			<section class="card overflow-hidden p-0">
				<!-- Tab sisi: akumulasi vs distribusi -->
				<div
					role="tablist"
					aria-label="Arah aliran asing"
					class="grid grid-cols-2 border-b border-[var(--border)]"
				>
					{#each SIDES as s (s.key)}
						{@const active = side === s.key}
						{@const count = s.key === "akumulasi" ? acc.length : dist.length}
						{@const Icon = s.icon}
						{@const tone = s.key === "akumulasi" ? "text-up" : "text-down"}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (side = s.key)}
							class="flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors {active
								? 'border-b-2 border-[var(--accent)] text-[var(--fg)]'
								: 'border-b-2 border-transparent text-muted hover:text-[var(--fg)]'}"
						>
							<Icon size={16} class={tone} aria-hidden />
							<span>{s.label}</span>
							<span
								class="rounded-full px-1.5 text-[10px] font-bold tabular-nums {active
									? `${tone} bg-white/10`
									: 'bg-white/5 text-muted'}"
							>
								{count}
							</span>
						</button>
					{/each}
				</div>
				<p class="text-muted px-4 pt-3 text-xs">
					{SIDES.find((s) => s.key === side)?.hint} · {WINDOWS.find((w) => w.days === days)?.label.toLowerCase()}
					terakhir
				</p>
				<div class="px-1 pb-2 sm:px-2">
					{@render radarList(rows, side, days)}
				</div>
			</section>
		{/if}

		<div class="min-w-0">
			<SmartMoneyPatternsBoard class="h-full" />
		</div>

		<div class="min-w-0 lg:col-span-2">
			<SmartMoneyTrackRecordCard />
		</div>
	</div>

	<p class="text-muted text-xs leading-relaxed">
		Data EOD IDX (delayed ~5–15 menit, diperbarui tiap hari bursa). Nilai rupiah = volume saham asing ×
		harga penutupan
		{data ? ` · dipindai dari ${fmtNum(data.scanned)} emiten` : ""}.
	</p>
</main>
