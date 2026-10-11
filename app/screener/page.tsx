"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useScreener, useBrokerActivity } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { ScreenerFilters, ScreenerRow } from "@/lib/types";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { screenerQuery } from "@/lib/api";
import { Card } from "@/components/Card";
import { RegimeBanner } from "@/components/RegimeBanner";
import { TickerLogo } from "@/components/TickerLogo";
import { LastUpdated } from "@/components/LastUpdated";
import {
  Rocket,
  BarChart3,
  Droplet,
  Wind,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Check,
  Activity,
  Compass,
  Info,
  type LucideIcon,
} from "lucide-react";

type PresetGuide = { untuk: string; kriteria: string[]; cara: string };

const PRESETS: {
  label: string;
  icon: LucideIcon;
  filters: ScreenerFilters;
  desc: string;
  guide?: PresetGuide;
}[] = [
  {
    label: "Momentum + Foreign In",
    icon: Rocket,
    filters: { min_momentum: 5, foreign_in_only: true, min_value: 10e9, min_days: 30 },
    desc: "Naik >5% dalam 20 hari, diakumulasi asing, likuid >Rp 10 M/hari",
    guide: {
      untuk: "Mencari saham yang sedang naik dan didukung beli asing hari ini, sehingga lebih mudah dijual kembali.",
      kriteria: [
        "Momentum 20 hari > 5%",
        "Asing net beli hari terakhir",
        "Nilai transaksi > Rp 10 M",
      ],
      cara: "Urutkan dari momentum tertinggi. Kolom Foreign Net positif dan Value besar menandakan dukungan nyata; Jarak 52w dekat 0% berarti harga dekat puncak.",
    },
  },
  {
    label: "Lonjakan Volume",
    icon: BarChart3,
    filters: { min_vol_ratio: 2, min_momentum: 0, min_days: 30 },
    desc: "Volume hari ini ≥2× rata-rata 20 hari, harga tidak turun",
    guide: {
      untuk: "Mencari saham yang volumenya tiba-tiba melonjak hari ini. Ini tanda ada pelaku besar yang masuk, jadi layak dicek lebih lanjut, bukan langsung dibeli.",
      kriteria: ["Vol Ratio ≥ 2×", "Momentum 20 hari ≥ 0% (harga tidak turun)"],
      cara: "Urutkan dari Vol Ratio tertinggi. 2× berarti volume hari ini dua kali rata-rata 20 hari. Momentum positif berarti lonjakan volume disertai kenaikan harga, dan Jarak 52w dekat 0% memperkuat sinyal breakout. Konfirmasi arah dengan Foreign Net dan Buku (OB).",
    },
  },
  {
    label: "Oversold Sehat",
    icon: Droplet,
    filters: { rsi_max: 35, min_value: 5e9, min_days: 30 },
    desc: "RSI ≤35 (sudah banyak dijual) tapi masih likuid — kandidat rebound",
    guide: {
      untuk: "Mencari saham yang sudah turun banyak sampai terlihat 'murah' secara teknikal, dan masih ramai diperdagangkan. Ini kandidat untuk dipantau rebound, bukan jaminan naik.",
      kriteria: ["RSI(14) ≤ 35 (oversold)", "Nilai transaksi > Rp 5 M/hari"],
      cara: "RSI di bawah 35 berarti tekanan jual sudah berlebihan, sehingga peluang pantulan (rebound) terbuka. Nilai transaksi besar memastikan saham mudah dibeli dan dijual. Urutkan dari RSI terendah, lalu cek ATR% (makin tinggi makin berisiko) dan Foreign Net: positif berarti asing mulai masuk saat harga turun.",
    },
  },
  {
    label: "Trend Up Tenang",
    icon: Wind,
    filters: { signal: "BUY", rsi_min: 50, rsi_max: 65, min_days: 30 },
    desc: "Sinyal BUY, uptrend, RSI sehat (tidak overbought)",
    guide: {
      untuk: "Mencari saham yang sedang tren naik dengan tenang: sinyal teknikal BUY aktif dan RSI di zona sehat, bukan zona jenuh beli. Cocok untuk ikut tren tanpa mengejar harga yang sudah terlalu tinggi.",
      kriteria: ["Signal = BUY", "RSI(14) 50-65 (uptrend, belum overbought)"],
      cara: "Sinyal BUY berarti tren rata-rata masih naik. RSI 50-65 menandakan harga naik tertib, belum jenuh beli, jadi masih ada ruang naik. Urutkan dari momentum tertinggi, lalu cek Hari sejak sinyal: 0-5 berarti sinyal masih baru; besar berarti sinyal sudah tua. Jarak 52w dekat 0% menandakan harga dekat puncak, hati-hati beli di ujung tren.",
    },
  },
  {
    label: "Akumulasi Broker",
    icon: Activity,
    filters: { min_broker_score: 60, min_value: 5e9, min_days: 30 },
    desc: "Skor aktivitas broker ≥60 (hanya faktor aliran yang lolos uji IC), likuid >Rp 5 M/hari",
    guide: {
      untuk: "Mencari saham yang aktivitas broker-nya menunjukkan pola akumulasi, yaitu ada pihak yang terus mengumpulkan saham. Ini sinyal aliran pelaku, bukan jaminan harga naik.",
      kriteria: ["Skor aktivitas broker ≥ 60", "Nilai transaksi > Rp 5 M/hari"],
      cara: "Skor broker makin tinggi berarti pola beli cenderung dominan. Urutkan dari skor tertinggi, lalu pastikan Value cukup besar agar sinyal tidak berasal dari transaksi kecil. Kombinasikan dengan Foreign Net dan Momentum: akumulasi yang disertai harga naik lebih kuat dibanding akumulasi saat harga masih turun. Skor ini butuh data broker harian (jalankan idx ic bila kosong).",
    },
  },
];

