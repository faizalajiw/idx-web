import type {
  AlertRuleCreate,
  AlertStatus,
  AlertTestResult,
  BacktestConfig,
  BacktestRequest,
  BacktestResult,
  MarketOverview,
    NewsList,
  ScreenerFilters,
  ScreenerRow,
  StockSearchResult,
  SectorAnalysis,
  StockBrokerSummary,
  ForeignFlow,
  JournalClaim,
  JournalGateState,
  JournalSummary,
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

/**
 * Cari emiten by kode atau nama (untuk command palette). Q kosong -> [].
 */
export async function searchStocks(q: string, limit = 8): Promise<StockSearchResult[]> {
  const p = new URLSearchParams({ q, limit: String(limit) });
  return get<StockSearchResult[]>(`/api/search?${p}`);
}

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

/** Stored alert rules with their live values (no side effects). */
export async function fetchAlerts(): Promise<AlertStatus> {
  return get<AlertStatus>("/api/alerts");
}

async function mutateAlerts(
  path: string,
  method: "POST" | "DELETE",
  body?: unknown,
): Promise<AlertStatus> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<AlertStatus>;
}

/** Add a watch condition; returns the refreshed status. */
export const createAlert = (rule: AlertRuleCreate): Promise<AlertStatus> =>
  mutateAlerts("/api/alerts", "POST", rule);

/** Remove a watch condition; returns the refreshed status. */
export const deleteAlert = (ruleId: string): Promise<AlertStatus> =>
  mutateAlerts(`/api/alerts/${encodeURIComponent(ruleId)}`, "DELETE");

/** Send a one-off Telegram message so the user can verify the wiring. */
export async function testTelegram(): Promise<AlertTestResult> {
  const res = await fetch(`${API_BASE}/api/alerts/test`, { method: "POST" });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<AlertTestResult>;
}

/** Strategies, cost defaults, and limits for the simulator form. */
export async function fetchBacktestConfig(): Promise<BacktestConfig> {
  return get<BacktestConfig>("/api/backtest/config");
}

/**
 * Run one point-in-time backtest. Computation only — the backend persists
 * nothing, so this is safe to call repeatedly while tuning parameters.
 */
export async function runBacktest(req: BacktestRequest): Promise<BacktestResult> {
  const res = await fetch(`${API_BASE}/api/backtest/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<BacktestResult>;
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
  if (f.min_broker_score !== undefined) p.set("min_broker_score", String(f.min_broker_score));
  if (f.min_days !== undefined) p.set("min_days", String(f.min_days));
  if (f.limit !== undefined) p.set("limit", String(f.limit));
  const q = p.toString();
  return q ? `?${q}` : "";
}

// --------------------------------------------------------- buku klaim (lapis 4)

/** Rekaman aturan buku klaim; `rule` kosong = aturan papan (bawaan backend). */
export async function fetchJournalSummary(
  rule?: string,
  code?: string,
): Promise<JournalSummary> {
  const p = new URLSearchParams();
  if (rule) p.set("rule", rule);
  if (code) p.set("code", code);
  const q = p.toString();
  return get<JournalSummary>(`/api/journal/summary${q ? `?${q}` : ""}`);
}

/** Baris buku klaim satu sesi (kosong = sesi bursa terakhir). */
export async function fetchJournalClaims(
  tradeDate?: string | null,
  limit = 50,
): Promise<JournalClaim[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  if (tradeDate) p.set("trade_date", tradeDate);
  return get<JournalClaim[]>(`/api/journal/claims?${p}`);
}

async function mutateJournal(path: string, body: unknown): Promise<JournalGateState> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<JournalGateState>;
}

/**
 * Hentikan penulisan klaim baru. `reason` wajib: backend menolak dengan 422
 * kalau kosong, karena halt tanpa sebab tidak bisa dibedakan dari mesin rusak.
 */
export const haltJournal = (reason: string, by = "pemilik"): Promise<JournalGateState> =>
  mutateJournal("/api/journal/halt", { reason, by });

/** Buka lagi penulisan klaim; waktu dan pelakunya tetap tercatat. */
export const resumeJournal = (by = "pemilik"): Promise<JournalGateState> =>
  mutateJournal("/api/journal/resume", { by });
