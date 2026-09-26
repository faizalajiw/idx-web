// TypeScript mirrors of the FastAPI Pydantic response schemas.

export interface IndexOverview {
  code: string;
  close: number | null;
  change: number | null;
  percent: number | null;
  current: number | null;
  captured_at: string | null;
}

export interface MarketTotals {
  total_volume: number | null;
  total_value: number | null;
  stock_count: number;
}

export interface Mover {
  code: string;
  close: number | null;
  percent: number | null;
}

export interface MarketOverview {
  index: IndexOverview | null;
  totals: MarketTotals;
  top_gainers: Mover[];
  top_losers: Mover[];
}

/** Regime IHSG + volatilitas ter-annualisasi (banner konteks). */
export interface MarketRegime {
  regime: "TRENDING_UP" | "TRENDING_DOWN" | "TRANSITION" | "RANGING" | null;
  adx: number | null;
  plus_di: number | null;
  minus_di: number | null;
  realized_vol_annual: number | null;
  vol_state: "VOLATILE" | "NORMAL" | "QUIET" | null;
  source: string | null;
  as_of: string | null;
  dir_hint: "up" | "down" | null;
}

export interface SessionMovers {
  date: string | null;
  captured_at: string | null;
  top_gainers: Mover[];
  top_losers: Mover[];
}

export interface BrokerRow {
  broker: string;
  code: string | null;
  buy_value: number;
  sell_value: number;
  net: number;
  buy_rank: number | null;
  sell_rank: number | null;
  estimated: boolean;
}

export interface StockBrokerSummary {
  code: string;
  name: string | null;
  date: string | null;
  top_buyers: BrokerRow[];
  top_sellers: BrokerRow[];
}

export interface SectorRow {
  sector: string;
  stock_count: number;
  avg_percent: number | null;
  total_value: number | null;
  total_foreign_net: number | null;
  gainers: number;
  losers: number;
  top_stock: { code: string; percent: number | null } | null;
}

export interface SectorAnalysis {
  date: string | null;
  sectors: SectorRow[];
}

export interface RRGPoint {
  sector: string;
  date: string;
  rs_ratio: number;
  rs_momentum: number;
}

export interface SectorRRG {
  benchmark: string;
  window: number;
  date: string | null;
  points: RRGPoint[];
}

export interface ValuationResponse {
  undervalued: ValuationRow[];
  overvalued: ValuationRow[];
}

export interface ForeignFlowDay {
  date: string;
  buy: number | null;
  sell: number | null;
  net: number | null;
}

export interface ForeignFlow {
  date: string | null;
  total_net: number | null;
  total_buy: number | null;
  total_sell: number | null;
  days: ForeignFlowDay[];
  top_net_in: { code: string; name: string | null; net: number | null; percent: number | null }[];
  top_net_out: { code: string; name: string | null; net: number | null; percent: number | null }[];
}

export interface ValuationRow {
  code: string;
  name: string | null;
  close: number | null;
  z_score: number | null;
  momentum_pct: number | null;
  rsi: number | null;
  trend_up: boolean;
  target_price: number | null;
}

export interface NarrationSection {
  title: string;
  icon: string;
  tone: "up" | "down" | "neutral";
  text: string;
}

export interface MarketNarration {
  date: string | null;
  generated_at: string | null;
  sections: NarrationSection[];
}

export interface ScreenerRow {
  code: string;
  name: string | null;
  close: number | null;
  percent: number | null;
  rsi: number | null;
  signal: string;
  trend_up: boolean;
  momentum_20d: number | null;
  vol_ratio: number | null;
  /** ATR(14) sebagai % dari close — volatilitas komparabel antar emiten. */
  atr_pct: number | null;
  /** Jarak dari puncak 52 minggu, % (≤ 0; null bila histori < 63 hari). */
  dist_52w: number | null;
  /** Hari bursa sejak sinyal BUY/SELL terakhir (null = belum pernah). */
  days_since_signal: number | null;
  foreign_net: number | null;
  value: number | null;
  hist_days: number;
}

export interface ScreenerFilters {
  signal?: string;
  rsi_min?: number;
  rsi_max?: number;
  min_momentum?: number;
  max_momentum?: number;
  min_value?: number;
  foreign_in_only?: boolean;
  min_vol_ratio?: number;
  min_days?: number;
  limit?: number;
}

export interface WatchlistRow {
  code: string;
  close: number | null;
  change: number | null;
  percent: number | null;
  volume: number | null;
  foreign_net: number | null;
  hist_days: number;
}

export interface Signal {
  code: string;
  signal: "BUY" | "SELL" | "HOLD" | string;
  close: number | null;
  pct: number | null;
  rsi: number | null;
  sma20: number | null;
  macd: number | null;
  trend_up: boolean;
  live: boolean;
}

export interface PriceBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface IndicatorBar extends PriceBar {
  ma_short: number | null;
  ma_long: number | null;
  rsi: number | null;
  bb_upper: number | null;
  bb_lower: number | null;
  macd: number | null;
  macd_signal: number | null;
}

