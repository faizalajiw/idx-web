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
  BrokerActivity,
  BrokerFlow,
  StockDecision,
  StockForeignFlow,
  StockBrokerActivity,
  SectorRotation,
  ForeignFlow,
  HoldCheckResponse,
  MarketNarration,
  MarketOverview,
  MarketRegime,
  MarketLeaders,
  TopBrokers,
  ScreenerFilters,
  ScreenerRow,
  SectorAnalysis,
  SectorRRG,
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
  QualityDuplicates,
  CorpActionSummary,
  StockEvents,
  FactorsOverview,
  RegimeHistory,
  SentimentResponse,
  SignalTrack,
  DividendOverview,
  DividendStock,
  DividendDetail,
  CorpActionRow,
  SmartMoneyRadar,
  SmartMoneyStock,
  SmartMoneyTrackRecord,
  SmartMoneyWatchList,
  StockOwnership,
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

export function useWatchlist(codes?: string) {
  const key = `/api/watchlist${codes ? `?codes=${encodeURIComponent(codes)}` : ""}`;
  return useSWR<WatchlistRow[]>(key, fetcher, { refreshInterval: REFRESH });
}

/**
 * Ranking likuiditas per metrik (volume/value/frequency). Backend memilih
 * realtime saat jam bursa, EOD di luar jam. Frequency selalu EOD.
 */
export function useMarketLeaders(
  metric: "volume" | "value" | "frequency",
  limit = 5,
) {
  const key = `/api/market/leaders?metric=${metric}&limit=${limit}`;
  return useSWR<MarketLeaders>(key, fetcher, { refreshInterval: REFRESH });
}

/** Top broker by value (EOD). Kosong sampai broker_daily terisi. */
export function useTopBrokers(limit = 5) {
  return useSWR<TopBrokers>(`/api/market/top-brokers?limit=${limit}`, fetcher, {
    refreshInterval: REFRESH,
  });
}

/**
 * Komposisi nilai transaksi broker per kategori (asing/lokal/BUMN) + tren.
 * Sumber EOD harian — bergerak sekali sehari, refresh 5 menit cukup.
 */
export function useBrokerFlow(days = 20, topN = 5) {
  return useSWR<BrokerFlow>(
    `/api/broker-flow?days=${days}&top_n=${topN}`,
    fetcher,
    { refreshInterval: 300_000 },
  );
}

/**
 * Aliran asing satu emiten: tren harian, flip arah, dan peer sektor.
 * Data EOD harian — refresh 5 menit cukup.
 */
export function useStockForeignFlow(code: string, days = 30, peerDays = 10) {
  return useSWR<StockForeignFlow>(
    `/api/stocks/${encodeURIComponent(code)}/foreign-flow?days=${days}&peer_days=${peerDays}`,
    fetcher,
    { refreshInterval: 300_000 },
  );
}

/**
 * Ruang Keputusan satu emiten: verdict gabungan + konteks + level invalidasi.
 * Verdict bergerak harian & gauge intraday menit-menit — refresh 2 menit.
 */
export function useStockDecision(code: string | null) {
  const key = code
    ? `/api/stocks/${encodeURIComponent(code)}/decision`
    : null;
  return useSWR<StockDecision>(key, fetcher, { refreshInterval: 120_000 });
}

/**
 * Skor aktivitas broker per emiten (bobot dari run IC) + struktur broker pasar.
 * Skor bergerak harian dan bobot IC bulanan -> refresh 5 menit cukup.
 */
