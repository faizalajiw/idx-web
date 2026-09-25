"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, addToWatchlist, removeFromWatchlist, screenerQuery } from "./api";
import type {
  ForeignFlow,
  HoldCheckResponse,
  MarketNarration,
  MarketOverview,
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
} from "./types";

// Auto-refresh cadence (ms). Market data is delayed anyway, so 30s is plenty.
const REFRESH = 30_000;

export function useMarketOverview() {
  return useSWR<MarketOverview>("/api/market/overview", fetcher, {
    refreshInterval: REFRESH,
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
