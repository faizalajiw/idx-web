/**
 * 48 hook data — pembungkus tipis `createQuery` di atas `lib/api.ts`.
 *
 * Nama dan kuncinya sengaja sama dengan `lib/hooks.ts` app Next supaya
 * perbandingan antar-halaman bisa dilakukan baris per baris. Parameter yang
 * bisa berubah (kode emiten, filter) diterima sebagai nilai atau getter;
 * getter dipakai saat nilainya berasal dari state/props yang berganti tanpa
 * komponen di-mount ulang.
 */
import {
	addToWatchlist,
	removeFromWatchlist,
	createAlert,
	deleteAlert,
	haltJournal,
	resumeJournal,
	screenerQuery
} from "#lib/api.ts";
import { createQuery, mutateKey, mutateMatch, type QueryOptions, type QueryResult } from "#lib/query.svelte.ts";
import type {
	AlertRuleCreate,
	AlertStatus,
	BacktestConfig,
	BrokerActivity,
	BrokerFlow,
	DataHealth,
	FactorsOverview,
	ForeignFlow,
	Freshness,
	JournalClaim,
	JournalGateState,
	JournalSummary,
	MarketLeaders,
	MarketOverview,
	MarketRegime,
	MarketTradeSummary,
	NewsList,
	PriceBar,
	RecommendationResponse,
	RecommendationTrack,
	RegimeHistory,
	ScreenerFilters,
	ScreenerRow,
	SectorAnalysis,
	SectorRotation,
	SentimentResponse,
	Signal,
	SignalTrack,
	SmartMoneyPatternsBoard,
	SmartMoneyRadar,
	SmartMoneyStock,
	SmartMoneyTrackRecord,
	SmartMoneyWatchList,
	StockBrokerActivity,
	StockBrokerSummary,
	StockDecision,
	StockDossier,
	StockEvents,
	StockForeignFlow,
	StockOwnership,
	StockRecommendation,
	TechnicalChart,
	TopBrokers,
	WatchlistRow
} from "#lib/types.ts";

/** Auto-refresh cadence (ms). Data pasar memang tertunda, 30 detik cukup. */
const REFRESH = 30_000;

type MaybeGetter<T> = T | (() => T);

function read<T>(value: MaybeGetter<T>): T {
	return typeof value === "function" ? (value as () => T)() : value;
}

/** Kode emiten -> potongan path, atau `null` bila kode belum ada. */
function stockPath(code: MaybeGetter<string | null>, suffix: string): string | null {
	const c = read(code);
	return c ? `/api/stocks/${encodeURIComponent(c)}${suffix}` : null;
}

function useQuery<T>(
	source: string | null | (() => string | null),
	options: QueryOptions = {}
): QueryResult<T> {
	return createQuery<T>(source, options);
}

// ------------------------------------------------------------------ pasar

export function useMarketOverview() {
	return useQuery<MarketOverview>("/api/market/overview", { refreshInterval: REFRESH });
}

/**
 * Pasar reguler vs non-reguler (tunai + negosiasi): volume lot + value satu
 * sesi. Angka EOD — baru final setelah pasar tutup, jadi refresh 1 menit cukup.
 */
export function useMarketTradeSummary() {
	return useQuery<MarketTradeSummary>("/api/market/trade-summary", {
		refreshInterval: 60_000,
		shouldRetryOnError: false
	});
}

export function useMarketRegime() {
	return useQuery<MarketRegime>("/api/market/regime", { refreshInterval: 300_000 });
}

export function useWatchlist(codes?: MaybeGetter<string | undefined>) {
	return useQuery<WatchlistRow[]>(() => {
		const c = codes === undefined ? undefined : read(codes);
		return `/api/watchlist${c ? `?codes=${encodeURIComponent(c)}` : ""}`;
	}, { refreshInterval: REFRESH });
}

/**
 * Ranking likuiditas per metrik (volume/value/frequency). Backend memilih
 * realtime saat jam bursa, EOD di luar jam. Frequency selalu EOD.
 */
export function useMarketLeaders(
	metric: MaybeGetter<"volume" | "value" | "frequency">,
	limit: MaybeGetter<number> = 5
) {
	return useQuery<MarketLeaders>(
		() => `/api/market/leaders?metric=${read(metric)}&limit=${read(limit)}`,
		{ refreshInterval: REFRESH }
	);
}

