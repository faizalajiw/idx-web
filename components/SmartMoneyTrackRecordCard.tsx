"use client";

import { useState } from "react";
import { BookOpenCheck, TrendingUp, TrendingDown } from "lucide-react";
import { useSmartMoneyTrackRecord } from "@/lib/hooks";
import { fmtPct } from "@/lib/format";
import { Card } from "./Card";
import { InfoHint } from "./InfoHint";
import { EmptyState, ErrorState, Skeleton } from "./States";

const HORIZONS = [
  { key: "fwd5", label: "5 sesi" },
  { key: "fwd10", label: "10 sesi" },
  { key: "fwd21", label: "1 bulan" },
];

// hit_rate adalah pecahan (0.54) -> "54%".
function pctOf(x: number | null | undefined): string {
  return x === null || x === undefined ? "−" : `${Math.round(x * 100)}%`;
}

// Kepercayaan dari t-stat mean-vs-nol: |t|>=2 kuat, 1-2 sedang, <1 lemah.
function confidence(tstat: number | null | undefined): {
  label: string;
  cls: string;
} {
  if (tstat === null || tstat === undefined)
    return { label: "−", cls: "text-muted" };
  const a = Math.abs(tstat);
  if (a >= 2) return { label: "tinggi", cls: "text-up" };
  if (a >= 1) return { label: "sedang", cls: "text-[var(--accent)]" };
  return { label: "lemah", cls: "text-muted" };
}

/**
 * Track record pola klasik jejak smart money — "pola ini terbukti tidak?".
 * Menjawab rasa skeptis orang awam: bukan cuma hari ini apa yang terjadi,
 * tapi seberapa sering tiap pola bekerja di 120 sesi terakhir + beat pasar.
 */
export function SmartMoneyTrackRecordCard({
  className = "",
}: {
  className?: string;
}) {
  const { data, error, isLoading } = useSmartMoneyTrackRecord();
  const [horizon, setHorizon] = useState("fwd10");

  if (error)
    return (
      <ErrorState message={`Gagal memuat track record: ${error.message}`} />
    );

  return (
    <Card
      className={className}
      title={
        <>
          <BookOpenCheck size={16} aria-hidden /> Pola Klasik — Track Record
          <InfoHint text="Seberapa sering tiap pola berhasil di 120 sesi terakhir. 'Berfungsi' dihitung searah pola: pola beli dihitung berhasil bila harga NAIK, pola jual bila harga TURUN. 'Alpha vs pasar' = return setelah dikurangi rata-rata pasar (beat/lose market). Alat ukur keandalan, bukan rekomendasi." />
        </>
      }
      subtitle={
        data
          ? `${data.n_episodes} kejadian pola · ${data.history_sessions} sesi terakhir`
          : undefined
      }
      right={
        <div
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5"
          role="group"
          aria-label="Horizon"
        >
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              type="button"
              onClick={() => setHorizon(h.key)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                horizon === h.key
                  ? "bg-[var(--accent)] text-white"
                  : "text-muted hover:bg-white/[0.06]"
              }`}
              aria-pressed={horizon === h.key}
            >
              {h.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-56" />
      ) : data.patterns.length === 0 ? (
        <EmptyState message="Belum ada kejadian pola yang cukup untuk diukur." />
      ) : (
        <div className="space-y-2">
          <div className="text-muted grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-[var(--border)] pb-1.5 text-[10px] font-semibold uppercase tracking-wide">
            <span>Pola</span>
            <span className="text-right">Berfungsi</span>
            <span className="text-right">Alpha vs pasar</span>
            <span className="text-right">Kepercayaan</span>
          </div>
          {data.patterns.map((p) => {
            const h = p.horizons[horizon];
            if (!h) return null;
            const buy = p.direction === "buy-side";
            const conf = confidence(h.tstat);
            const eff = h.effective_alpha;
            const works = h.aligned_hit_rate !== null;
            const effGood = eff !== null && eff > 0;
            return (
              <div
                key={p.pattern}
                className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2"
                title={`n=${p.n} kejadian, ${p.n_resolved} terealisasi di horizon ini`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {buy ? (
                    <TrendingUp size={15} className="shrink-0 text-up" />
                  ) : (
                    <TrendingDown size={15} className="shrink-0 text-down" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {p.label}
                    </span>
                    <span className="text-muted block text-[10px] tabular-nums">
                      {p.n}× kejadian
                    </span>
                  </span>
                </span>
                <span
                  className={`text-right text-sm font-bold tabular-nums ${
                    works && h.aligned_hit_rate !== null
                      ? h.aligned_hit_rate >= 0.5
                        ? "text-up"
                        : "text-down"
                      : "text-muted"
                  }`}
                >
                  {pctOf(h.aligned_hit_rate)}
                </span>
                <span
                  className={`text-right text-sm font-semibold tabular-nums ${
                    eff === null ? "text-muted" : effGood ? "text-up" : "text-down"
                  }`}
                >
                  {eff === null ? "−" : fmtPct(eff)}
                </span>
                <span className={`text-right text-xs font-medium ${conf.cls}`}>
                  {conf.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