export interface TechnicalChart {
  code: string;
  signal: string;
  bars: IndicatorBar[];
}

export interface HoldCheckItem {
  code: string;
  name: string | null;
  signal: string;
  trend_up: boolean;
  rsi: number | null;
  macd_bullish: boolean;
  bb_position: string | null;
  z_score: number | null;
  below_target_pct: number | null;
  foreign_net: number | null;
  score: number;
  /** Skor teknikal+valuasi sebelum lapisan faktor IC (null = lapisan tidak aktif). */
  base_score: number | null;
  /** Penyesuaian skor dari lapisan faktor IC, poin (-10..+10). */
  factor_adj: number | null;
  /** Percentile cross-sectional pasar per faktor (0..1); null = emiten di luar coverage ranking. */
  factor_pct: {
    vol_pct: number;
    turnover_pct: number;
    dist_52w_pct: number;
  } | null;
  verdict: string;
  reasons: string[];
}

export interface HoldCheckResponse {
  date: string | null;
  items: HoldCheckItem[];
}

// ---------------------------------------------------------------- data quality

export interface QualityOverview {
  raw_rows: number;
  raw_codes: number;
  trading_days: number;
  first_day: string | null;
  last_day: string | null;
  pit_rows: number;
  quarantine_rows: number;
  corp_actions: number;
  last_ingest: string | null;
  staleness_hours: number | null;
}

export interface QuarantineRow {
  code: string | null;
  trade_date: string | null;
  reason: string;
  payload: Record<string, unknown> | null;
  ingested_at: string | null;
}

export interface QuarantineReason {
  reason: string;
  count: number;
}

export interface CoverageGaps {
  window: { first: string; last: string } | null;
  covered_days: number;
  missing_weekdays: string[];
}

export interface ThinDay {
  trade_date: string;
  codes: number;
}

export interface QualityDuplicates {
  multi_versioned_bars: number;
}

// --------------------------------------------------------------- research UI

export interface StockEventRow {
  event: string;
  description: string;
  my_count: number;
  my_last_date: string | null;
  my_median_fwd: number | null;
  my_median_abnormal: number | null;
  market_count: number;
  market_hit_rate: number | null;
  market_median_fwd: number | null;
  market_mean_abnormal: number | null;
}

export interface StockEvents {
  code: string;
  as_of: string;
  events: StockEventRow[];
}

export interface FactorRow {
  factor: string;
  horizon: number;
  mean_ic: number | null;
  icir: number | null;
  t_stat: number | null;
  hit_rate: number | null;
  n_days: number | null;
  eligible: boolean;
  weight: number | null;
}

export interface FactorsOverview {
  latest_run: string | null;
  weights: Record<string, number>;
  factors: FactorRow[];
  history: { run_date: string; rows: number; eligible: number }[];
}

export interface RegimeDay {
  date: string;
  regime: "TRENDING_UP" | "TRENDING_DOWN" | "TRANSITION" | "RANGING" | null;
  adx: number | null;
  realized_vol: number | null;
}

export interface RegimeHistory {
  recent: RegimeDay[];
  summary: {
    days: number;
    first?: string;
    last?: string;
    share: Record<string, number>;
    transitions: number;
    avg_adx: number | null;
  } | null;
}

