"use client";

import { useState } from "react";
import Link from "next/link";
import { useScreener } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { ScreenerFilters } from "@/lib/types";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { Card } from "@/components/Card";
import { RegimeBanner } from "@/components/RegimeBanner";

const PRESETS: { label: string; emoji: string; filters: ScreenerFilters; desc: string }[] = [
  {
    label: "Momentum + Foreign In",
    emoji: "🚀",
    filters: { min_momentum: 5, foreign_in_only: true, min_value: 10e9, min_days: 30 },
    desc: "Naik >5% dalam 20 hari, diakumulasi asing, likuid >Rp 10 M/hari",
  },
  {
    label: "Breakout Volume",
    emoji: "📊",
    filters: { min_vol_ratio: 2, min_momentum: 0, min_days: 30 },
    desc: "Volume hari ini ≥2× rata-rata 20 hari — aktivitas tidak wajar",
  },
  {
    label: "Oversold Sehat",
    emoji: "🩸",
    filters: { rsi_max: 35, min_value: 5e9, min_days: 30 },
    desc: "RSI <35 tapi masih likuid — kandidat rebound",
  },
  {
    label: "Trend Up Tenang",
    emoji: "🧘",
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
  ["Foreign net", "Net buy/sell asing hari terakhir (Rp, notional = lembar × close)."],
  ["Likuiditas", "Nilai transaksi harian — filter minimal untuk hindari saham 'oleh-oleh'."],
];

function signalBadge(sig: string): string {
  if (sig === "BUY") return "badge badge-buy";
  if (sig === "SELL") return "badge badge-sell";
  return "badge badge-hold";
}

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>(PRESETS[0].filters);
  const [active, setActive] = useState(0);
  const { data, error, isLoading } = useScreener(filters);

  function apply(i: number) {
    setActive(i);
    setFilters(PRESETS[i].filters);
  }

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

      <Card title="Strategi Preset" subtitle="Klik untuk menjalankan skenario">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => apply(i)}
              className={`card card-hover p-4 text-left ${active === i ? "ring-1 ring-[var(--accent)]" : ""}`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden className="text-lg">{p.emoji}</span>
                {p.label}
              </p>
              <p className="text-muted mt-1 text-xs leading-relaxed">{p.desc}</p>
            </button>
          ))}
        </div>
        <details className="text-muted mt-4 text-sm">
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
      </Card>

      <Card
        title={`Hasil Screening${data ? ` · ${data.length} saham` : ""}`}
        subtitle="Diurutkan berdasarkan momentum 20 hari"
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
                  <th className="text-right">Close</th>
                  <th className="text-right">RSI</th>
                  <th className="text-right">Momentum 20d</th>
                  <th className="text-right">Vol Ratio</th>
                  <th className="text-right" title="ATR(14) % dari close">ATR%</th>
                  <th className="text-right" title="Posisi vs puncak 52 minggu">Jarak 52w</th>
                  <th className="text-right" title="Hari bursa sejak BUY/SELL terakhir">Hr sinyal</th>
                  <th className="text-right">Foreign Net</th>
                  <th className="text-right">Value</th>
                  <th className="text-center">Signal</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.code}>
                    <td>
                      <Link href={`/stock/${r.code}`} className="font-semibold hover:underline">
                        {r.code}
                      </Link>
                      {r.name && (
                        <span className="text-muted ml-2 hidden text-xs md:inline">
                          {r.name.length > 24 ? `${r.name.slice(0, 24)}…` : r.name}
                        </span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{fmtNum(r.close)}</td>
                    <td className="text-right tabular-nums">
                      {r.rsi !== null ? r.rsi.toFixed(1) : "-"}
                    </td>
                    <td className={`text-right font-semibold tabular-nums ${(r.momentum_20d ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {fmtPct(r.momentum_20d)}
                    </td>
                    <td className="text-right tabular-nums">
                      {r.vol_ratio !== null ? `${r.vol_ratio.toFixed(2)}×` : "-"}
                    </td>
                    <td
                      className={`text-right tabular-nums ${
                        (r.atr_pct ?? 0) >= 5 ? "text-down" : ""
                      }`}
                      title="ATR(14) % dari close — tinggi = volatil"
                    >
                      {r.atr_pct !== null ? `${r.atr_pct.toFixed(1)}%` : "-"}
                    </td>
                    <td className="text-right tabular-nums" title="0% = di puncak 52 minggu">
                      {r.dist_52w !== null ? `${r.dist_52w.toFixed(1)}%` : "-"}
                    </td>
                    <td className="text-muted text-right tabular-nums" title="Hari bursa sejak sinyal terakhir">
                      {r.days_since_signal !== null ? r.days_since_signal : "-"}
                    </td>
                    <td className={`text-right tabular-nums ${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {fmtCompact(r.foreign_net)}
                    </td>
                    <td className="text-muted text-right tabular-nums">{fmtCompact(r.value)}</td>
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
