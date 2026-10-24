import { runBacktest } from '#lib/api.ts';
import { useBacktestConfig, useWatchlist } from '#lib/hooks.svelte.ts';
import type { BacktestResult, StrategyInfo } from '#lib/types.ts';
import { COST_PRESETS, type CostPct, type PeriodId, type TabId } from '#lib/backtest/constants.ts';
import {
	costPctFromDefaults,
	costsPayload,
	defaultsFor,
	periodStart
} from '#lib/backtest/format.ts';

/**
 * State halaman backtest dalam satu kelas supaya form, ringkasan, dan tab
 * membaca sumber yang sama. Halaman cukup membuat satu instance di `<script>`
 * lalu meneruskannya ke komponen.
 */
export class BacktestState {
	readonly configQuery = useBacktestConfig();
	readonly watchlistQuery = useWatchlist();

	// ---------------------------------------------------------------- masukan
	strategyId = $state('');
	params = $state<Record<string, number>>({});
	codes = $state('');
	period = $state<PeriodId>('1Y');
	cash = $state(100_000_000);
	rebalance = $state('');
	costPct = $state<CostPct | null>(null);
	showAdvanced = $state(false);
	tab = $state<TabId>('ringkasan');

	// ------------------------------------------------------------------ hasil
	result = $state<BacktestResult | null>(null);
	error = $state<string | null>(null);
	loading = $state(false);

	readonly config = $derived(this.configQuery.data);
	readonly configError = $derived(this.configQuery.error);
	readonly configLoading = $derived(this.configQuery.isLoading);
	readonly watchlist = $derived(this.watchlistQuery.data);

	readonly strategies = $derived(this.config?.strategies);
	readonly current = $derived(this.strategies?.find((s) => s.id === this.strategyId) ?? null);

	readonly activeCostPreset = $derived.by(() => {
		const c = this.costPct;
		if (!c) return null;
		return (
			COST_PRESETS.find((preset) =>
				(Object.keys(preset.value) as (keyof CostPct)[]).every(
					(k) => Math.abs(preset.value[k] - c[k]) < 1e-9
				)
			)?.id ?? null
		);
	});

	readonly codelist = $derived(
		this.codes
			.split(',')
			.map((c) => c.trim().toUpperCase())
			.filter(Boolean)
	);

	readonly ready = $derived(Boolean(this.strategyId) && this.codelist.length > 0 && !this.loading);

	readonly alpha = $derived(
		this.result ? this.result.metrics.total_return - this.result.benchmark.total_return : 0
	);

	readonly costErosion = $derived(
		this.result ? this.result.gross_metrics.total_return - this.result.metrics.total_return : 0
	);

	readonly cadenceLabel = $derived.by(() => {
		const r = this.result;
		if (!r) return '';
		return this.config?.rebalance_options.find((o) => o.id === r.rebalance)?.label ?? r.rebalance;
	});

	constructor() {
		// Seed form dari konfigurasi & watchlist sekali saja; keduanya bisa datang
		// belakangan, jadi tidak bisa diisi saat inisialisasi state.
		$effect(() => {
			const c = this.config;
			if (!c) return;
			if (!this.costPct) this.costPct = costPctFromDefaults(c.cost_defaults);
			if (!this.rebalance) this.rebalance = c.rebalance_default;
		});

		$effect(() => {
			const rows = this.watchlist;
			if (this.codes === '' && rows?.length) {
				this.codes = rows
					.slice(0, 10)
					.map((r) => r.code)
					.join(', ');
			}
		});
	}

	choose(info: StrategyInfo) {
		this.strategyId = info.id;
		this.params = defaultsFor(info);
		this.result = null;
		this.error = null;
	}

	handleParam(key: string, raw: string) {
		const value = Number(raw);
		this.params = { ...this.params, [key]: Number.isFinite(value) ? value : 0 };
	}

	handleCost(key: keyof CostPct, raw: string) {
		const value = Number(raw);
		const c = this.costPct;
		if (c) this.costPct = { ...c, [key]: Number.isFinite(value) ? value : 0 };
	}

	useWatchlistForCodes() {
		this.codes = (this.watchlist ?? [])
			.slice(0, 10)
			.map((r) => r.code)
			.join(', ');
	}

	async onRun() {
		const c = this.costPct;
		if (!this.strategyId || !this.codes.trim() || !c || !this.rebalance) return;
		this.loading = true;
		this.error = null;
		try {
			this.result = await runBacktest({
				strategy: this.strategyId,
				codes: this.codelist,
				start: periodStart(this.period),
				initial_cash: this.cash,
				params: this.params,
				costs: costsPayload(c),
				rebalance: this.rebalance
			});
			this.tab = 'ringkasan';
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			this.result = null;
		} finally {
			this.loading = false;
		}
	}
}
