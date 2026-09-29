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
  /** Jam backend memperbarui regime ini (WIB, ISO). */
  generated_at?: string | null;
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
  /** Ketimpangan buku intraday (-1..1): positif = bid lebih tebal. */
  ob_imbalance: number | null;
  /** Buku vs arah harga (-1..1): negatif = absorption (buyer menyerap offer). */
  ob_absorption: number | null;
  /**
   * Skor aktivitas broker 0-100 (proksi aliran, bobot dari IC). Null bila skor
   * belum tervalidasi atau emiten di luar coverage.
   */
  broker_score: number | null;
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
  /** Skor aktivitas broker minimal (0-100); hanya bermakna bila skor tervalidasi IC. */
  min_broker_score?: number;
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
  /** Sudah melewati corp-action filter ex-dividend. */
  signal: "BUY" | "SELL" | "HOLD" | string;
  /** SELL mentah sebelum filter (null bila tidak ada guard aktif). */
  raw_signal: string | null;
  /** Cash dividend per saham pada ex-date terakhir dalam 7 hari (null = tidak ada). */
  div_cash: number | null;
  /** True = SELL palsu ex-dividend yang dinetralkan jadi HOLD. */
  div_adjusted: boolean;
  close: number | null;
  pct: number | null;
  rsi: number | null;
  sma20: number | null;
  macd: number | null;
  trend_up: boolean;
  live: boolean;
  /** Tanggal sesi bursa bar terakhir (YYYY-MM-DD) untuk badge update. */
  as_of?: string | null;
  /** Jam backend menghitung sinyal ini (WIB, ISO) untuk badge "diperbarui". */
  generated_at?: string | null;
}

/** Satu emiten di panel Top Volume/Value/Frequency. */
export interface LeaderRow {
  code: string;
  name: string | null;
  close: number | null;
  percent: number | null;
  volume: number | null;
  value: number | null;
  frequency: number | null;
}

/** Ranking likuiditas: realtime (intraday) saat jam bursa, EOD di luar jam. */
export interface MarketLeaders {
  metric: "volume" | "value" | "frequency" | string;
  source: "intraday" | "eod" | string;
  date: string | null;
  captured_at: string | null;
  rows: LeaderRow[];
}

export interface BrokerLeaderRow {
  broker_code: string;
  broker_name: string | null;
  volume: number | null;
  value: number | null;
  frequency: number | null;
}

export interface TopBrokers {
  date: string | null;
  captured_at: string | null;
  rows: BrokerLeaderRow[];
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
  /** Skor aktivitas broker 0-100; null = lapisan broker tidak aktif. */
  broker_score: number | null;
  /** Penyesuaian skor dari lapisan aktivitas broker, poin (-8..+8); 0 = tidak aktif. */
  broker_adj: number | null;
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
  /** Jam backend menghitung hold check (WIB, ISO). */
  generated_at?: string | null;
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
  /** Registry lengkap faktor yang dihitung engine IC (key -> deskripsi). */
  definitions?: Record<string, string>;
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
  /** Jam backend memperbarui histori regime (WIB, ISO). */
  generated_at?: string | null;
}

export interface CorpActionSummary {
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}

// --------------------------------------------------------- sentimen (flow & buku)

/** Satu emiten di daftar sorotan sentimen (akumulasi / distribusi). */
export interface SentimentItem {
  code: string;
  name: string | null;
  close: number | null;
  percent: number | null;
  value: number | null;
  foreign_net: number | null;
  /** Net asing / nilai transaksi hari itu (rasio mentah). */
  foreign_net_pct: number | null;
  /** Persentil cross-sectional arus asing (0..1) — dasar komponen skor. */
  foreign_rank: number | null;
  ob_imbalance: number | null;
  ob_absorption: number | null;
  score: number;
  label: string;
  reasons: string[];
}

/** Gauge sentimen pasar 0..100 dari breadth harga + IHSG + breadth arus asing. */
export interface SentimentMarket {
  score: number;
  label: string;
  components: Record<string, number>;
  breadth_up: number | null;
  foreign_breadth: number | null;
  up: number;
  down: number;
  flat: number;
  index_percent: number | null;
  total_value: number | null;
  total_foreign_net: number | null;
  foreign_to_value: number | null;
}

export interface SentimentResponse {
  as_of: string | null;
  generated_at: string | null;
  market: SentimentMarket;
  accumulation: SentimentItem[];
  distribution: SentimentItem[];
  stats: Record<string, number>;
  weights: Record<string, number>;
  orderbook_available: boolean;
  disclaimer: string | null;
}

// -------------------------------------------------jejak sinyal (track record)

/** Track record satu irisan (jenis sinyal x regime x horizon). */
export interface SignalTrackStat {
  signal: string;
  regime: string | null;
  horizon: number;
  n: number;
  hit_rate: number | null;
  mean_fwd: number | null;
  median_fwd: number | null;
  /** Forward return dikurangi return pasar equal-weight pada window yang sama. */
  mean_abnormal: number | null;
  t_stat: number | null;
  /** Puncak (kenaikan terbaik) selama horizon, rata-rata. */
  avg_mfe: number | null;
  /** Dasar (penurunan terburuk) selama horizon, rata-rata. */
  avg_mae: number | null;
}

/** Satu sinyal terbaru dengan return yang sudah terealisasi. */
export interface SignalTrackRecent {
  code: string;
  date: string;
  signal: string;
  close: number | null;
  fwd_5: number | null;
  fwd_10: number | null;
  fwd_21: number | null;
}