/** Top broker by value (EOD). Kosong sampai broker_daily terisi. */
export function useTopBrokers(limit: MaybeGetter<number> = 5) {
	return useQuery<TopBrokers>(() => `/api/market/top-brokers?limit=${read(limit)}`, {
		refreshInterval: REFRESH
	});
}

/**
 * Komposisi nilai transaksi broker per kategori (asing/lokal/BUMN) + tren.
 * Sumber EOD harian — bergerak sekali sehari, refresh 5 menit cukup.
 */
export function useBrokerFlow(days: MaybeGetter<number> = 20, topN: MaybeGetter<number> = 5) {
	return useQuery<BrokerFlow>(() => `/api/broker-flow?days=${read(days)}&top_n=${read(topN)}`, {
		refreshInterval: 300_000
	});
}

/**
 * Aliran asing satu emiten: tren harian, flip arah, dan peer sektor.
 * Data EOD harian — refresh 5 menit cukup.
 */
export function useStockForeignFlow(
	code: MaybeGetter<string>,
	days: MaybeGetter<number> = 30,
	peerDays: MaybeGetter<number> = 10
) {
	return useQuery<StockForeignFlow>(() => {
		const c = read(code);
		return `/api/stocks/${encodeURIComponent(c)}/foreign-flow?days=${read(days)}&peer_days=${read(peerDays)}`;
	}, { refreshInterval: 300_000 });
}

/**
 * Dossier satu emiten: satu fetch, setiap bagian membawa tanggal sesinya.
 * Dibaca sekali per halaman; refresh 5 menit cukup (data EOD harian).
 */
export function useStockDossier(code: MaybeGetter<string | null>) {
	return useQuery<StockDossier>(() => stockPath(code, "/dossier"), { refreshInterval: 300_000 });
}

/**
 * Ruang Keputusan satu emiten: verdict gabungan + konteks + level invalidasi.
 * Verdict bergerak harian & gauge intraday menit-menit — refresh 2 menit.
 */
export function useStockDecision(code: MaybeGetter<string | null>) {
	return useQuery<StockDecision>(() => stockPath(code, "/decision"), { refreshInterval: 120_000 });
}

/**
 * Skor aktivitas broker per emiten (bobot dari run IC) + struktur broker pasar.
 * Skor bergerak harian dan bobot IC bulanan -> refresh 5 menit cukup.
 */
export function useBrokerActivity(limit: MaybeGetter<number> = 25) {
	return useQuery<BrokerActivity>(() => `/api/broker-activity?limit=${read(limit)}`, {
		refreshInterval: 300_000
	});
}

export function useSignals(
	codes?: MaybeGetter<string | undefined>,
	minDays: MaybeGetter<number> = 25
) {
	return useQuery<Signal[]>(() => {
		const c = codes === undefined ? undefined : read(codes);
		return `/api/signals?min_days=${read(minDays)}${c ? `&codes=${encodeURIComponent(c)}` : ""}`;
	}, { refreshInterval: REFRESH });
}

export function useTechnical(code: MaybeGetter<string | null>) {
	return useQuery<TechnicalChart>(() => stockPath(code, "/technical"), {
		refreshInterval: REFRESH
	});
}

export function useHistory(code: MaybeGetter<string | null>, limit: MaybeGetter<number> = 120) {
	return useQuery<PriceBar[]>(
		() => stockPath(code, `/history?limit=${read(limit)}`),
		{ refreshInterval: REFRESH }
	);
}

export function useLatestNews() {
	return useQuery<NewsList>("/api/news/latest?limit=20", { refreshInterval: 120_000 });
}

export function useSectors() {
	return useQuery<SectorAnalysis>("/api/sectors", { refreshInterval: REFRESH });
}

export function useForeignFlow(days: MaybeGetter<number> = 20) {
	return useQuery<ForeignFlow>(() => `/api/foreign-flow?days=${read(days)}`, {
		refreshInterval: REFRESH
	});
}

/**
 * Sentimen posisi/aliran dari data tersimpan (arus asing + buku intraday).
 * Backend memilih hari EOD terakhir yang lengkap; lambat berubah → 5 menit.
 */
