import type {
  MarketOverview,
  MarketNarration,
  ScreenerFilters,
  ScreenerRow,
  SectorAnalysis,
  SessionMovers,
  StockBrokerSummary,
  ForeignFlow,
  ValuationResponse,
  WatchlistRow,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body?.detail ?? detail;
  } catch {
    // response had no JSON body; keep statusText
  }
  return new ApiError(res.status, detail);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

// SWR-compatible fetcher (key is the API path).
export const fetcher = <T>(path: string): Promise<T> => get<T>(path);

/** Add tickers to the persisted watchlist; returns the updated rows. */
export async function addToWatchlist(codes: string[]): Promise<WatchlistRow[]> {
  const res = await fetch(`${API_BASE}/api/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<WatchlistRow[]>;
}

/** Remove one ticker from the persisted watchlist; returns the updated rows. */
export async function removeFromWatchlist(code: string): Promise<WatchlistRow[]> {
  const res = await fetch(
    `${API_BASE}/api/watchlist/${encodeURIComponent(code)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<WatchlistRow[]>;
}

export function screenerQuery(f: ScreenerFilters): string {
  const p = new URLSearchParams();
  if (f.signal) p.set("signal", f.signal);
  if (f.rsi_min !== undefined) p.set("rsi_min", String(f.rsi_min));
  if (f.rsi_max !== undefined) p.set("rsi_max", String(f.rsi_max));
  if (f.min_momentum !== undefined) p.set("min_momentum", String(f.min_momentum));
  if (f.max_momentum !== undefined) p.set("max_momentum", String(f.max_momentum));
  if (f.min_value !== undefined) p.set("min_value", String(f.min_value));
  if (f.foreign_in_only) p.set("foreign_in_only", "true");
  if (f.min_vol_ratio !== undefined) p.set("min_vol_ratio", String(f.min_vol_ratio));
  if (f.min_days !== undefined) p.set("min_days", String(f.min_days));
  if (f.limit !== undefined) p.set("limit", String(f.limit));
  const q = p.toString();
  return q ? `?${q}` : "";
}
