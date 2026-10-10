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

/** Satu segmen pasar: volume dalam lembar & lot (1 lot = 100 lembar). */
export interface MarketTradeSegment {
  volume_shares: number | null;
  volume_lot: number | null;
  value: number | null;
  frequency: number | null;
}

/** Pasar reguler vs non-reguler (tunai + negosiasi) untuk satu sesi. */
export interface MarketTradeSummary {
  date: string | null;
  captured_at: string | null;
  stock_count: number;
  regular: MarketTradeSegment;
  non_regular: MarketTradeSegment;
  total: MarketTradeSegment;
  non_regular_share_volume: number | null;
  non_regular_share_value: number | null;
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

export interface StockSearchResult {
  code: string;
  name: string | null;
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
  /** Kategori bandarmologi dari map kurasi kode di backend (asing/lokal/bumn). */
  category?: string | null;
}

export interface TopBrokers {
  date: string | null;
  captured_at: string | null;
  rows: BrokerLeaderRow[];
}

/** Kategori broker: "asing" | "lokal" | "bumn". */
export type BrokerFlowCategory = "asing" | "lokal" | "bumn";

export interface BrokerFlowCategoryStat {
  value: number | null;
  share: number | null;
  n_brokers: number;
}

export interface BrokerFlowTopRow {
  broker_code: string;
  broker_name: string | null;
  value: number;
  share: number | null;
}

export interface BrokerFlowDay {
  date: string;
  total_value: number | null;
  asing_value: number;
  lokal_value: number;
  bumn_value: number;
  asing_share: number | null;
  lokal_share: number | null;
  bumn_share: number | null;
}

export interface BrokerClassificationRow {
  broker_code: string;
  broker_name: string | null;
  category: string;
}

export interface BrokerFlow {
  date: string | null;
  captured_at: string | null;
  n_brokers: number;
  total_value: number | null;
  categories: Record<BrokerFlowCategory, BrokerFlowCategoryStat>;
  top: Record<BrokerFlowCategory, BrokerFlowTopRow[]>;
  history: BrokerFlowDay[];
  classification: BrokerClassificationRow[];
}

/** Satu hari aliran asing satu emiten (rupiah). */
export interface StockForeignFlowDay {
  date: string;
  net: number | null;
  buy: number | null;
  sell: number | null;
  /** Hari berturut-turut net searah; null = hari tanpa data. */
  streak: number | null;
  /** True hanya di hari tanda net berubah vs hari non-nol sebelumnya. */
  flip: boolean | null;
}

export interface StockForeignFlowFlip {
  last_flip: { date: string; to: "net_buy" | "net_sell" } | null;
  days_since_flip: number | null;
  current_streak: number | null;
  current_side: "net_buy" | "net_sell" | "flat";
}

export interface StockForeignFlowPeer {
  code: string;
  net_sum: number;
  net_mean: number;
  n_days: number;
  is_self: boolean;
}

export interface StockForeignFlow {
  code: string;
  sector: string;
  /** False = bucket fallback "Lainnya" (bukan sektor sebenarnya). */
  comparable: boolean;
  date: string | null;
  flow: StockForeignFlowDay[];
  flip_summary: StockForeignFlowFlip;
  peers: StockForeignFlowPeer[];
  peer_rank: { rank: number | null; count: number; median_sum: number | null };
}

/** Konteks keputusan — sumber backend: /api/stocks/{code}/decision. */
export interface StockDecision {
  code: string;
  generated_at: string;
  /** Verdict dasar: skor 0-100, band STRONG HOLD/HOLD/TRIM/EXIT, alasan. */
  hold_check: {
    code: string;
    name: string | null;
    signal: string;
    trend_up: boolean;
    rsi: number | null;
    macd_bullish: boolean;
    bb_position: string | null;
    z_score: number | null;
    foreign_net: number | null;
    score: number;
    base_score: number;
    factor_adj: number;
    broker_score: number | null;
    broker_adj: number;
    verdict: string;
    reasons: string[];
  } | null;
  regime: { regime: string | null; source: string | null; as_of: string | null; dir_hint?: string | null; adx?: number | null; vol_state?: string | null } | null;
  /** Sentimen aliran emiten ini (bisa null saat tidak ada dasar hitung). */
  sentiment: { code: string; score: number; label: string; reasons?: string[]; foreign_rank?: number | null } | null;
  market_gauge: { score: number; label?: string; band?: string } | null;
  /** Jejak asing 10 sesi terakhir. */
  foreign_10: { date: string; net: number | null; flip: boolean | null }[];
  last_flip: { date: string; to: "net_buy" | "net_sell" } | null;
  /** Base rate event study: riwayat emiten vs baseline pasar. */
  events: {
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
  }[];
  /** Level invalidasi teknikal yang bisa dipegang. */
  invalidation: {
    close: number;
    ma50: number | null;
    bb_lower: number | null;
    mean60: number | null;
    std60: number | null;
    rsi: number | null;
    ma50_level: number | null;
    mean60_level: number | null;
  } | null;
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
  /** Median skor seluruh emiten yang diskor tanggal yang sama (baseline pasar). */
  market_median?: number | null;
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
 * Rotasi sektor berbasis skor aktivitas broker (proksi aliran dana).
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

// --------------------------------------------------------------- jejak smart money

/** Satu baris radar: emiten dengan jejak aliran asing terkuat di jendela N. */
export interface SmartMoneyRadarRow {
  code: string;
  name: string | null;
  side: "akumulasi" | "distribusi";
  net_sum_idr: number | null;
  netval_pct: number | null;
  streak: number | null;
  window_value: number | null;
  date: string | null;
}

export interface SmartMoneyRadar {
  days: number;
  date: string | null;
  accumulation: SmartMoneyRadarRow[];
  distribution: SmartMoneyRadarRow[];
  scanned: number;
}

export interface SmartMoneyVerdict {
  side: "akumulasi" | "distribusi" | "netral";
  strength: "besar" | "menengah" | null;
  streak: number | null;
  streak_side: "net_buy" | "net_sell" | "flat" | null;
  /** Sesi pertama streak berjalan — jawaban "sejak kapan" dalam tanggal. */
  streak_start_date: string | null;
  net_sum_idr: number | null;
  netval_pct: number | null;
  n_net_days: number | null;
  date: string | null;
  insufficient: boolean;
}

/** Statistik satu horizon (5/10/21 hari bursa) untuk satu pola. */
export interface SmartMoneyHorizonStats {
  n: number;
  aligned_hit_rate: number | null;
  tstat: number | null;
  effective_alpha: number | null;
  horizon_days: number | null;
}

/**
 * Arti historis satu pola: seberapa sering ia bekerja, di horizon berapa.
 * `reliable: false` = horizon terbaik pun masih sampel kecil (indikatif).
 */
export interface SmartMoneyPatternHistory {
  n: number | null;
  n_resolved: number | null;
  window_sessions: number | null;
  horizon: string | null;
  horizon_days: number | null;
  aligned_hit_rate: number | null;
  n_resolved_horizon: number | null;
  tstat: number | null;
  effective_alpha: number | null;
  reliable: boolean;
  /** Kata keyakinan dari |t| terbaik lintas horizon: tinggi/sedang/lemah. */
  confidence: "tinggi" | "sedang" | "lemah" | null;
  best_tstat: number | null;
  /** |effective_alpha| di horizon terpilih — besar efek, selalu positif. */
  edge_pct: number | null;
  horizons: Record<string, SmartMoneyHorizonStats>;
}

export interface SmartMoneyPattern {
  id: string;
  label: string;
  direction: "buy-side" | "sell-side" | null;
  note: string | null;
  /**
   * Track record pola ini. Opsional: hanya jalur per-emiten
   * (`/api/stocks/{code}/smart-money`) yang menempelkannya; daftar verdict
   * watchlist tidak.
   */
  history?: SmartMoneyPatternHistory | null;
}

export interface SmartMoneyRange {
  lookback: number;
  low: number | null;
  high: number | null;
  support: number | null;
  resistance: number | null;
  range_pct: number | null;
}

export interface SmartMoneySectorContext {
  sector: string | null;
  comparable: boolean;
  sector_total: number | null;
  accumulating: number | null;
  distributing: number | null;
  position: string | null;
}

/**
 * Sebaran verdict seluruh pasar — pembanding verdict satu emiten.
 * `distributing_share` = porsi distribusi di antara emiten yang PUNYA arah
 * (netral & data kurang keluar dari penyebut).
 */
export interface SmartMoneyMarketContext {
  date: string | null;
  total: number | null;
  accumulating: number | null;
  distributing: number | null;
  neutral: number | null;
  insufficient: number | null;
  sided: number | null;
  accumulating_pct: number | null;
  distributing_pct: number | null;
  distributing_share: number | null;
  position: string | null;
}

export interface SmartMoneyPatternsBoardRow {
  code: string;
  name: string | null;
  side: "akumulasi" | "distribusi" | "netral" | null;
  net_sum_idr: number | null;
  netval_pct: number | null;
  streak: number | null;
  window_value: number | null;
  date: string | null;
}

/**
 * Satu pola + buktinya + emiten yang memicunya di sesi terakhir.
 * `fired` = semua emiten yang memicu (termasuk yang tipis); `count` = yang
 * lolos lantai likuiditas dan ditampilkan.
 */
export interface SmartMoneyPatternsBoardGroup {
  pattern: string;
  label: string;
  direction: "buy-side" | "sell-side" | null;
  confidence: "tinggi" | "sedang" | "lemah" | null;
  horizon_days: number | null;
  aligned_hit_rate: number | null;
  n_resolved_horizon: number | null;
  edge_pct: number | null;
  fired: number;
  count: number;
  emitters: SmartMoneyPatternsBoardRow[];
}

/** Papan "pola terkuat hari ini" — kelompok urut kekuatan bukti. */
export interface SmartMoneyPatternsBoard {
  date: string | null;
  scanned: number;
  window_days: number;
  min_window_value: number | null;
  groups: SmartMoneyPatternsBoardGroup[];
}

/** Jejak smart money satu emiten: verdict + pola + level + narasi. */
export interface SmartMoneyStock {
  code: string;
  name: string | null;
  has_data: boolean;
  verdict: SmartMoneyVerdict | null;
  patterns: SmartMoneyPattern[];
  range: SmartMoneyRange | null;
  narrative: string[];
  sector: SmartMoneySectorContext | null;
  market: SmartMoneyMarketContext | null;
  date: string | null;
}

// Track record pola klasik: "pola ini terbukti tidak?" (120 sesi terakhir)
export interface SmartMoneyTrackHorizon {
  n: number;
  hit_rate: number | null;
  /** Hit rate searah pola: pola sell-side "berfungsi" bila harga turun. */
  aligned_hit_rate: number | null;
  mean: number | null;
  median: number | null;
  tstat: number | null;
  /** Alpha vs pasar equal-weight (persen); null bila belum bisa dihitung. */
  alpha: number | null;
  /** Alpha dibalik tanda untuk pola sell-side — "seberapa kuat polanya bekerja". */
  effective_alpha: number | null;
}

export interface SmartMoneyTrackPattern {
  pattern: string;
  label: string;
  direction: "buy-side" | "sell-side" | null;
  n: number;
  n_resolved: number;
  horizons: Record<string, SmartMoneyTrackHorizon>;
}

export interface SmartMoneyTrackRecord {
  patterns: SmartMoneyTrackPattern[];
  n_episodes: number;
  history_sessions: number | null;
  horizon_note: string | null;
}

// Verdict jejak smart money per emiten watchlist (kartu halaman Pantau)
export interface SmartMoneyWatchRow {
  code: string;
  name: string | null;
  side: "akumulasi" | "distribusi" | "netral" | null;
  insufficient: boolean;
  net_sum_idr: number | null;
  netval_pct: number | null;
  streak: number | null;
  date: string | null;
  patterns: string[];
}

export interface SmartMoneyWatchList {
  n: number;
  rows: SmartMoneyWatchRow[];
  telegram_enabled: boolean;
}

// Kepemilikan emiten & aksi pemilik (dari keterbukaan IDX, gratis)
export interface OwnershipHolder {
  holder_name: string;
  category: string | null;
  shares: number | null;
  pct: number | null;
  is_controller: boolean;
}

export interface OwnershipChange {
  holder_name: string;
  category: string | null;
  prev_pct: number | null;
  curr_pct: number | null;
  delta_pct: number | null;
  action: "tambah" | "kurang" | "baru" | "keluar";
}

export interface StockOwnership {
  code: string;
  has_data: boolean;
  as_of: string | null;
  prev_date: string | null;
  holders: OwnershipHolder[];
  free_float_pct: number | null;
  controller: string[];
  changes: OwnershipChange[];
}

// ---------------------------------------------------------------- rekomendasi beli

/** Metrik mentah di balik satu kandidat beli (apa adanya, boleh null). */
export interface RecommendationMetrics {
  close: number | null;
  signal: string | null;
  trend_up: boolean;
  rsi: number | null;
  mom_20d: number | null;
  atr_pct: number | null;
  dist_52w_pct: number | null;
  vol_ratio: number | null;
  value: number | null;
  z_score: number | null;
  hist_days: number | null;
}

/** Lapisan mana yang ikut menggerakkan skor + alasannya (transparansi). */
export interface RecommendationLayerStatus {
  factor: boolean;
  broker: boolean;
  factor_note: string | null;
  broker_note: string | null;
  note: string | null;
}

/** Satu kandidat beli: skor + grade + level eksekusi + alasan. */
export interface RecommendationRow {
  code: string;
  name: string | null;
  score: number;
  grade: string; // A | B | C
  setup: string | null; // pullback | breakout | trend | netral
  entry_low: number | null;
  entry_high: number | null;
  entry_ref: number | null;
  stop: number | null;
  target: number | null;
  rr: number | null;
  entry_note: string | null;
  horizon_days: number | null;
  confidence: string | null;
  position_pct: number | null;
  patterns: string[];
  reasons: string[];
  warnings: string[];
  layers: Record<string, boolean>;
  metrics: RecommendationMetrics | null;
}

/** Papan kandidat beli se-pasar untuk sesi terakhir. */
export interface RecommendationResponse {
  date: string | null;
  generated_at: string | null;
  scanned: number;
  total_candidates: number;
  limit: number;
  min_grade: string;
  layers: RecommendationLayerStatus;
  rows: RecommendationRow[];
}

/** Kandidat beli satu emiten (mesin skor sama dengan papan se-pasar). */
export interface StockRecommendation {
  code: string;
  as_of: string | null;
  has_data: boolean;
  candidate: RecommendationRow | null;
  layers: RecommendationLayerStatus;
  reason: string | null;
  generated_at: string | null;
}

/** Statistik track record satu irisan (grade x horizon). */
export interface RecommendationTrackStat {
  grade: string;
  horizon: number;
  n: number;
  hit_rate: number | null;
  mean_fwd: number | null;
  median_fwd: number | null;
  mean_abnormal: number | null;
  t_stat: number | null;
  avg_mfe: number | null;
  avg_mae: number | null;
}

export interface RecommendationTrackRecent {
  code: string;
  date: string;
  grade: string;
  score: number | null;
  close: number | null;
  fwd_5: number | null;
  fwd_10: number | null;
  fwd_21: number | null;
}

/** Track record kandidat beli (per grade & horizon). */
export interface RecommendationTrack {
  candidates: number;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  first_date: string | null;
  last_date: string | null;
  horizons: number[];
  by_grade: RecommendationTrackStat[];
  recent: RecommendationTrackRecent[];
  reason: string | null;
}
