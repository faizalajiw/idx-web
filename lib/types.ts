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

export interface CorpActionSummary {
  by_type: Record<string, number>;
  by_source: Record<string, number>;
}
