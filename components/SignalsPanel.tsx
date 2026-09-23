"use client";

import { useSignals } from "@/lib/hooks";
import { fmtNum, fmtPct } from "@/lib/format";
import type { Signal } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

function badgeClass(sig: string): string {
  if (sig === "BUY") return "badge badge-buy";
  if (sig === "SELL") return "badge badge-sell";
  return "badge badge-hold";
}

function SignalCard({ s, onSelect, selected }: { s: Signal; onSelect?: (c: string) => void; selected?: string | null }) {
  return (
    <button
      onClick={() => onSelect?.(s.code)}
      className={`card flex flex-col gap-2 p-3 text-left transition-colors hover:bg-white/[0.03] ${
        selected === s.code ? "ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{s.code}</span>
        <span className={badgeClass(s.signal)}>{s.signal}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="tabular-nums">{fmtNum(s.close)}</span>
        <span className={`tabular-nums ${(s.pct ?? 0) >= 0 ? "text-up" : "text-down"}`}>{fmtPct(s.pct)}</span>
      </div>
      <div className="text-muted grid grid-cols-3 gap-1 text-xs tabular-nums">
        <span>RSI {s.rsi !== null ? s.rsi.toFixed(1) : "-"}</span>
        <span>SMA20 {fmtNum(s.sma20)}</span>
        <span className={s.trend_up ? "text-up" : "text-down"}>{s.trend_up ? "▲ trend" : "▼ trend"}</span>
      </div>
    </button>
  );
}

export function SignalsPanel({
  codes,
  onSelect,
  selected,
}: {
  codes?: string;
  onSelect?: (code: string) => void;
  selected?: string | null;
}) {
  const { data, error, isLoading } = useSignals(codes);

  return (
    <Card title="Trading Signals" subtitle="SMA20/50 + RSI(14) rule-based">
      {error ? (
        <ErrorState message={`Gagal memuat signals: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.map((s) => (
            <SignalCard key={s.code} s={s} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </Card>
  );
}