export function useSentiment(limit: MaybeGetter<number> = 15) {
	return useQuery<SentimentResponse>(() => `/api/sentiment?limit=${read(limit)}`, {
		refreshInterval: 300_000,
		shouldRetryOnError: false
	});
}

/** `null` = belum ada strategi dipilih; tidak ada request yang dikirim. */
export function useScreener(filters: MaybeGetter<ScreenerFilters | null>) {
	return useQuery<ScreenerRow[]>(
		() => {
			const f = read(filters);
			return f ? `/api/screener${screenerQuery(f)}` : null;
		},
		{ keepPreviousData: true }
	);
}

/**
 * Skor aktivitas broker satu emiten + riwayat driver-nya. Skor bergerak harian
 * dan bobot IC bulanan -> refresh 5 menit cukup.
 */
export function useStockBrokerActivity(
	code: MaybeGetter<string | null>,
	lookback: MaybeGetter<number> = 60
) {
	return useQuery<StockBrokerActivity>(
		() => stockPath(code, `/broker-activity?lookback=${read(lookback)}`),
		{ refreshInterval: 300_000 }
	);
}

export function useStockBrokers(code: MaybeGetter<string | null>) {
	return useQuery<StockBrokerSummary>(() => stockPath(code, "/brokers"), {
		refreshInterval: REFRESH
	});
}

// ------------------------------------------------------------- watchlist (mutasi)

const WATCHLIST_KEY = "/api/watchlist";

/** Sinyal, skor, dan screener ikut berubah saat daftar pantau berubah. */
function invalidateDerived(): void {
	mutateMatch(
		(key) =>
			key.startsWith("/api/signals") ||
			key.startsWith("/api/stocks") ||
			key.startsWith("/api/screener")
	);
}

/** Tambah emiten ke daftar pantau, lalu segarkan cache. */
export function useAddToWatchlist() {
	return async (codes: string[]): Promise<WatchlistRow[]> => {
		const rows = await addToWatchlist(codes);
		await mutateKey(WATCHLIST_KEY, rows, { revalidate: false });
		invalidateDerived();
		return rows;
	};
}

/** Hapus satu emiten dari daftar pantau, lalu segarkan cache. */
export function useRemoveFromWatchlist() {
	return async (code: string): Promise<WatchlistRow[]> => {
		const rows = await removeFromWatchlist(code);
		await mutateKey(WATCHLIST_KEY, rows, { revalidate: false });
		invalidateDerived();
		return rows;
	};
}

// ------------------------------------------------------------ corporate events

/** Event study per emiten (backend cache 1 jam; slow-moving). */
export function useStockEvents(code: MaybeGetter<string | null>) {
	return useQuery<StockEvents>(() => stockPath(code, "/events"), {
		refreshInterval: 600_000,
		shouldRetryOnError: false
	});
}

/** Ringkasan kalibrasi faktor (IC bulanan + bobot aktif). */
export function useFactorsOverview() {
	return useQuery<FactorsOverview>("/api/factors/overview", { refreshInterval: 600_000 });
}

/** Histori regime harian + agregat. */
export function useRegimeHistory(days: MaybeGetter<number> = 90) {
	return useQuery<RegimeHistory>(() => `/api/market/regime/history?days=${read(days)}`, {
		refreshInterval: 600_000
	});
}

/**
 * Track record sinyal BUY/SELL: hit-rate & forward return historis, dipecah
 * per regime. Backend menghitung dari layer PIT (cache 1 jam) — lambat berubah.
 */
export function useSignalTrack() {
	return useQuery<SignalTrack>("/api/signals/track", {
		refreshInterval: 600_000,
		shouldRetryOnError: false
	});
}

// ------------------------------------------------------------------- alert

const ALERTS_KEY = "/api/alerts";

/** Stored watch conditions with their live values. */
export function useAlerts() {
	return useQuery<AlertStatus>(ALERTS_KEY, { refreshInterval: REFRESH });
}

export function useCreateAlert() {
	return async (rule: AlertRuleCreate): Promise<AlertStatus> => {
		const status = await createAlert(rule);
		await mutateKey(ALERTS_KEY, status, { revalidate: false });
		return status;
	};
}

