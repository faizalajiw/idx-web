import type {
  MarketOverview,
  SessionMovers,
  WatchlistRow,
  Signal,
  PriceBar,
  TechnicalChart,
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