export function useBrokerActivity(limit = 25) {
  return useSWR<BrokerActivity>(`/api/broker-activity?limit=${limit}`, fetcher, {
    refreshInterval: 300_000,
  });
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

/**
 * Sentimen posisi/aliran dari data tersimpan (arus asing + buku intraday).
 * Backend memilih hari EOD terakhir yang lengkap; lambat berubah → 5 menit.
 */
export function useSentiment(limit = 15) {
  return useSWR<SentimentResponse>(`/api/sentiment?limit=${limit}`, fetcher, {
    refreshInterval: 300_000,
    shouldRetryOnError: false,
  });
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

/**
 * Skor aktivitas broker satu emiten + riwayat driver-nya. Skor bergerak harian
 * dan bobot IC bulanan -> refresh 5 menit cukup.
 */
export function useStockBrokerActivity(code: string | null, lookback = 60) {
  const key = code
    ? `/api/stocks/${encodeURIComponent(code)}/broker-activity?lookback=${lookback}`
    : null;
  return useSWR<StockBrokerActivity>(key, fetcher, { refreshInterval: 300_000 });
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

export function useQualityDuplicates() {
  return useSWR<QualityDuplicates>("/api/quality/duplicates", fetcher, {
    refreshInterval: REFRESH,
  });
}

/** Event study per emiten (backend cache 1 jam; slow-moving). */
export function useStockEvents(code: string | null) {
  const key = code ? `/api/stocks/${encodeURIComponent(code)}/events` : null;
  return useSWR<StockEvents>(key, fetcher, {
    refreshInterval: 600_000,
    shouldRetryOnError: false,
  });
}

/** Ringkasan kalibrasi faktor (IC bulanan + bobot aktif). */
export function useFactorsOverview() {
  return useSWR<FactorsOverview>("/api/factors/overview", fetcher, {
    refreshInterval: 600_000,
  });
}

/** Histori regime harian + agregat. */
export function useRegimeHistory(days = 90) {
  return useSWR<RegimeHistory>(`/api/market/regime/history?days=${days}`, fetcher, {
    refreshInterval: 600_000,
  });
}

/**
 * Track record sinyal BUY/SELL: hit-rate & forward return historis, dipecah
 * per regime. Backend menghitung dari layer PIT (cache 1 jam) — lambat berubah.
 */
export function useSignalTrack() {
  return useSWR<SignalTrack>("/api/signals/track", fetcher, {
    refreshInterval: 600_000,
    shouldRetryOnError: false,
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

/**
 * Rotasi sektor berbasis skor aktivitas broker (proksi aliran dana).
 * Berbeda dari RRG yang berbasis harga relatif. Bergerak harian -> 5 menit cukup.
 */
export function useSectorRotation(lookback = 60, minNames = 3) {
  return useSWR<SectorRotation>(
    `/api/sectors/rotation?lookback=${lookback}&min_names=${minNames}`,
    fetcher,
    { refreshInterval: 300_000 },
  );
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

// --------------------------------------------------------------- jejak smart money

/**
 * Radar jejak smart money: emiten dengan aliran asing terkuat di pasar.
 * Data EOD harian — refresh 5 menit cukup.
 */
export function useSmartMoneyRadar(days = 10) {
  return useSWR<SmartMoneyRadar>(
    `/api/smart-money/radar?days=${days}`,
    fetcher,
    { refreshInterval: 300_000 },
  );
}

/**
 * Jejak smart money satu emiten: verdict, pola, level, narasi + konteks sektor.
 * Verdict bergerak harian — refresh 5 menit.
 */
export function useStockSmartMoney(code: string | null) {
  const key = code
    ? `/api/stocks/${encodeURIComponent(code)}/smart-money`
    : null;
  return useSWR<SmartMoneyStock>(key, fetcher, { refreshInterval: 300_000 });
}

/**
 * Track record pola klasik jejak smart money (120 sesi terakhir).
 * Hitungannya berat & harian — refresh 1 jam.
 */
export function useSmartMoneyTrackRecord() {
  return useSWR<SmartMoneyTrackRecord>(
    "/api/smart-money/track-record",
    fetcher,
    { refreshInterval: 3_600_000 },
  );
}

/**
 * Verdict jejak smart money per emiten watchlist (kartu halaman Pantau).
 * Data EOD — refresh 5 menit cukup.
 */
export function useSmartMoneyWatchlist() {
  return useSWR<SmartMoneyWatchList>(
    "/api/smart-money/verdicts",
    fetcher,
    { refreshInterval: 300_000 },
  );
}

/**
 * Kepemilikan emiten + aksi pemilik (keterbukaan IDX). Data berubah lambat
 * (bulanan) — refresh 1 jam.
 */
export function useStockOwnership(code: string | null) {
  const key = code
    ? `/api/stocks/${encodeURIComponent(code)}/ownership`
    : null;
  return useSWR<StockOwnership>(key, fetcher, { refreshInterval: 3_600_000 });
}