export function useDeleteAlert() {
	return async (ruleId: string): Promise<AlertStatus> => {
		const status = await deleteAlert(ruleId);
		await mutateKey(ALERTS_KEY, status, { revalidate: false });
		return status;
	};
}

// ------------------------------------------------------------------ sektor

/**
 * Rotasi sektor berbasis skor aktivitas broker (proksi aliran dana).
 * Bergerak harian -> 5 menit cukup.
 */
export function useSectorRotation(
	lookback: MaybeGetter<number> = 60,
	minNames: MaybeGetter<number> = 3
) {
	return useQuery<SectorRotation>(
		() => `/api/sectors/rotation?lookback=${read(lookback)}&min_names=${read(minNames)}`,
		{ refreshInterval: 300_000 }
	);
}

// ----------------------------------------------------------------- backtest

/** Strategy catalog + cost defaults for the backtest form (rarely changes). */
export function useBacktestConfig() {
	return useQuery<BacktestConfig>("/api/backtest/config", { refreshInterval: 300_000 });
}

// ------------------------------------------------------- jejak smart money

/**
 * Radar jejak smart money: emiten dengan aliran asing terkuat di pasar.
 * Data EOD harian — refresh 5 menit cukup.
 */
export function useSmartMoneyRadar(days: MaybeGetter<number> = 10) {
	return useQuery<SmartMoneyRadar>(() => `/api/smart-money/radar?days=${read(days)}`, {
		refreshInterval: 300_000
	});
}

/**
 * Jejak smart money satu emiten: verdict, pola, level, narasi + konteks sektor.
 * Verdict bergerak harian — refresh 5 menit.
 */
export function useStockSmartMoney(code: MaybeGetter<string | null>) {
	return useQuery<SmartMoneyStock>(() => stockPath(code, "/smart-money"), {
		refreshInterval: 300_000
	});
}

/**
 * Track record pola klasik jejak smart money (120 sesi terakhir).
 * Hitungannya berat & harian — refresh 1 jam.
 */
export function useSmartMoneyTrackRecord() {
	return useQuery<SmartMoneyTrackRecord>("/api/smart-money/track-record", {
		refreshInterval: 3_600_000
	});
}

/**
 * Papan "pola terkuat hari ini": pola yang menyala di sesi terakhir, kelompok
 * urut kekuatan bukti. Data harian (EOD) — refresh 30 menit.
 */
export function useSmartMoneyPatternsBoard() {
	return useQuery<SmartMoneyPatternsBoard>("/api/smart-money/patterns", {
		refreshInterval: 1_800_000
	});
}

/**
 * Verdict jejak smart money per emiten watchlist (kartu halaman Pantau).
 * Data EOD — refresh 5 menit cukup.
 */
export function useSmartMoneyWatchlist() {
	return useQuery<SmartMoneyWatchList>("/api/smart-money/verdicts", {
		refreshInterval: 300_000
	});
}

/**
 * Kepemilikan emiten + aksi pemilik (keterbukaan IDX). Data berubah lambat
 * (bulanan) — refresh 1 jam.
 */
export function useStockOwnership(code: MaybeGetter<string | null>) {
	return useQuery<StockOwnership>(() => stockPath(code, "/ownership"), {
		refreshInterval: 3_600_000
	});
}

// ------------------------------------------------------------ rekomendasi beli

/**
 * Papan kandidat beli se-pasar: skor + grade + level eksekusi per emiten.
 * Data EOD harian (hitung berat & cache 30 menit) — refresh 5 menit cukup.
 */
export function useRecommendations(
	limit: MaybeGetter<number> = 20,
	minGrade: MaybeGetter<string> = "C",
	query: MaybeGetter<string> = ""
) {
	return useQuery<RecommendationResponse>(
		() => `/api/recommendations?limit=${read(limit)}&min_grade=${read(minGrade)}${read(query)}`,
		{ refreshInterval: 300_000, keepPreviousData: true }
	);
}

/**
 * Kandidat beli satu emiten (mesin skor sama dengan papan se-pasar).
 *
 * `extra` = bagian keadaan pemilik (`&modal=...`, lihat `lib/portfolio.svelte.ts`);
 * endpoint emiten diawali `?` sehingga `&` di depannya harus dipotong.
 * `keepPreviousData` supaya angka di panel tidak berkedip kosong tiap ketikan.
 */
