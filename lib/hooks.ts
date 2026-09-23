"use client";

import useSWR from "swr";
import { fetcher } from "./api";
import type {
  MarketOverview,
  SessionMovers,
  WatchlistRow,
  Signal,
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
