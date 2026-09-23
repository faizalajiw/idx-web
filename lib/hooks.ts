"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, addToWatchlist, removeFromWatchlist } from "./api";
import type {
  MarketOverview,
  SessionMovers,
  WatchlistRow,
  Signal,
  PriceBar,
  TechnicalChart,
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

const WATCHLIST_KEY = "/api/watchlist";

/** Mutation hook: adds tickers to the persisted watchlist and updates cache. */
export function useAddToWatchlist() {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (codes: string[]) => {
      const rows = await addToWatchlist(codes);
      // Seed the default watchlist cache with the fresh rows, then let
      // signal/stock caches revalidate in the background.
      await mutate(WATCHLIST_KEY, rows, { revalidate: false });
      mutate(
        (key) =>
          typeof key === "string" &&
          (key.startsWith("/api/signals") || key.startsWith("/api/stocks")),
        undefined,
      );
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
      mutate(
        (key) =>
          typeof key === "string" &&
          (key.startsWith("/api/signals") || key.startsWith("/api/stocks")),
        undefined,
      );
      return rows;
    },
    [mutate],
  );
}