export interface CorpActionSummary {
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

// ---------------------------------------------------------------- alerts

/** One kind of watch condition the user can pick. */
export interface AlertRuleType {
  id: string;
  label: string;
  description: string;
  unit: string; // "IDR" | "RSI" | "x"
  default: number;
  min: number | null;
  max: number | null;
  step: number;
}

export interface AlertRuleCreate {
  code: string;
  type: string;
  threshold: number;
  note?: string | null;
}

/** A stored rule plus its live value and current verdict. */
export interface AlertRuleStatus {
  id: string;
  code: string;
  type: string;
  type_label: string;
  threshold: number;
  unit: string;
  note: string | null;
  created_at: string | null;
  current: number | null;
  close: number | null;
  percent: number | null;
  rsi: number | null;
  vol_ratio: number | null;
  signal: string | null;
  triggered: boolean;
  message: string;
}

export interface AlertStatus {
  checked_at: string;
  telegram_enabled: boolean;
  rule_types: AlertRuleType[];
  rules: AlertRuleStatus[];
  triggered_count: number;
}

export interface AlertTestResult {
  sent: boolean;
  detail: string;
}

// --------------------------------------------------- dividends & corp actions

/**
 * Dividend activity counts plus the trailing-yield distribution. There is no
 * "total cash distributed": cash_amount is per share, so summing it across
 * emiten would be meaningless.
 */
export interface DividendTotals {
  events: number;
  codes: number;
  splits: number;
  first_ex_date: string | null;
  last_ex_date: string | null;
  ttm_events: number;
  ttm_codes: number;
  avg_ttm_yield: number | null;
  median_ttm_yield: number | null;
  max_ttm_yield: number | null;
}

/** One calendar year of dividend activity (bar chart). */
export interface DividendYear {
  year: number;
  events: number;
  codes: number;
}

/** A cash dividend just paid out; the feed carries no forward calendar. */
export interface DividendRecent {
  code: string;
  name: string | null;
  ex_date: string | null;
  cash_amount: number | null;
  close: number | null;
}

/** Trailing dividend yield: last 12 months of cash / latest close. */
export interface DividendYielder {
  code: string;
  name: string | null;
  close: number | null;
  ttm_cash: number;
  ttm_events: number;
  yield_pct: number | null;
}

export interface DividendOverview {
  as_of: string | null;
  generated_at: string | null;
  ttm_days: number;
  recent_days: number;
  totals: DividendTotals;
  by_year: DividendYear[];
  recent: DividendRecent[];
  top_yield: DividendYielder[];
  disclaimer: string;
}

/** One row of the all-emiten dividend table. */
export interface DividendStock extends DividendYielder {
  total_events: number;
  /** Per-share cash summed over the whole history; not split-adjusted. */
  total_cash_per_share: number;
  first_ex_date: string | null;
  last_ex_date: string | null;
}

export interface DividendPayment {
  ex_date: string | null;
  cash_amount: number | null;
}

export interface DividendAnnual {
  year: number;
  cash: number;
  events: number;
}

export interface SplitAction {
  ex_date: string | null;
  action_type: string;
  ratio: number | null;
}

/** Per-emiten dividend history + split history. */
export interface DividendDetail {
  code: string;
  name: string | null;
  as_of: string | null;
  close: number | null;
  ttm_cash: number;
  ttm_events: number;
  yield_pct: number | null;
  /** Per-share cash over the whole history — NOT split-adjusted. */
  total_cash: number;
  total_events: number;
  first_ex_date: string | null;
  last_ex_date: string | null;
  growth_pct: number | null;
  history: DividendPayment[];
  annual: DividendAnnual[];
  splits: SplitAction[];
  disclaimer: string;
}

/** One row of the raw corporate-action ledger. */
export interface CorpActionRow {
  code: string;
  name: string | null;
  ex_date: string | null;
  action_type: string;
  ratio: number | null;
  cash_amount: number | null;
  source: string | null;
}

// ---------------------------------------------------------------- backtest

export interface StrategyParam {
  key: string;
  label: string;
  default: number;
  min: number | null;
  max: number | null;
  step: number;
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  params: StrategyParam[];
}

/** One selectable rebalance cadence (daily / weekly / monthly). */
export interface RebalanceOption {
  id: string;
  label: string;
  description: string;
}

/** Optional cost overrides. Omitted/null = realistic IDX default; 0 disables. */
export interface CostSettings {
  commission_pct?: number | null;
  sell_tax_pct?: number | null;
  slippage_pct?: number | null;
  max_adv_pct?: number | null;
}

/** The cost model actually used by a run (all values resolved). */
export interface CostModelInfo {
  commission_pct: number;
  sell_tax_pct: number;
  slippage_pct: number;
  max_adv_pct: number;
}

/** What trading frictions cost over the whole simulation. */
export interface CostImpact {
  total_fees: number;
  total_slippage: number;
  total_cost: number;
  turnover: number;
  cost_pct_of_equity: number | null;
}

export interface BacktestConfig {
  strategies: StrategyInfo[];
  cost_defaults: CostModelInfo;
  rebalance_options: RebalanceOption[];
  rebalance_default: string;
  max_codes: number;
  max_days: number;
}

export interface BacktestRequest {
  strategy: string;
  codes?: string[];
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  initial_cash?: number;
  params?: Record<string, number>;
  costs?: CostSettings;
  rebalance?: string;
}

export interface EquityPoint {
  date: string;
  equity: number;
  benchmark: number | null;
}

export interface BacktestMetrics {
  final_equity: number;
  total_return: number;
  annualized_return: number | null;
  max_drawdown: number;
  volatility: number | null;
  sharpe: number | null;
}

/** One executed fill inside a rebalance. */
export interface TradeRow {
  code: string;
  side: "buy" | "sell";
  shares: number;
  price: number; // execution price, slippage included
  notional: number;
  fee: number;
  slippage: number;
}

/** A position in the book at the end of a rebalance. */
export interface HoldingRow {
  code: string;
  shares: number;
  price: number;
  value: number;
}

/** What one rebalance traded, and the book it left behind. */
export interface RebalanceEvent {
  date: string;
  cash: number;
  turnover: number;
  fees: number;
  trades: TradeRow[];
  holdings: HoldingRow[];
}

export interface BacktestResult {
  strategy: string;
  strategy_name: string;
  params: Record<string, number>;
  codes: string[];
  start: string;
  end: string;
  days: number;
  initial_cash: number;
  metrics: BacktestMetrics; // after costs (realistic)
  gross_metrics: BacktestMetrics; // before costs (frictionless)
  benchmark: BacktestMetrics;
  costs: CostModelInfo;
  rebalance: string;
  rebalance_days: number;
  rebalances: RebalanceEvent[]; // newest first, capped
  total_rebalances: number;
  rebalances_truncated: boolean;
  cost_impact: CostImpact;
  equity_curve: EquityPoint[];
  disclaimer: string;
}
