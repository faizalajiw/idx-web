"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  fetcher,
  addToWatchlist,
  removeFromWatchlist,
  screenerQuery,
  createAlert,
  deleteAlert,
} from "./api";
import type {
  AlertRuleCreate,
  AlertStatus,
  BacktestConfig,
  ForeignFlow,
  HoldCheckResponse,
  MarketNarration,
  MarketOverview,
  MarketRegime,
  ScreenerFilters,
  ScreenerRow,
  SectorAnalysis,
  SectorRRG,
  SessionMovers,
  StockBrokerSummary,
  WatchlistRow,
  Signal,
  PriceBar,
  TechnicalChart,
  ValuationResponse,
  QualityOverview,
  QuarantineRow,
  QuarantineReason,
  CoverageGaps,
  ThinDay,
  CorpActionSummary,
  DividendOverview,
  DividendStock,
  DividendDetail,
  CorpActionRow,
} from "./types";

// Auto-refresh cadence (ms). Market data is delayed anyway, so 30s is plenty.
const REFRESH = 30_000;

export function useMarketOverview() {
  return useSWR<MarketOverview>("/api/market/overview", fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useMarketRegime() {
  return useSWR<MarketRegime>("/api/market/regime", fetcher, {
    refreshInterval: 300_000, // regime bergerak lambat; 5 menit cukup
  });
}

export function useSessionMovers() {
  return useSWR<SessionMovers>("/api/market/session-movers", fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useWatchlist(codes?: string) {
  const key = `/api/watchlist${codes ? `?codes=${encodeURIComponent(codes)}` : ""}`;
  return useSWR<WatchlistRow[]>(key, fetcher, { refreshInterval: REFRESH });
}

export function useSignals(codes?: string, minDays = 25) {
  const key = `/api/signals?min_days=${minDays}${
    codes ? `&codes=${encodeURIComponent(codes)}` : ""
  }`;
  return useSWR<Signal[]>(key, fetcher, { refreshInterval: REFRESH });
}

export function useHoldCheck(codes?: string) {
  const key = `/api/hold-check${
    codes ? `?codes=${encodeURIComponent(codes)}` : ""
  }`;
  return useSWR<HoldCheckResponse>(key, fetcher, {
    refreshInterval: 300_000, // verdicts are slow-moving; 5 min is plenty
  });
}

export function useTechnical(code: string | null) {
  const key = code ? `/api/stocks/${encodeURIComponent(code)}/technical` : null;
  return useSWR<TechnicalChart>(key, fetcher, { refreshInterval: REFRESH });
}

export function useHistory(code: string | null, limit = 120) {
  const key = code
    ? `/api/stocks/${encodeURIComponent(code)}/history?limit=${limit}`
    : null;
  return useSWR<PriceBar[]>(key, fetcher, { refreshInterval: REFRESH });
}

export function useNarration() {
  return useSWR<MarketNarration>("/api/market/narration", fetcher, {
    refreshInterval: 60_000,
  });
}

export function useSectors() {
  return useSWR<SectorAnalysis>("/api/sectors", fetcher, { refreshInterval: REFRESH });
}

export function useSectorRRG(window = 21, tailWeeks = 8) {
  const key = `/api/sectors/rrg?window=${window}&tail_weeks=${tailWeeks}`;
  return useSWR<SectorRRG>(key, fetcher, {
    refreshInterval: 300_000, // weekly rotation is slow-moving
  });
}

export function useForeignFlow(days = 20) {
  const key = `/api/foreign-flow?days=${days}`;
  return useSWR<ForeignFlow>(key, fetcher, { refreshInterval: REFRESH });
}

export function useValuation() {
  return useSWR<ValuationResponse>("/api/valuation", fetcher, {
    refreshInterval: 300_000,
  });
}

export function useScreener(filters: ScreenerFilters) {
  const key = `/api/screener${screenerQuery(filters)}`;
  return useSWR<ScreenerRow[]>(key, fetcher, { keepPreviousData: true });
}

export function useStockBrokers(code: string | null) {
  const key = code ? `/api/stocks/${encodeURIComponent(code)}/brokers` : null;
  return useSWR<StockBrokerSummary>(key, fetcher, { refreshInterval: REFRESH });
}

const WATCHLIST_KEY = "/api/watchlist";

function invalidateDerived(mutate: ReturnType<typeof useSWRConfig>["mutate"]) {
  mutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith("/api/signals") ||
        key.startsWith("/api/hold-check") ||
        key.startsWith("/api/stocks") ||
        key.startsWith("/api/screener") ||
        key.startsWith("/api/valuation")),
    undefined,
  );
}

/** Mutation hook: adds tickers to the persisted watchlist and updates cache. */
export function useAddToWatchlist() {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (codes: string[]) => {
      const rows = await addToWatchlist(codes);
      await mutate(WATCHLIST_KEY, rows, { revalidate: false });
      invalidateDerived(mutate);
      return rows;
    },
    [mutate],
  );
}

/** Mutation hook: removes one ticker and updates the cache. */
export function useRemoveFromWatchlist() {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (code: string) => {
      const rows = await removeFromWatchlist(code);
      await mutate(WATCHLIST_KEY, rows, { revalidate: false });
      invalidateDerived(mutate);
      return rows;
    },
    [mutate],
  );
}

