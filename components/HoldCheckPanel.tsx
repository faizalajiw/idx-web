"use client";

import { useState } from "react";
import { useHoldCheck } from "@/lib/hooks";
import { fmtNum } from "@/lib/format";
import type { HoldCheckItem } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const VERDICT_STYLES: Record<string, { badge: string; bar: string; icon: string }> = {
  "STRONG HOLD": { badge: "badge badge-buy", bar: "var(--up)", icon: "✅" },
  HOLD: { badge: "badge badge-hold", bar: "var(--accent)", icon: "🙂" },
  TRIM: { badge: "badge badge-warn", bar: "#fbbf24", icon: "⚠️" },
  EXIT: { badge: "badge badge-sell", bar: "var(--down)", icon: "🚪" },
};

function verdictStyle(v: string) {
  return VERDICT_STYLES[v] ?? VERDICT_STYLES.HOLD;
}

function scoreColor(score: number): string {
  if (score >= 75) return "var(--up)";
  if (score >= 55) return "var(--accent)";
  if (score >= 35) return "#fbbf24";
  return "var(--down)";
}

function HoldCard({
  item,
  onSelect,
  selected,
}: {
  item: HoldCheckItem;
  onSelect?: (c: string) => void;
  selected?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const style = verdictStyle(item.verdict);

  return (
    <div
      className={`card flex flex-col gap-2 p-3 transition-colors hover:bg-white/[0.03] ${
        selected === item.code ? "ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <button
        onClick={() => onSelect?.(item.code)}
        className="flex items-center justify-between text-left"
        aria-label={`Pilih ${item.code}`}
      >
        <span className="font-semibold">
          {item.code}
          {item.name ? <span className="text-muted ml-2 hidden text-xs lg:inline">{item.name}</span> : null}
        </span>
        <span className={style.badge}>{style.icon} {item.verdict}</span>
      </button>

      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className="text-muted">Skor kelayakan</span>
          <span className="font-semibold" style={{ color: scoreColor(item.score) }}>
            {item.score}/100
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${item.score}%`, background: scoreColor(item.score) }}
          />
        </div>
      </div>

      {/* Metric chips */}
      <div className="text-muted grid grid-cols-3 gap-1 text-xs tabular-nums">
        <span>
          RSI {item.rsi !== null ? item.rsi.toFixed(0) : "-"}
        </span>
        <span>
          z {item.z_score !== null ? (item.z_score > 0 ? "+" : "") + item.z_score.toFixed(1) : "-"}
        </span>
        <span className={item.trend_up ? "text-up" : "text-down"}>
          {item.trend_up ? "▲ trend" : "▼ trend"}
        </span>
      </div>

      {/* Expandable reasons */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted flex items-center gap-1 text-xs hover:text-[var(--fg)]"
        aria-expanded={open}
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span> Alasan ({item.reasons.length})
      </button>
      {open && (
        <ul className="fade-up space-y-1 border-l-2 border-[var(--border)] pl-3 text-xs">
          {item.reasons.map((r, i) => (
            <li key={i} className="text-muted">
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HoldCheckPanel({
  codes,
  onSelect,
  selected,
}: {
  codes?: string;
  onSelect?: (code: string) => void;
  selected?: string | null;
}) {
  const { data, error, isLoading } = useHoldCheck(codes);
  const items = data?.items ?? [];
  const counts = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.verdict] = (acc[it.verdict] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Card
      title="Hold Check"
      subtitle="Sinyal teknikal + valuasi z-score → skor kelayakan 0–100"
    >
      {error ? (
        <ErrorState message={`Gagal memuat hold check: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          <div className="text-muted flex flex-wrap gap-2 text-xs">
            {(["STRONG HOLD", "HOLD", "TRIM", "EXIT"] as const).map((v) =>
              counts[v] ? (
                <span key={v} className={verdictStyle(v).badge}>
                  {verdictStyle(v).icon} {v}: {counts[v]}
                </span>
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((it) => (
              <HoldCard key={it.code} item={it} onSelect={onSelect} selected={selected} />
            ))}
          </div>
          <p className="text-muted text-[11px] leading-snug">
            Alat bantu riset, bukan rekomendasi beli/jual. Skor gabungan dari sinyal
            SMA20/50 + RSI, MACD, Bollinger, dan posisi harga vs band 60-hari.
          </p>
        </div>
      )}
    </Card>
  );
}
