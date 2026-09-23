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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // response had no JSON body; keep statusText
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// SWR-compatible fetcher (key is the API path).
export const fetcher = <T>(path: string): Promise<T> => get<T>(path);

export const api = {
  marketOverview: () => get<MarketOverview>("/api/market/overview"),
  sessionMovers: () => get<SessionMovers>("/api/market/session-movers"),
  watchlist: (codes?: string) =>
    get<WatchlistRow[]>(`/api/watchlist${codes ? `?codes=${encodeURIComponent(codes)}` : ""}`),
  signals: (codes?: string, minDays = 25) =>
    get<Signal[]>(
      `/api/signals?min_days=${minDays}${codes ? `&codes=${encodeURIComponent(codes)}` : ""}`,
    ),
  history: (code: string, limit = 60) =>
    get<PriceBar[]>(`/api/stocks/${encodeURIComponent(code)}/history?limit=${limit}`),
  technical: (code: string) =>
    get<TechnicalChart>(`/api/stocks/${encodeURIComponent(code)}/technical`),
};