// ---------------------------------------------------------------- data quality

export function useQualityOverview() {
  return useSWR<QualityOverview>("/api/quality/overview", fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useQuarantine(limit = 100) {
  return useSWR<QuarantineRow[]>(`/api/quality/quarantine?limit=${limit}`, fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useQuarantineReasons() {
  return useSWR<QuarantineReason[]>("/api/quality/quarantine-reasons", fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useCoverageGaps() {
  return useSWR<CoverageGaps>("/api/quality/coverage-gaps", fetcher, {
    refreshInterval: REFRESH,
  });
}

export function useThinDays(minCodes = 100, limit = 30) {
  return useSWR<ThinDay[]>(
    `/api/quality/thin-days?min_codes=${minCodes}&limit=${limit}`,
    fetcher,
    { refreshInterval: REFRESH },
  );
}

export function useCorpActionSummary() {
  return useSWR<CorpActionSummary>("/api/quality/corp-actions", fetcher, {
    refreshInterval: REFRESH,
  });
}

// ---------------------------------------------------------------- alerts

const ALERTS_KEY = "/api/alerts";

/** Stored watch conditions with their live values. */
export function useAlerts() {
  return useSWR<AlertStatus>(ALERTS_KEY, fetcher, { refreshInterval: REFRESH });
}

export function useCreateAlert() {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (rule: AlertRuleCreate) => {
      const status = await createAlert(rule);
      await mutate(ALERTS_KEY, status, { revalidate: false });
      return status;
    },
    [mutate],
  );
}

export function useDeleteAlert() {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (ruleId: string) => {
      const status = await deleteAlert(ruleId);
      await mutate(ALERTS_KEY, status, { revalidate: false });
      return status;
    },
    [mutate],
  );
}

// --------------------------------------------------- dividends & corp actions

/**
 * Dividend totals, history by year, recent payouts and the top yields.
 * Dividends only change when a new ex-date is ingested, so 5 minutes is plenty.
 */
export function useDividendOverview() {
  return useSWR<DividendOverview>("/api/dividends/overview", fetcher, {
    refreshInterval: 300_000,
  });
}

/** Every emiten that has ever paid cash, with its trailing yield. */
export function useDividendStocks(
  minYield = 0,
  sort: "yield" | "cash" | "recent" = "yield",
  limit = 200,
) {
  const key =
    `/api/dividends/stocks?sort=${sort}&limit=${limit}` +
    (minYield > 0 ? `&min_yield=${minYield}` : "");
  return useSWR<DividendStock[]>(key, fetcher, {
    refreshInterval: 300_000,
    keepPreviousData: true,
  });
}

/** One emiten's dividend + split history. 404s are a normal "never paid". */
export function useStockDividends(code: string | null) {
  const key = code ? `/api/stocks/${encodeURIComponent(code)}/dividends` : null;
  return useSWR<DividendDetail>(key, fetcher, {
    refreshInterval: 300_000,
    shouldRetryOnError: false,
  });
}

/** Raw corporate-action ledger, optionally filtered to one action type. */
export function useCorpActions(actionType?: string, limit = 40) {
  const key =
    `/api/corporate-actions?limit=${limit}` +
    (actionType ? `&action_type=${encodeURIComponent(actionType)}` : "");
  return useSWR<CorpActionRow[]>(key, fetcher, { refreshInterval: 300_000 });
}

// ---------------------------------------------------------------- backtest

/** Strategy catalog + cost defaults for the backtest form (rarely changes). */
export function useBacktestConfig() {
  return useSWR<BacktestConfig>("/api/backtest/config", fetcher, {
    refreshInterval: 300_000,
  });
}