export function useStockRecommendation(
	code: MaybeGetter<string | null>,
	extra: MaybeGetter<string> = ""
) {
	return useQuery<StockRecommendation>(
		() => {
			const q = read(extra);
			return stockPath(code, `/recommendation${q ? `?${q.slice(1)}` : ""}`);
		},
		{ refreshInterval: 300_000, keepPreviousData: true }
	);
}

/**
 * Track record kandidat beli: hit rate & abnormal per grade/horizon.
 * Hitungan mahal & harian (backend cache 1 jam) — refresh 1 jam.
 */
export function useRecommendationTrack() {
	return useQuery<RecommendationTrack>("/api/recommendations/track", {
		refreshInterval: 3_600_000,
		shouldRetryOnError: false
	});
}

/**
 * Kesehatan data EOD: kesegaran + cakupan kolom `foreign_*` + jumlah baris per
 * sesi + lubang sesi. Dipakai kartu "Kesehatan Data" di Dashboard.
 */
export function useDataHealth() {
	return useQuery<DataHealth>("/api/data-health", {
		refreshInterval: 60_000,
		shouldRetryOnError: false
	});
}

/**
 * Kesegaran data: "boleh percaya angka di dashboard?" - spec D1.
 * Dua query `max(...)` di backend, jadi 60 detik cukup.
 */
export function useFreshness() {
	return useQuery<Freshness>("/api/freshness", {
		refreshInterval: 60_000,
		shouldRetryOnError: false
	});
}

// ---------------------------------------------------- buku klaim (lapis 4)

const JOURNAL_SUMMARY_KEY = "/api/journal/summary";
const JOURNAL_STATE_KEY = "/api/journal/state";

export function useJournalSummary(
	rule?: MaybeGetter<string | undefined>,
	code?: MaybeGetter<string | undefined>
) {
	return useQuery<JournalSummary>(
		() => {
			const p = new URLSearchParams();
			const r = rule === undefined ? undefined : read(rule);
			const c = code === undefined ? undefined : read(code);
			if (r) p.set("rule", r);
			if (c) p.set("code", c);
			const q = p.toString();
			return `${JOURNAL_SUMMARY_KEY}${q ? `?${q}` : ""}`;
		},
		{ refreshInterval: 300_000, shouldRetryOnError: false }
	);
}

/** Baris klaim satu sesi; `tradeDate` kosong = sesi bursa terakhir. */
export function useJournalClaims(
	tradeDate?: MaybeGetter<string | null | undefined>,
	limit: MaybeGetter<number> = 50
) {
	return useQuery<JournalClaim[]>(
		() => {
			const p = new URLSearchParams({ limit: String(read(limit)) });
			const d = tradeDate === undefined ? undefined : read(tradeDate);
			if (d) p.set("trade_date", d);
			return `/api/journal/claims?${p}`;
		},
		{ refreshInterval: 300_000, shouldRetryOnError: false }
	);
}

/**
 * Keadaan gerbang klaim: boleh/tidak menulis klaim baru sekarang, dengan sebab
 * pertamanya (manual, data, regime, verdict). 60 detik cukup.
 */
export function useJournalState() {
	return useQuery<JournalGateState>(JOURNAL_STATE_KEY, { refreshInterval: 60_000 });
}

/** Angka buku ikut berubah begitu gerbangnya berubah (klaim baru / penolakan). */
function refreshJournal(): void {
	mutateMatch(
		(key) => key.startsWith(JOURNAL_SUMMARY_KEY) || key.startsWith("/api/journal/claims")
	);
}

export function useJournalHalt() {
	return async (reason: string, by = "pemilik"): Promise<JournalGateState> => {
		const state = await haltJournal(reason, by);
		await mutateKey(JOURNAL_STATE_KEY, state, { revalidate: false });
		refreshJournal();
		return state;
	};
}

export function useJournalResume() {
	return async (by = "pemilik"): Promise<JournalGateState> => {
		const state = await resumeJournal(by);
		await mutateKey(JOURNAL_STATE_KEY, state, { revalidate: false });
		refreshJournal();
		return state;
	};
}
