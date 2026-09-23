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
