<script lang="ts">
	import {
		BookOpen,
		ChartColumn,
		ChartLine,
		Coins,
		FlaskConical,
		Info,
		Play,
		ScrollText,
		Settings2,
		Trophy,
		type LucideIcon
	} from '@lucide/svelte';
	import { runBacktest } from '#lib/api.ts';
	import { fmtCompact } from '#lib/format.ts';
	import { useBacktestConfig, useWatchlist } from '#lib/hooks.svelte.ts';
	import type {
		BacktestMetrics,
		BacktestResult,
		CostModelInfo,
		CostSettings,
		StrategyInfo
	} from '#lib/types.ts';
	import Card from '#lib/components/Card.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import EquityCurveChart from '#lib/components/EquityCurveChart.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import InfoHint from '#lib/components/InfoHint.svelte';
	import LastUpdated from '#lib/components/LastUpdated.svelte';
	import RebalanceLedger from '#lib/components/RebalanceLedger.svelte';
	import RegimeBanner from '#lib/components/RegimeBanner.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	const PERIODS = [
		{ id: '6M', label: '6 Bulan', months: 6 },
		{ id: '1Y', label: '1 Tahun', months: 12 },
		{ id: '3Y', label: '3 Tahun', months: 36 },
		{ id: 'ALL', label: 'Semua', months: null }
	] as const;

	type PeriodId = (typeof PERIODS)[number]['id'];
	type Tone = 'up' | 'down' | 'neutral';

	/** Knob biaya dalam persen di UI; API menerima pecahan (0,0015 = 0,15%). */
	type CostPct = { commission: number; tax: number; slippage: number; adv: number };

	const COST_PRESETS: { id: string; label: string; desc: string; value: CostPct }[] = [
		{
			id: 'zero',
			label: 'Tanpa biaya',
			desc: 'Batas atas teoretis — komisi, pajak, slippage, dan cap likuiditas dimatikan.',
			value: { commission: 0, tax: 0, slippage: 0, adv: 0 }
		},
		{
			id: 'standard',
			label: 'Standar IDX',
			desc: 'Komisi 0,15%/sisi, pajak jual 0,1%, slippage 0,1%, cap likuiditas 2% nilai transaksi harian.',
			value: { commission: 0.15, tax: 0.1, slippage: 0.1, adv: 2 }
		},
		{
			id: 'conservative',
			label: 'Konservatif',
			desc: 'Komisi 0,25%/sisi, slippage 0,25%, cap likuiditas 1% — untuk saham berlikuiditas rendah.',
			value: { commission: 0.25, tax: 0.1, slippage: 0.25, adv: 1 }
		}
	];

	const COST_FIELDS: { key: keyof CostPct; label: string; hint: string; step: number }[] = [
		{
			key: 'commission',
			label: 'Komisi (%/sisi)',
			hint: 'Biaya jasa sekuritas tiap kali membeli atau menjual.',
			step: 0.05
		},
		{
			key: 'tax',
			label: 'Pajak jual (%)',
			hint: 'Pajak penjualan saham 0,1% yang dipotong saat menjual.',
			step: 0.05
		},
		{
			key: 'slippage',
			label: 'Slippage (%/sisi)',
			hint: 'Selisih harga beli/jual nyata dari harga yang diharapkan.',
			step: 0.05
		},
		{
			key: 'adv',
			label: 'Cap likuiditas (% ADTV)',
			hint: 'Batas porsi order terhadap nilai transaksi harian emiten; 0 berarti tanpa batas.',
			step: 0.5
		}
	];

	type TabId = 'ringkasan' | 'kurva' | 'perbandingan' | 'biaya' | 'ledger';

	const TABS: { id: TabId; label: string; hint: string; icon: LucideIcon }[] = [
		{ id: 'ringkasan', label: 'Ringkasan', hint: 'Hasil utama', icon: Trophy },
		{ id: 'kurva', label: 'Kurva Modal', hint: 'Pertumbuhan modal', icon: ChartLine },
		{
			id: 'perbandingan',
			label: 'Perbandingan',
			hint: 'Strategi vs beli-tahan',
			icon: ChartColumn
		},
		{ id: 'biaya', label: 'Biaya', hint: 'Yang menggerus untung', icon: Coins },
		{ id: 'ledger', label: 'Jejak Transaksi', hint: 'Tiap sesi rebalance', icon: ScrollText }
	];

	function costPctFromDefaults(d: CostModelInfo): CostPct {
		return {
			commission: d.commission_pct * 100,
			tax: d.sell_tax_pct * 100,
			slippage: d.slippage_pct * 100,
			adv: d.max_adv_pct * 100
		};
	}

	function costsPayload(c: CostPct): CostSettings {
		return {
			commission_pct: c.commission / 100,
			sell_tax_pct: c.tax / 100,
			slippage_pct: c.slippage / 100,
			max_adv_pct: c.adv / 100
		};
	}

	function costModelLabel(c: CostModelInfo): string {
		const asPct = (v: number) => `${+(v * 100).toFixed(3)}%`;
		return [
			`Komisi ${asPct(c.commission_pct)}/sisi`,
			`pajak jual ${asPct(c.sell_tax_pct)}`,
			`slippage ${asPct(c.slippage_pct)}/sisi`,
			`cap likuiditas ${asPct(c.max_adv_pct)} ADTV`
		].join(' · ');
	}

	function defaultsFor(info: StrategyInfo): Record<string, number> {
		return Object.fromEntries(info.params.map((p) => [p.key, p.default]));
	}

	function periodStart(id: PeriodId): string | undefined {
		const months = PERIODS.find((p) => p.id === id)?.months ?? null;
		if (months === null) return undefined; // seluruh riwayat
		const d = new Date();
		d.setMonth(d.getMonth() - months);
		return d.toISOString().slice(0, 10);
	}

	function pct(v: number | null | undefined, digits = 2): string {
		if (v === null || v === undefined) return '-';
		return `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;
	}

	/** Persen tanpa tanda — dipakai saat tandanya sudah jelas dari label. */
	function pctMag(v: number | null | undefined, digits = 2): string {
		if (v === null || v === undefined) return '-';
		return `${(Math.abs(v) * 100).toFixed(digits)}%`;
	}

	function decimals(v: number | null | undefined, digits = 2): string {
		if (v === null || v === undefined) return '-';
		return v.toFixed(digits);
	}

	function toneOf(v: number | null | undefined): Tone {
		if (v === null || v === undefined || v === 0) return 'neutral';
		return v > 0 ? 'up' : 'down';
	}

	function toneClass(tone?: Tone): string {
		if (tone === 'up') return 'text-up';
		if (tone === 'down') return 'text-down';
		return '';
	}

	const configQuery = useBacktestConfig();
	const config = $derived(configQuery.data);
	const configError = $derived(configQuery.error);
	const configLoading = $derived(configQuery.isLoading);

	const watchlistQuery = useWatchlist();
	const watchlist = $derived(watchlistQuery.data);

	const strategies = $derived(config?.strategies);

	let strategyId = $state('');
	let params = $state<Record<string, number>>({});
	let codes = $state('');
	let period = $state<PeriodId>('1Y');
	let cash = $state(100_000_000);
	let rebalance = $state('');
	let costPct = $state<CostPct | null>(null);
	let result = $state<BacktestResult | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let tab = $state<TabId>('ringkasan');
	let showAdvanced = $state(false);

	const current = $derived(strategies?.find((s) => s.id === strategyId) ?? null);

	const activeCostPreset = $derived.by(() => {
		const c = costPct;
		if (!c) return null;
		return (
			COST_PRESETS.find((preset) =>
				(Object.keys(preset.value) as (keyof CostPct)[]).every(
					(k) => Math.abs(preset.value[k] - c[k]) < 1e-9
				)
			)?.id ?? null
		);
	});

	// Seed form dari konfigurasi & watchlist sekali saja; keduanya bisa datang
	// belakangan, jadi tidak bisa diisi saat inisialisasi state.
	$effect(() => {
		const c = config;
		if (!c) return;
		if (!costPct) costPct = costPctFromDefaults(c.cost_defaults);
		if (!rebalance) rebalance = c.rebalance_default;
	});

	$effect(() => {
		const rows = watchlist;
		if (codes === '' && rows?.length) {
			codes = rows
				.slice(0, 10)
				.map((r) => r.code)
				.join(', ');
		}
	});

	function choose(info: StrategyInfo) {
		strategyId = info.id;
		params = defaultsFor(info);
		result = null;
		error = null;
	}

	function handleParam(key: string, raw: string) {
		const value = Number(raw);
		params = { ...params, [key]: Number.isFinite(value) ? value : 0 };
	}

	function handleCost(key: keyof CostPct, raw: string) {
		const value = Number(raw);
		const c = costPct;
		if (c) costPct = { ...c, [key]: Number.isFinite(value) ? value : 0 };
	}

	const codelist = $derived(
		codes
			.split(',')
			.map((c) => c.trim().toUpperCase())
			.filter(Boolean)
	);
	const ready = $derived(Boolean(strategyId) && codelist.length > 0 && !loading);

	const alpha = $derived(result ? result.metrics.total_return - result.benchmark.total_return : 0);
	const costErosion = $derived(
		result ? result.gross_metrics.total_return - result.metrics.total_return : 0
	);
	const cadenceLabel = $derived.by(() => {
		const r = result;
		if (!r) return '';
		return config?.rebalance_options.find((o) => o.id === r.rebalance)?.label ?? r.rebalance;
	});

	async function onRun() {
		const c = costPct;
		if (!strategyId || !codes.trim() || !c || !rebalance) return;
		loading = true;
		error = null;
		try {
			const res = await runBacktest({
				strategy: strategyId,
				codes: codelist,
				start: periodStart(period),
				initial_cash: cash,
				params,
				costs: costsPayload(c),
				rebalance
			});
			result = res;
			tab = 'ringkasan';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			result = null;
		} finally {
			loading = false;
		}
	}
</script>

{#snippet stat({
	label,
	value,
	tone,
	hint
}: {
	label: string;
	value: string;
	tone?: Tone;
	hint?: string;
})}
	<div class="card p-4">
		<p class="text-muted flex items-center gap-1 text-xs">
			{label}
			{#if hint}<InfoHint text={hint} />{/if}
		</p>
		<p class="mt-1 text-xl font-bold tabular-nums {toneClass(tone)}">{value}</p>
	</div>
{/snippet}

{#snippet verdictCard({
	result,
	alpha,
	costErosion
}: {
	result: BacktestResult;
	alpha: number;
	costErosion: number;
})}
	{@const beatBenchmark = alpha > 0}
	{@const beatAfterCost = result.metrics.total_return > 0}
	{@const tone: Tone = beatBenchmark ? "up" : beatAfterCost ? "neutral" : "down"}
	{@const label = beatBenchmark
		? 'Strategi menang dari beli-tahan'
		: beatAfterCost
			? 'Untung, tapi kalah dari beli-tahan'
			: 'Strategi belum menghasilkan untung'}
	{@const accent =
		tone === 'up' ? 'var(--up)' : tone === 'down' ? 'var(--down)' : 'var(--border-strong)'}
	<div class="card p-4" style="border-left: 3px solid {accent}">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="text-base font-bold {toneClass(tone)}">{label}</p>
			<p class="text-muted text-xs tabular-nums">
				Rp {fmtCompact(result.initial_cash)} → Rp {fmtCompact(result.metrics.final_equity)}
			</p>
		</div>
		<p class="text-muted mt-2 text-sm leading-relaxed">
			Strategi <span class="font-semibold text-[var(--fg)]">{result.strategy_name}</span>
			menghasilkan
			<span class="font-semibold {toneClass(toneOf(result.metrics.total_return))}">
				{pct(result.metrics.total_return)}
			</span>
			dalam {result.days} hari bursa, sementara beli-tahan semua emiten
			<span class="font-semibold text-[var(--fg)]">{pct(result.benchmark.total_return)}</span>.
			{#if costErosion > 0.001}
				Biaya transaksi menggerus
				<span class="font-semibold text-down">{pctMag(costErosion)}</span> dari hasil kotor.
			{/if}
		</p>
	</div>
{/snippet}

{#snippet metricRow({
	label,
	gross,
	net,
	benchmark,
	tone,
	hint
}: {
	label: string;
	gross: string;
	net: string;
	benchmark: string;
	tone?: Tone;
	hint?: string;
})}
	<tr>
		<td class="text-muted">
			<span class="inline-flex items-center gap-1">
				{label}
				{#if hint}<InfoHint text={hint} />{/if}
			</span>
		</td>
		<td class="text-muted text-right tabular-nums">{gross}</td>
		<td class="text-right font-semibold tabular-nums {toneClass(tone)}">{net}</td>
		<td class="text-muted text-right tabular-nums">{benchmark}</td>
	</tr>
{/snippet}

{#snippet metricsTable({
	gross,
	net,
	benchmark
}: {
	gross: BacktestMetrics;
	net: BacktestMetrics;
	benchmark: BacktestMetrics;
})}
	<div class="overflow-x-auto">
		<table class="data-table">
			<thead>
				<tr>
					<th class="text-left">Metrik</th>
					<th class="text-right">Sebelum biaya</th>
					<th class="text-right">Setelah biaya</th>
					<th class="text-right">Beli &amp; tahan</th>
				</tr>
			</thead>
			<tbody>
				{@render metricRow({
					label: 'Total keuntungan',
					hint: 'Berapa persen modal bertambah atau berkurang selama periode uji.',
					gross: pct(gross.total_return),
					net: pct(net.total_return),
					benchmark: pct(benchmark.total_return),
					tone: toneOf(net.total_return)
				})}
				{@render metricRow({
					label: 'Rata-rata per tahun',
					hint: 'Setara keuntungan tahunan bila hasilnya diratakan (CAGR).',
					gross: pct(gross.annualized_return),
					net: pct(net.annualized_return),
					benchmark: pct(benchmark.annualized_return)
				})}
				{@render metricRow({
					label: 'Jatuh terdalam',
					hint: 'Penurunan terbesar dari puncak ke dasar selama uji (max drawdown).',
					gross: pct(-gross.max_drawdown),
					net: pct(-net.max_drawdown),
					benchmark: pct(-benchmark.max_drawdown),
					tone: 'down'
				})}
				{@render metricRow({
					label: 'Naik-turun tahunan',
					hint: 'Seberapa liar nilai portofolio bergerak (volatilitas tahunan).',
					gross: pct(gross.volatility),
					net: pct(net.volatility),
					benchmark: pct(benchmark.volatility)
				})}
				{@render metricRow({
					label: 'Imbal hasil per risiko',
					hint: 'Keuntungan dibanding naik-turunnya (Sharpe). Makin tinggi makin efisien.',
					gross: decimals(gross.sharpe),
					net: decimals(net.sharpe),
					benchmark: decimals(benchmark.sharpe)
				})}
				{@render metricRow({
					label: 'Modal akhir',
					gross: `Rp ${fmtCompact(gross.final_equity)}`,
					net: `Rp ${fmtCompact(net.final_equity)}`,
					benchmark: `Rp ${fmtCompact(benchmark.final_equity)}`
				})}
			</tbody>
		</table>
	</div>
{/snippet}

<svelte:head>
	<title>Backtest · Market Labs</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
	<div class="min-w-0">
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<FlaskConical size={26} class="text-accent" aria-hidden="true" />
			Uji Strategi <span class="gradient-text">(Backtest)</span>
		</h1>
		<p class="text-muted mt-0.5 text-sm">
			Coba sebuah strategi di data masa lalu — seolah-olah kamu sudah menjalankannya sejak dulu —
			lalu lihat hasilnya setelah biaya nyata.
		</p>
	</div>

	<RegimeBanner />

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
		<!-- --------------------------------------------------------------- form -->
		<div class="min-w-0 lg:col-span-1">
			<Card
				title="1. Pilih Strategi"
				subtitle="Aturan beli-jual yang mau diuji"
				info="Backtest = uji strategi memakai data masa lalu. Ini simulasi untuk belajar; hasil masa lalu tidak menjamin masa depan."
			>
				{#if configError}
					<ErrorState
						message="Gagal memuat konfigurasi: {configError instanceof Error
							? configError.message
							: String(configError)}"
					/>
				{:else if configLoading || !config || !costPct}
					<Skeleton class="h-72" />
				{:else}
					{@const cfg = config}
					{@const costs = costPct}
					<div class="space-y-5">
						<div class="space-y-2">
							{#each cfg.strategies as s (s.id)}
								{@const active = strategyId === s.id}
								<button
									type="button"
									onclick={() => choose(s)}
									aria-pressed={active}
									class="card card-hover flex w-full items-start gap-3 p-3 text-left {active
										? 'ring-1 ring-[var(--accent)]'
										: ''}"
								>
									<span
										aria-hidden="true"
										class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border {active
											? 'border-[var(--accent)] bg-[var(--accent)]'
											: 'border-[var(--border-strong)]'}"
									>
										{#if active}<span class="h-1.5 w-1.5 rounded-full bg-white"></span>{/if}
									</span>
									<span class="min-w-0">
										<span class="text-sm font-semibold">{s.name}</span>
										<span class="text-muted mt-1 block text-xs leading-relaxed"
											>{s.description}</span
										>
									</span>
								</button>
							{/each}
						</div>

						{#if current && current.params.length > 0}
							<div>
								<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
									Pengaturan strategi
								</p>
								<div class="grid grid-cols-2 gap-3">
									{#each current.params as p (p.key)}
										<label class="block min-w-0">
											<span class="text-muted text-xs">{p.label}</span>
											<input
												type="number"
												class="input mt-1 w-full"
												value={params[p.key] ?? p.default}
												min={p.min ?? undefined}
												max={p.max ?? undefined}
												step={p.step}
												onchange={(e) => handleParam(p.key, e.currentTarget.value)}
											/>
										</label>
									{/each}
								</div>
							</div>
						{/if}

						<div>
							<div class="mb-2 flex items-center justify-between gap-2">
								<p class="text-muted text-xs font-semibold tracking-wider uppercase">
									Emiten ({codelist.length}/{cfg.max_codes})
								</p>
								{#if watchlist?.length}
									<button
										type="button"
										class="text-muted text-xs underline decoration-dotted hover:text-[var(--fg)]"
										onclick={() =>
											(codes = (watchlist ?? [])
												.slice(0, 10)
												.map((r) => r.code)
												.join(', '))}
									>
										Pakai watchlist
									</button>
								{/if}
							</div>
							<textarea
								class="input w-full resize-y"
								rows={2}
								value={codes}
								placeholder="BBCA, BBRI, TLKM"
								onchange={(e) => (codes = e.currentTarget.value)}></textarea>
							<p class="text-muted mt-1 text-xs">
								Pisahkan dengan koma. Maksimal {cfg.max_codes} emiten.
							</p>
						</div>

						<div>
							<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
								Rentang waktu
							</p>
							<div class="flex flex-wrap gap-2">
								{#each PERIODS as p (p.id)}
									<button
										type="button"
										aria-pressed={period === p.id}
										onclick={() => (period = p.id)}
										class="chip {period === p.id ? 'chip-active' : ''}"
									>
										{p.label}
									</button>
								{/each}
							</div>
						</div>

						<button
							type="button"
							class="text-muted flex items-center gap-1 text-xs underline decoration-dotted hover:text-[var(--fg)]"
							aria-expanded={showAdvanced}
							onclick={() => (showAdvanced = !showAdvanced)}
						>
							<Settings2 size={12} />
							{showAdvanced ? 'Sembunyikan pengaturan lanjutan' : 'Pengaturan lanjutan'}
						</button>

						{#if showAdvanced}
							<div class="space-y-5 border-l-2 border-[var(--border)] pl-3">
								<div>
									<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
										Seberapa sering portofolio disusun ulang
									</p>
									<div class="flex flex-wrap gap-2">
										{#each cfg.rebalance_options as option (option.id)}
											<button
												type="button"
												title={option.description}
												aria-pressed={rebalance === option.id}
												onclick={() => (rebalance = option.id)}
												class="chip {rebalance === option.id ? 'chip-active' : ''}"
											>
												{option.label}
											</button>
										{/each}
									</div>
									<p class="text-muted mt-2 text-xs leading-relaxed">
										Di antara jadwal susun-ulang, posisi dibiarkan mengikuti pasar. Makin jarang,
										makin kecil biaya transaksinya.
									</p>
								</div>

								<label class="block min-w-0">
									<span class="text-muted text-xs">Modal awal (Rp)</span>
									<input
										type="number"
										class="input mt-1 w-full"
										value={cash}
										min={1_000_000}
										step={1_000_000}
										onchange={(e) => (cash = Number(e.currentTarget.value) || 0)}
									/>
								</label>

								<div>
									<p class="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
										Biaya &amp; likuiditas
									</p>
									<div class="flex flex-wrap gap-2">
										{#each COST_PRESETS as preset (preset.id)}
											<button
												type="button"
												title={preset.desc}
												aria-pressed={activeCostPreset === preset.id}
												onclick={() => (costPct = preset.value)}
												class="chip {activeCostPreset === preset.id ? 'chip-active' : ''}"
											>
												{preset.label}
											</button>
										{/each}
									</div>
									<div class="mt-3 grid grid-cols-2 gap-3">
										{#each COST_FIELDS as f (f.key)}
											<label class="block min-w-0">
												<span class="text-muted flex items-center gap-1 text-xs">
													{f.label}
													<InfoHint text={f.hint} />
												</span>
												<input
													type="number"
													class="input mt-1 w-full"
													value={costs[f.key]}
													min={0}
													step={f.step}
													onchange={(e) => handleCost(f.key, e.currentTarget.value)}
												/>
											</label>
										{/each}
									</div>
									<p class="text-muted mt-2 text-xs leading-relaxed">
										Model biaya: {costModelLabel(cfg.cost_defaults)}.
									</p>
								</div>
							</div>
						{/if}

						<div
							class="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--bg-elev)] px-4 pt-3 pb-1 sm:-mx-5 sm:px-5"
						>
							<button
								type="button"
								class="btn btn-primary flex w-full items-center justify-center gap-2"
								onclick={() => void onRun()}
								disabled={!ready}
							>
								<Play size={16} />
								{loading ? 'Menghitung...' : 'Jalankan Backtest'}
							</button>
							<p class="text-muted mt-2 text-center text-xs">
								{#if !strategyId}
									Pilih satu strategi dulu di atas.
								{:else if codelist.length === 0}
									Isi minimal satu kode emiten.
								{:else}
									{codelist.length} emiten · {PERIODS.find((p) => p.id === period)?.label}
								{/if}
							</p>
						</div>
					</div>
				{/if}
			</Card>
		</div>

		<!-- ------------------------------------------------------------ results -->
		<div class="min-w-0 space-y-4 lg:col-span-2">
			{#if error}
				<ErrorState message={error} />
			{/if}

			{#if !result && !error}
				<Card
					title="2. Hasil"
					info="Hasil muncul di sini setelah kamu menekan “Jalankan Backtest”."
				>
					{#if loading}
						<div class="space-y-3">
							<Skeleton class="h-20" />
							<Skeleton class="h-72" />
						</div>
					{:else}
						<EmptyState
							message="Belum ada hasil. Pilih satu strategi di panel kiri, lalu tekan “Jalankan Backtest”."
						/>
					{/if}
				</Card>
			{/if}

			{#if result}
				{@render verdictCard({ result, alpha, costErosion })}

				<div aria-label="Bagian hasil backtest" class="flex flex-wrap gap-2" role="tablist">
					{#each TABS as t (t.id)}
						{@const Icon = t.icon}
						{@const active = tab === t.id}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (tab = t.id)}
							title={t.hint}
							class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {active
								? 'border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--fg)]'
								: 'text-muted border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'}"
						>
							<Icon size={16} />
							<span>{t.label}</span>
						</button>
					{/each}
				</div>

				{#if tab === 'ringkasan'}
					<div class="space-y-4" role="tabpanel">
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{@render stat({
								label: 'Keuntungan bersih',
								hint: 'Total perubahan modal setelah semua biaya dihitung.',
								value: pct(result.metrics.total_return),
								tone: toneOf(result.metrics.total_return)
							})}
							{@render stat({
								label: 'Selisih vs beli-tahan',
								hint: 'Seberapa jauh strategi mengalahkan (atau kalah dari) cara pasif beli lalu diamkan.',
								value: pct(alpha),
								tone: toneOf(alpha)
							})}
							{@render stat({
								label: 'Jatuh terdalam',
								hint: 'Penurunan terbesar dari titik tertinggi ke titik terendah selama uji.',
								value: pct(-result.metrics.max_drawdown),
								tone: 'down'
							})}
							{@render stat({
								label: 'Imbal hasil per risiko',
								hint: 'Keuntungan dibanding naik-turunnya nilai. Makin tinggi makin efisien.',
								value: decimals(result.metrics.sharpe)
							})}
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							<div class="card p-4">
								<p class="text-muted text-xs">Modal akhir strategi</p>
								<p class="mt-1 text-xl font-bold tabular-nums">
									Rp {fmtCompact(result.metrics.final_equity)}
								</p>
								<p class="text-muted mt-2 text-xs">
									Dari modal awal Rp {fmtCompact(result.initial_cash)} →
									<span
										class={toneClass(toneOf(result.metrics.final_equity - result.initial_cash))}
									>
										{result.metrics.final_equity >= result.initial_cash ? 'untung' : 'rugi'} Rp
										{fmtCompact(Math.abs(result.metrics.final_equity - result.initial_cash))}
									</span>
								</p>
							</div>
							<div class="card p-4">
								<p class="text-muted text-xs">Yang diuji</p>
								<p class="mt-1 text-sm font-semibold">{result.strategy_name}</p>
								<p class="text-muted mt-2 text-xs leading-relaxed">
									{result.codes.length} emiten · {result.days} hari bursa ·
									{result.start} → {result.end} · susun ulang {cadenceLabel}
								</p>
							</div>
						</div>

						<Card title="Cara membaca hasil ini" subtitle="Agar tidak salah tafsir">
							<ul class="space-y-2 text-sm">
								<li class="flex gap-2">
									<Info size={16} class="text-muted mt-0.5 shrink-0" />
									<span class="min-w-0">
										<span class="font-semibold text-[var(--fg)]">Tanpa mengintip masa depan.</span>
										<span class="text-muted">
											Tiap hari simulasi hanya memakai harga dan data yang memang sudah ada saat
											itu.
										</span>
									</span>
								</li>
								<li class="flex gap-2">
									<Info size={16} class="text-muted mt-0.5 shrink-0" />
									<span class="min-w-0">
										<span class="font-semibold text-[var(--fg)]">
											Frekuensi susun-ulang itu pengungkit utama.
										</span>
										<span class="text-muted">
											Makin sering, makin besar biayanya. Coba bandingkan tab Biaya antar frekuensi.
										</span>
									</span>
								</li>
								<li class="flex gap-2">
									<Info size={16} class="text-muted mt-0.5 shrink-0" />
									<span class="min-w-0">
										<span class="font-semibold text-[var(--fg)]">Beli-tahan adalah tolok ukur.</span
										>
										<span class="text-muted">
											Kalau strategi kalah dari sekadar membeli lalu diam, strategi itu belum
											menambah nilai.
										</span>
									</span>
								</li>
								<li class="flex gap-2">
									<Info size={16} class="text-muted mt-0.5 shrink-0" />
									<span class="min-w-0">
										<span class="font-semibold text-[var(--fg)]">Ini simulasi, bukan janji.</span>
										<span class="text-muted">
											Hasil bagus di masa lalu tidak berarti bagus di masa depan.
										</span>
									</span>
								</li>
							</ul>
						</Card>
					</div>
				{/if}

				{#if tab === 'kurva'}
					<Card
						title="Kurva Modal"
						subtitle="{result.codes
							.length} emiten · {result.days} hari bursa · {result.start} → {result.end}"
						info="Grafik pertumbuhan modal dari waktu ke waktu. Garis naik = untung, turun = rugi. Perhatikan juga seberapa dalam jatuhnya, bukan cuma hasil akhirnya."
					>
						{#snippet right()}
							<LastUpdated dep={result} />
						{/snippet}
						<EquityCurveChart points={result.equity_curve} initialCash={result.initial_cash} />
					</Card>
				{/if}

				{#if tab === 'perbandingan'}
					<Card
						title="Perbandingan Hasil"
						subtitle="Modal awal Rp {fmtCompact(
							result.initial_cash
						)} · strategi {result.strategy_name}"
						info="Membandingkan hasil strategi (setelah dan sebelum biaya) dengan cara pasif beli-tahan. Berguna untuk cek: apakah strategi ini benar-benar lebih baik daripada diam memegang saham?"
					>
						{@render metricsTable({
							gross: result.gross_metrics,
							net: result.metrics,
							benchmark: result.benchmark
						})}
					</Card>
				{/if}

				{#if tab === 'biaya'}
					<Card
						title="Dampak Biaya"
						subtitle="Susun ulang {cadenceLabel} ×{result.rebalance_days} · nilai transaksi Rp {fmtCompact(
							result.cost_impact.turnover
						)} · {result.days} hari bursa"
						info="Rincian biaya (komisi, pajak, slippage) yang menggerus keuntungan. Banyak strategi terlihat cuan di atas kertas tapi rugi setelah biaya nyata dihitung."
					>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{@render stat({
								label: 'Total biaya',
								hint: 'Jumlah semua komisi, pajak, dan slippage selama periode uji.',
								value: `Rp ${fmtCompact(result.cost_impact.total_cost)}`,
								tone: 'down'
							})}
							{@render stat({
								label: 'Komisi + pajak',
								value: `Rp ${fmtCompact(result.cost_impact.total_fees)}`,
								tone: 'down'
							})}
							{@render stat({
								label: 'Slippage',
								value: `Rp ${fmtCompact(result.cost_impact.total_slippage)}`,
								tone: 'down'
							})}
							{@render stat({
								label: 'Porsi biaya dari modal',
								hint: 'Berapa persen modal yang habis hanya untuk biaya transaksi.',
								value: pctMag(result.cost_impact.cost_pct_of_equity),
								tone: 'down'
							})}
						</div>
						<p class="text-muted mt-3 text-xs leading-relaxed">
							Biaya menggerus keuntungan
							<span class="text-down font-semibold">{pctMag(costErosion)}</span>
							({pct(result.gross_metrics.total_return)} sebelum biaya →
							{pct(result.metrics.total_return)} setelah biaya).
						</p>
						<p class="text-muted mt-2 text-xs leading-relaxed">
							Model biaya: {costModelLabel(result.costs)}
						</p>
					</Card>
				{/if}

				{#if tab === 'ledger'}
					<Card
						title="Jejak Transaksi"
						subtitle="Susun ulang {cadenceLabel} · klik satu sesi untuk lihat pembelian &amp; penjualannya"
						info="Catatan setiap kali strategi menyusun ulang portofolio: saham apa yang dibeli/dijual dan berapa. Klik sebuah sesi untuk lihat detail transaksinya."
					>
						<RebalanceLedger
							events={result.rebalances}
							truncated={result.rebalances_truncated}
							total={result.total_rebalances}
						/>
					</Card>
				{/if}

				<p class="text-muted text-xs leading-relaxed">{result.disclaimer}</p>
			{/if}
		</div>
	</div>

	<Card title="Istilah singkat" subtitle="Arti kata yang sering muncul di halaman ini">
		{#snippet right()}
			<BookOpen size={16} class="text-muted" />
		{/snippet}
		<dl class="grid gap-3 text-sm sm:grid-cols-2">
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Backtest</dt>
				<dd class="text-muted">Menguji strategi memakai data masa lalu.</dd>
			</div>
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Beli &amp; tahan</dt>
				<dd class="text-muted">
					Beli semua emiten di awal lalu diamkan sampai akhir — pembanding paling jujur.
				</dd>
			</div>
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Susun ulang (rebalance)</dt>
				<dd class="text-muted">
					Momen strategi menyesuaikan kembali komposisi portofolio sesuai aturannya.
				</dd>
			</div>
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Biaya transaksi</dt>
				<dd class="text-muted">
					Komisi, pajak jual, dan slippage yang dibayar setiap kali transaksi.
				</dd>
			</div>
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Cap likuiditas</dt>
				<dd class="text-muted">
					Batas porsi order terhadap nilai transaksi harian; saham tipis hanya bisa diisi sebagian
					per hari.
				</dd>
			</div>
			<div class="min-w-0">
				<dt class="font-semibold text-[var(--fg)]">Jatuh terdalam (drawdown)</dt>
				<dd class="text-muted">
					Penurunan terbesar dari titik tertinggi ke terendah selama periode uji.
				</dd>
			</div>
		</dl>
	</Card>
</main>
