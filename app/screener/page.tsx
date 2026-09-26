"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useScreener } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { ScreenerFilters, ScreenerRow } from "@/lib/types";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { Card } from "@/components/Card";
import { RegimeBanner } from "@/components/RegimeBanner";
import { TickerLogo } from "@/components/TickerLogo";
import {
  Rocket,
  BarChart3,
  Droplet,
  Wind,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Check,
  type LucideIcon,
} from "lucide-react";

const PRESETS: { label: string; icon: LucideIcon; filters: ScreenerFilters; desc: string }[] = [
  {
    label: "Momentum + Foreign In",
    icon: Rocket,
    filters: { min_momentum: 5, foreign_in_only: true, min_value: 10e9, min_days: 30 },
    desc: "Naik >5% dalam 20 hari, diakumulasi asing, likuid >Rp 10 M/hari",
  },
  {
    label: "Breakout Volume",
    icon: BarChart3,
    filters: { min_vol_ratio: 2, min_momentum: 0, min_days: 30 },
    desc: "Volume hari ini ≥2× rata-rata 20 hari — aktivitas tidak wajar",
  },
  {
    label: "Oversold Sehat",
    icon: Droplet,
    filters: { rsi_max: 35, min_value: 5e9, min_days: 30 },
    desc: "RSI <35 tapi masih likuid — kandidat rebound",
  },
  {
    label: "Trend Up Tenang",
    icon: Wind,
    filters: { signal: "BUY", rsi_min: 50, rsi_max: 65, min_days: 30 },
    desc: "Sinyal BUY, uptrend, RSI sehat (tidak overbought)",
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
  ["Order-book imbalance", "Ketimpangan bid vs offer dari snapshot intraday (-1..1). Positif = bid lebih tebal — akumulasi diam-diam; negatif = offer tebal — distribusi."],
  ["Absorption", "Buku vs arah harga (-1..1). Negatif = offer tebal tapi harga tetap naik — buyer kuat menyerap (bullish)."],
  ["Foreign net", "Net buy/sell asing hari terakhir (Rp, notional = lembar × close)."],
  ["Likuiditas", "Nilai transaksi harian — filter minimal untuk hindari saham 'oleh-oleh'."],
];

function signalBadge(sig: string): string {
  if (sig === "BUY") return "badge badge-buy";
  if (sig === "SELL") return "badge badge-sell";
  return "badge badge-hold";
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
    key: "foreign_net",
    label: "Foreign Net",
    render: (r) => fmtCompact(r.foreign_net),
    cellClass: (r) => `text-right tabular-nums ${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`,
  },
  { key: "value", label: "Value", render: (r) => fmtCompact(r.value), cellClass: () => "text-muted text-right tabular-nums" },
];

const DEFAULT_VISIBLE = COLUMNS.map((c) => c.key);

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>(PRESETS[0].filters);
  const [active, setActive] = useState(0);
  const { data, error, isLoading } = useScreener(filters);

  const [sortKey, setSortKey] = useState<SortKey>("momentum_20d");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState<Set<SortKey>>(new Set(DEFAULT_VISIBLE));
  const [showCols, setShowCols] = useState(false);

  function apply(i: number) {
    setActive(i);
    setFilters(PRESETS[i].filters);
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

      {/* Tab strategi cepat */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => {
          const PresetIcon = p.icon;
          const isActive = active === i;
          return (
            <button
              key={p.label}
              onClick={() => apply(i)}
              title={p.desc}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              }`}
            >
              <PresetIcon size={15} aria-hidden />
              {p.label}
            </button>
          );
        })}
      </div>

      <details className="text-muted text-sm">
        <summary className="cursor-pointer select-none font-medium text-[var(--fg)]">
          Faktor apa saja yang dihitung?
        </summary>
        <ul className="mt-2 space-y-1.5">
          {FACTORS.map(([k, v]) => (
            <li key={k}>
              <span className="font-medium text-[var(--fg)]">{k}</span> — {v}
            </li>
          ))}
        </ul>
      </details>

      <Card
        title={`Hasil Screening${data ? ` · ${data.length} saham` : ""}`}
        subtitle={`Urut: ${COLUMNS.find((c) => c.key === sortKey)?.label} ${sortDir === "desc" ? "↓" : "↑"}`}
        right={
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
    </main>
  );
}