const FACTORS = [
  ["Signal teknikal", "Rule SMA20/50 + RSI(14) — sama dengan panel Trading Signals."],
  ["Momentum 20 hari", "Perubahan harga 20 hari bursa terakhir (%)."],
  ["RSI(14)", "Kelebihanbelian relatif; <35 oversold, >70 overbought."],
  ["Volume ratio", "Volume hari ini ÷ rata-rata 20 hari. >2 = aktivitas menonjol."],
  ["ATR%", "ATR(14) sebagai % dari close — volatilitas komparabel antar emiten. Tinggi = lebih berisiko."],
  ["Jarak 52w", "Posisi harga vs puncak 52 minggu (%). 0% = sedang di puncak; jauh di bawah = momentum lemah."],
  ["Hari sejak sinyal", "Hari bursa sejak BUY/SELL terakhir. Besar = sinyal sudah tua; 0-5 = sinyal baru."],
  ["Skor aktivitas broker", "Skor 0-100 dari aliran asing bernotasi rupiah + ketimpangan buku intraday, dibobot oleh uji IC. 50 = median pasar. Butuh run `idx ic` di backend dulu; sebelum itu kolomnya kosong dan filter menyaring semua."],
  ["Order-book imbalance", "Ketimpangan bid vs offer dari snapshot intraday (-1..1). Positif = bid lebih tebal — akumulasi diam-diam; negatif = offer tebal — distribusi."],
  ["Absorption", "Buku vs arah harga (-1..1). Negatif = offer tebal tapi harga tetap naik — buyer kuat menyerap (bullish)."],
  ["Foreign net", "Net buy/sell asing hari terakhir (Rp, notional = lembar × close)."],
  ["Likuiditas", "Nilai transaksi harian — filter minimal untuk hindari saham 'oleh-oleh'."],
];

function FactorsModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="factors-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        onMouseDown={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-[min(640px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl animate-[popIn_180ms_ease-out]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 id="factors-title" className="text-base font-semibold tracking-tight">
              Faktor yang dihitung
            </h3>
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
              {FACTORS.length} faktor · dipakai untuk menyaring dan mengurutkan saham
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[var(--bg-elev)] hover:text-[var(--fg)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <ul className="overflow-y-auto divide-y divide-[var(--border)] p-2">
          {FACTORS.map(([k, v]) => (
            <li key={k} className="rounded-xl px-3 py-3">
              <p className="text-sm font-medium text-[var(--fg)]">{k}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{v}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function signalBadge(sig: string): string {
  if (sig === "BUY") return "badge badge-buy";
  if (sig === "SELL") return "badge badge-sell";
  return "badge badge-hold";
}

/**
 * Baca filter dari query string URL. Field kosong/tidak valid diabaikan,
 * jadi link hasil screening bisa dibagikan dan dibuka ulang persis sama.
 */
function filtersFromParams(sp: URLSearchParams): ScreenerFilters {
  const num = (k: string): number | undefined => {
    const v = sp.get(k);
    if (v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const out: ScreenerFilters = {};
  const signal = sp.get("signal");
  if (signal) out.signal = signal;
  for (const k of [
    "rsi_min",
    "rsi_max",
    "min_momentum",
    "max_momentum",
    "min_value",
    "min_vol_ratio",
    "min_broker_score",
    "min_days",
    "limit",
  ] as const) {
    const v = num(k);
    if (v !== undefined) out[k] = v;
  }
  if (sp.get("foreign_in_only") === "true") out.foreign_in_only = true;
  return out;
}

/**
 * Dua filter dianggap sama jika menghasilkan query string yang sama.
 * Membandingkan lewat serializer yang sama dengan URL, jadi field kosong
 * (undefined / false) dan urutan key tidak lagi bikin perbedaan palsu.
 */
function sameFilters(a: ScreenerFilters, b: ScreenerFilters): boolean {
  return screenerQuery(a) === screenerQuery(b);
}

/** Kolom tabel — dipakai untuk render, sort, dan toggle visibilitas. */
type SortKey = keyof Pick<
  ScreenerRow,
  | "close"
  | "rsi"
  | "momentum_20d"
  | "vol_ratio"
  | "atr_pct"
  | "dist_52w"
  | "days_since_signal"
  | "ob_imbalance"
  | "ob_absorption"
  | "broker_score"
  | "foreign_net"
  | "value"
>;

type ColumnDef = {
  key: SortKey;
  label: string;
  title?: string;
  render: (r: ScreenerRow) => React.ReactNode;
  cellClass?: (r: ScreenerRow) => string;
};

const COLUMNS: ColumnDef[] = [
  { key: "close", label: "Close", render: (r) => fmtNum(r.close), cellClass: () => "text-right tabular-nums" },
  {
    key: "rsi",
    label: "RSI",
    render: (r) => (r.rsi !== null ? r.rsi.toFixed(1) : "-"),
    cellClass: () => "text-right tabular-nums",
  },
  {
    key: "momentum_20d",
    label: "Momentum 20d",
    render: (r) => fmtPct(r.momentum_20d),
    cellClass: (r) => `text-right font-semibold tabular-nums ${(r.momentum_20d ?? 0) >= 0 ? "text-up" : "text-down"}`,
  },
  {
    key: "vol_ratio",
    label: "Vol Ratio",
    title: "Volume hari ini ÷ rata-rata 20 hari. ≥2× = lonjakan volume",
    render: (r) => (r.vol_ratio !== null ? `${r.vol_ratio.toFixed(2)}×` : "-"),
    cellClass: () => "text-right tabular-nums",
  },
  {
    key: "atr_pct",
    label: "ATR%",
    title: "ATR(14) % dari close — tinggi = volatil",
    render: (r) => (r.atr_pct !== null ? `${r.atr_pct.toFixed(1)}%` : "-"),
    cellClass: (r) => `text-right tabular-nums ${(r.atr_pct ?? 0) >= 5 ? "text-down" : ""}`,
  },
  {
    key: "dist_52w",
    label: "Jarak 52w",
    title: "0% = di puncak 52 minggu",
    render: (r) => (r.dist_52w !== null ? `${r.dist_52w.toFixed(1)}%` : "-"),
    cellClass: () => "text-right tabular-nums",
  },
  {
    key: "days_since_signal",
    label: "Hr sinyal",
    title: "Hari bursa sejak sinyal terakhir",
    render: (r) => (r.days_since_signal !== null ? r.days_since_signal : "-"),
    cellClass: () => "text-muted text-right tabular-nums",
  },
  {
    key: "ob_imbalance",
    label: "Buku (OB)",
    title: "Imbalance buku intraday: positif = bid lebih tebal (akumulasi)",
    render: (r) => (r.ob_imbalance !== null ? r.ob_imbalance.toFixed(2) : "-"),
    cellClass: (r) => `text-right tabular-nums ${(r.ob_imbalance ?? 0) >= 0 ? "text-up" : "text-down"}`,
  },
  {
    key: "ob_absorption",
    label: "Absorption",
    title: "Buku vs arah harga: negatif = buyer kuat menyerap offer (bullish)",
    render: (r) => (r.ob_absorption !== null ? r.ob_absorption.toFixed(2) : "-"),
    cellClass: (r) => `text-right tabular-nums ${r.ob_absorption !== null && r.ob_absorption < 0 ? "text-up" : ""}`,
  },
  {
    key: "broker_score",
    label: "Skor Broker",
    title:
      "Skor aktivitas broker 0-100 (proksi aliran, bobot dari uji IC). 50 = median pasar; kosong = skor belum tervalidasi",
    render: (r) => (r.broker_score !== null ? r.broker_score.toFixed(1) : "-"),
    cellClass: (r) => {
      const s = r.broker_score;
      const tone = s === null ? "text-muted" : s >= 60 ? "text-up" : s <= 40 ? "text-down" : "";
      return `text-right font-semibold tabular-nums ${tone}`;
    },
  },
  {
    key: "foreign_net",
    label: "Foreign Net",
    title: "Net beli (+) / jual (-) asing hari terakhir, dalam Rp",
    render: (r) => fmtCompact(r.foreign_net),
    cellClass: (r) => `text-right tabular-nums ${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`,
  },
  { key: "value", label: "Value", render: (r) => fmtCompact(r.value), cellClass: () => "text-muted text-right tabular-nums" },
];

const DEFAULT_VISIBLE = COLUMNS.map((c) => c.key);

function ScreenerView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Belum ada strategi dipilih = filter kosong: tidak ada fetch, tampil guidance.
  const [filters, setFilters] = useState<ScreenerFilters>(() =>
    filtersFromParams(new URLSearchParams(searchParams)),
  );
  const hasSelection = Object.keys(filters).length > 0;
  const [active, setActive] = useState(-1);
  const { data, error, isLoading } = useScreener(hasSelection ? filters : null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Status validasi skor broker: tanpa ini, filter broker yang belum tervalidasi
  // hanya menghasilkan "tidak ada saham lolos" tanpa alasan yang jelas.
  const { data: broker } = useBrokerActivity(1);
  const brokerFilterOn = filters.min_broker_score !== undefined;
  const brokerNotValidated = brokerFilterOn && broker !== undefined && !broker.validated;

  const [sortKey, setSortKey] = useState<SortKey>("momentum_20d");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState<Set<SortKey>>(new Set(DEFAULT_VISIBLE));
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [showCols, setShowCols] = useState(false);

  const queryStr = screenerQuery(filters);

  // URL -> state: untuk back/forward & link dibagikan. sameFilters menjaga
  // state tidak diganti jika isinya sudah sama, jadi tidak ada loop dengan
  // state -> URL di bawah.
  useEffect(() => {
    const fromUrl = filtersFromParams(new URLSearchParams(searchParams.toString()));
    setFilters((prev) => (sameFilters(prev, fromUrl) ? prev : fromUrl));
  }, [searchParams]);

  // state -> URL: replace (bukan push) supaya tiap keystroke tidak membanjiri history.
  useEffect(() => {
    const next = queryStr.replace(/^\?/, "");
    if (searchParams.toString() !== next) {
      router.replace(next ? `/screener?${next}` : "/screener", { scroll: false });
    }
  }, [queryStr, searchParams, router]);

  // Sorot tab preset yang cocok — null = filter custom (tidak ada tab aktif).
  useEffect(() => {
    setActive(PRESETS.findIndex((p) => sameFilters(p.filters, filters)));
  }, [filters]);

  function apply(i: number) {
    setActive(i);
    setFilters(PRESETS[i].filters);
  }

  /** Navigasi keyboard pola WAI-ARIA tabs: panah kiri/kanan, Home, End. */
  function onTabKeyDown(e: React.KeyboardEvent, i: number) {
    const n = PRESETS.length;
    const next =
      e.key === "ArrowRight" ? (i + 1) % n
      : e.key === "ArrowLeft" ? (i - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    apply(next);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleCol(key: SortKey) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // sisakan minimal 1 kolom
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    const rows = [...data];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0; // null selalu di bawah
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return rows;
  }, [data, sortKey, sortDir]);

  const shownColumns = COLUMNS.filter((c) => visible.has(c.key));

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Screener <span className="gradient-text">AI</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Multi-factor screening rule-based — transparan, bukan black box.
        </p>
      </div>

      <RegimeBanner />

      {/* Tab strategi: pola WAI-ARIA tabs, roving tabindex, panah kiri/kanan */}
      <div
        role="tablist"
        aria-label="Strategi screening"
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border)]"
      >
        {PRESETS.map((p, i) => {
          const PresetIcon = p.icon;
          const isActive = active === i;
          // Tanpa pilihan, tab pertama tetap bisa difokus lewat keyboard.
          const focusable = isActive || (active === -1 && i === 0);
          return (
            <button
              key={p.label}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`screener-tab-${i}`}
              aria-selected={isActive}
              aria-controls="screener-panel"
              tabIndex={focusable ? 0 : -1}
              onClick={() => apply(i)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              title={p.desc}
              className={`group -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                isActive
                  ? "border-[var(--accent)] text-[var(--fg)]"
                  : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              }`}
            >
              <PresetIcon
                size={15}
                aria-hidden
                className={isActive ? "text-[var(--accent)]" : "opacity-70 group-hover:opacity-100"}
              />
              {p.label}
            </button>
          );
        })}
      </div>

      {!hasSelection && (
        <div className="card-glass space-y-5 p-5 sm:p-6">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold">Pilih satu strategi untuk mulai</h2>
            <p className="text-muted mt-1 text-sm">
              Setiap strategi menggabungkan beberapa faktor sekaligus. Pilih salah satu tab di atas
              atau kartu di bawah, lalu hasil saham yang lolos akan muncul di sini.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PRESETS.map((p, i) => {
              const PresetIcon = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => apply(i)}
                  className="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <PresetIcon size={16} className="text-[var(--accent)]" aria-hidden />
                    {p.label}
                  </span>
                  <span className="text-muted mt-1.5 block text-xs leading-relaxed">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasSelection && PRESETS[active]?.guide && (
        <div
          role="tabpanel"
          id="screener-panel"
          aria-labelledby={`screener-tab-${active}`}
          className="card-glass space-y-3 p-4 sm:p-5"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
              Untuk apa?
            </p>
            <p className="mt-1 text-sm">{PRESETS[active].guide!.untuk}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
              Kriteria
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESETS[active].guide!.kriteria.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs"
                >
                  <Check size={12} className="text-[var(--accent)]" aria-hidden />
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
              Cara baca
            </p>
            <p className="text-muted mt-1 text-sm">{PRESETS[active].guide!.cara}</p>
          </div>
        </div>
      )}

      {hasSelection && brokerNotValidated && (
        <div className="rounded-md border border-[rgba(255,193,7,0.3)] bg-[rgba(255,193,7,0.07)] p-3 text-sm">
          <p className="font-medium">Filter skor broker tidak berlaku — skor belum tervalidasi.</p>
          <p className="text-muted mt-1">
            {broker?.reason ?? "Belum ada faktor aliran yang lolos uji IC."} Tanpa skor yang
            bisa dihitung, tidak ada emiten yang bisa dinyatakan lolos kriteria ini —
            karena itu hasilnya kosong, bukan filter yang diam-diam diabaikan. Lihat
            halaman <strong>Aktivitas Broker</strong> untuk status validasinya.
          </p>
        </div>
      )}

      {hasSelection && (<>
      <div>
        <button
          type="button"
          onClick={() => setFactorsOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev)]"
        >
          <Info size={14} aria-hidden />
          Faktor apa saja yang dihitung?
        </button>
      </div>
      {factorsOpen && <FactorsModal onClose={() => setFactorsOpen(false)} />}

      <Card
        title={`Hasil Screening${data ? ` · ${data.length} saham` : ""}`}
        subtitle={`Urut: ${COLUMNS.find((c) => c.key === sortKey)?.label} ${sortDir === "desc" ? "↓" : "↑"}`}
        info="Saham yang lolos semua kriteria strategi yang dipilih. Klik judul kolom untuk urutkan, dan tombol 'Kolom' untuk memilih data yang ditampilkan."
        right={
          <div className="flex items-center gap-2">
            <LastUpdated dep={data} />
            <div className="relative">
              <button
                onClick={() => setShowCols((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-medium text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                <SlidersHorizontal size={13} /> Kolom
              </button>
              {showCols && (
                <>
                  {/* klik luar untuk tutup */}
                  <button
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setShowCols(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-[var(--border)] bg-[var(--bg-card-solid)] p-1.5 shadow-lg">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-muted)]">
                      Tampilkan kolom
                    </p>
                    {COLUMNS.map((c) => {
                      const on = visible.has(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => toggleCol(c.key)}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-elev)]"
                        >
                          <span className={on ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}>{c.label}</span>
                          {on && <Check size={13} className="text-[var(--accent)]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        }
      >
        {error ? (
          <ErrorState message={`Gagal memuat screener: ${error.message}`} />
        ) : isLoading ? (
          <Skeleton className="h-72" />
        ) : !data || data.length === 0 ? (
          <EmptyState message="Tidak ada saham yang lolos filter ini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Kode</th>
                  {shownColumns.map((c) => {
                    const isSorted = sortKey === c.key;
                    return (
                      <th
                        key={c.key}
                        title={c.title}
                        onClick={() => toggleSort(c.key)}
                        className={`cursor-pointer select-none whitespace-nowrap text-right hover:text-[var(--fg)] ${
                          isSorted ? "text-[var(--fg)]" : ""
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {c.label}
                          {isSorted && (sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                        </span>
                      </th>
                    );
                  })}
                  <th className="text-center">Signal</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.code}>
                    <td>
                      <Link href={`/stock/${r.code}`} className="flex items-center gap-2.5 hover:underline">
                        <TickerLogo code={r.code} size={26} />
                        <span className="font-semibold">{r.code}</span>
                        {r.name && (
                          <span className="text-muted hidden text-xs md:inline">
                            {r.name.length > 24 ? `${r.name.slice(0, 24)}…` : r.name}
                          </span>
                        )}
                      </Link>
                    </td>
                    {shownColumns.map((c) => (
                      <td key={c.key} className={c.cellClass?.(r) ?? "text-right tabular-nums"} title={c.title}>
                        {c.render(r)}
                      </td>
                    ))}
                    <td className="text-center">
                      <span className={signalBadge(r.signal)}>{r.signal}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </>)}
    </main>
  );
}

/** Kerangka dengan ukuran sama seperti halaman asli, supaya tidak ada lompatan layout. */
function ScreenerShellSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-32" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </main>
  );
}

/**
 * useSearchParams butuh Suspense boundary saat prerender; default export
 * hanya membungkus view supaya build statis tetap lolos.
 */
export default function ScreenerPage() {
  return (
    <Suspense fallback={<ScreenerShellSkeleton />}>
      <ScreenerView />
    </Suspense>
  );
}
