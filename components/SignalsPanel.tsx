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

function SignalTally({ data }: { data: Signal[] }) {
  const counts = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const s of data) {
    if (s.signal === "BUY") counts.BUY++;
    else if (s.signal === "SELL") counts.SELL++;
    else counts.HOLD++;
  }
  const items: { label: string; value: number; dot: string; text: string }[] = [
    { label: "BUY", value: counts.BUY, dot: "bg-[var(--up)]", text: "text-up" },
    { label: "HOLD", value: counts.HOLD, dot: "bg-[var(--muted)]", text: "text-muted" },
    { label: "SELL", value: counts.SELL, dot: "bg-[var(--down)]", text: "text-down" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${it.dot}`} />
          <span className="text-muted text-[10px] font-medium uppercase tracking-wide">{it.label}</span>
          <span className={`text-xs font-semibold tabular-nums ${it.text}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted text-[10px] uppercase tracking-wide">{label}</span>
      <span className={`text-xs tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>{value}</span>
    </div>
  );
}

function SignalRow({ s, onSelect, selected }: { s: Signal; onSelect?: (c: string) => void; selected?: string | null }) {
  const up = (s.pct ?? 0) >= 0;
  return (
    <button
      onClick={() => onSelect?.(s.code)}
      className={`flex flex-col gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-white/[0.04] ${
        selected === s.code ? "ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.trend_up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`} />
        <span className="text-sm font-semibold">{s.code}</span>
        <span className={`${badgeClass(s.signal)} shrink-0`}>{s.signal}</span>
        {s.div_adjusted && (
          <span
            title={`SELL mentah dibatalkan: harga turun mekanis ex-dividend (Rp ${s.div_cash ?? 0}/saham) — bukan tekanan jual`}
            className="shrink-0 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]"
          >
            ex-div
          </span>
        )}
        <span className="ml-auto text-sm font-semibold tabular-nums">{fmtNum(s.close)}</span>
        <span className={`text-xs tabular-nums ${up ? "text-up" : "text-down"}`}>{fmtPct(s.pct)}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-2">
        <Metric label="RSI" value={s.rsi !== null ? s.rsi.toFixed(1) : "-"} tone={s.rsi !== null ? (s.rsi >= 70 ? "down" : s.rsi <= 30 ? "up" : undefined) : undefined} />
        <Metric label="SMA20" value={fmtNum(s.sma20)} />
        <Metric label="MACD" value={s.macd !== null ? s.macd.toFixed(2) : "-"} tone={s.macd !== null ? (s.macd >= 0 ? "up" : "down") : undefined} />
        <Metric label="Trend" value={s.trend_up ? "Naik" : "Turun"} tone={s.trend_up ? "up" : "down"} />
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
    <Card
      title="Trading Signals"
      subtitle="SMA20/50 + RSI(14) rule-based"
      right={data && data.length > 0 ? <SignalTally data={data} /> : undefined}
    >
      {error ? (
        <ErrorState message={`Gagal memuat signals: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1">
          {data.map((s) => (
            <SignalRow key={s.code} s={s} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </Card>
  );
}