/** Track record sinyal BUY/SELL (point-in-time, entry T+1). */
export interface SignalTrack {
  generated_at: string | null;
  signals: number;
  buy: number;
  sell: number;
  first_date: string | null;
  last_date: string | null;
  horizons: number[];
  overall: SignalTrackStat[];
  by_regime: SignalTrackStat[];
  recent: SignalTrackRecent[];
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

/** Konsentrasi transaksi per broker firma (seluruh pasar, EOD). */
export interface BrokerConcentrationRow {
  broker_code: string;
  broker_name: string | null;
  volume: number | null;
  value: number | null;
  frequency: number | null;
  share: number | null;
}

export interface BrokerConcentration {
  date: string | null;
  captured_at: string | null;
  n_brokers: number;
  total_value: number | null;
  cr1: number | null;
  cr3: number | null;
  cr5: number | null;
  hhi: number | null;
  top: BrokerConcentrationRow[];
}

/** Satu faktor aliran + hasil uji IC dan bobot yang dipakai skor. */
export interface BrokerActivityFactor {
  factor: string;
  label: string;
  description: string | null;
  mean_ic: number | null;
  icir: number | null;
  t_stat: number | null;
  hit_rate: number | null;
  n_days: number | null;
  eligible: boolean;
  direction: number;
  weight: number;
}

/** Kontributor skor satu emiten — menjelaskan "kenapa skornya begitu". */
export interface BrokerActivityDriver {
  factor: string;
  label: string;
  contribution: number;
  percentile: number | null;
}

export interface BrokerActivityRow {
  code: string;
  name: string | null;
  close: number | null;
  change: number | null;
  percent: number | null;
  score: number;
  /** Porsi faktor yang nilainya tersedia untuk emiten ini (0..1). */
  coverage: number;
  drivers: BrokerActivityDriver[];
}

/**
 * Skor aktivitas broker per emiten (proksi aliran, bobot dari IC) + struktur
 * broker pasar. `validated` false -> `rows` kosong dan `reason` menjelaskan.
 */
export interface BrokerActivity {
  as_of: string | null;
  validated: boolean;
  reason: string | null;
  horizon: number | null;
  ic_run_date: string | null;
  eligible_count: number;
  factors: BrokerActivityFactor[];
  rows: BrokerActivityRow[];
  market: BrokerConcentration;
}

/** Nilai skor satu emiten pada sesi terakhir + peringkatnya di pasar. */
export interface BrokerActivitySnapshot {
  score: number;
  coverage: number;
  rank: number;
  universe: number;
  /** 1.0 = peringkat teratas, 0.0 = terbawah. */
  percentile: number;
  drivers: BrokerActivityDriver[];
}

/** Satu titik riwayat: skor emiten pada satu tanggal + driver saat itu. */
export interface BrokerActivityHistoryPoint {
  date: string;
  score: number;
  coverage: number;
  drivers: BrokerActivityDriver[];
}

/** Satu emiten sebanding (sektor sama) dengan skornya pada sesi terakhir. */
export interface BrokerActivityPeer {
  code: string;
  name: string | null;
  score: number;
  coverage: number;
  is_self: boolean;
}

/**
 * Pembanding skor di dalam satu sektor.
 * `comparable` false = emiten jatuh ke bucket fallback "Lainnya", yang bukan
 * sektor sebenarnya — pembandingnya tidak berarti.
 */
export interface BrokerActivitySector {
  name: string;
  comparable: boolean;
  peer_count: number;
  my_rank: number | null;
  median_score: number | null;
  peers: BrokerActivityPeer[];
}

/**
 * Skor aktivitas broker satu emiten + riwayat skor/driver-nya.
 * `current` null = emiten tidak masuk cross-section hari terakhir (bukan nol).
 */
export interface StockBrokerActivity {
  code: string;
  as_of: string | null;
  validated: boolean;
  reason: string | null;
  horizon: number | null;
  ic_run_date: string | null;
  eligible_count: number;
  /** Pembanding sektor; null bila emiten tidak punya skor sama sekali. */
  sector: BrokerActivitySector | null;
  current: BrokerActivitySnapshot | null;
  history: BrokerActivityHistoryPoint[];
}

/**
 * Satu sektor pada rotasi berbasis aktivitas broker.
 * `phase`: AKUMULASI (level tinggi & naik) / MEMUDAR (tinggi & turun) /
 * MEMBAIK (rendah & naik) / TERPURUK (rendah & turun) / STABIL (perubahan ~0,
 * arah tidak diklaim).
 */
export interface SectorRotationRow {
  sector: string;
  n_names: number;
  median_score: number;
  breadth: number;
  delta_5d: number | null;
  delta_21d: number | null;
  phase: string | null;
  /** Median skor sektor per sesi (terbaru terakhir) untuk grafik mini. */
  history: number[];
}

/**
 * Rotasi sektor berbasis skor aktivitas broker (proksi aliran dana) — berbeda
 * dari RRG yang berbasis harga relatif.
 */
export interface SectorRotation {
  as_of: string | null;
  validated: boolean;
  reason: string | null;
  horizon: number | null;
  ic_run_date: string | null;
  lookback: number;
  min_names: number;
  /** Emiten berskor yang belum punya sektor sebenarnya (tidak diikutkan). */
  unmapped_names: number;
  sectors: SectorRotationRow[];
}
