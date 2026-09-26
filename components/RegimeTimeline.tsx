"use client";

import { useRegimeHistory } from "@/lib/hooks";
import { Card } from "./Card";

const REGIME_COLOR: Record<string, string> = {
  TRENDING_UP: "var(--up)",
  TRENDING_DOWN: "var(--down)",
  TRANSITION: "#fbbf24",
  RANGING: "var(--fg-muted)",
};

/** Strip timeline regime: 1 sel = 1 hari bursa (60 hari terakhir). */
export function RegimeTimeline() {
  const { data, error, isLoading } = useRegimeHistory(60);

  if (error || (!isLoading && (!data || data.recent.length === 0))) return null;

  return (
    <Card
      title="Timeline Regime IHSG"
      subtitle="60 hari bursa terakhir — warna = regime, arsir = volatilitas tinggi"
    >
      {isLoading || !data ? (
        <div className="h-8 animate-pulse rounded bg-white/[0.04]" />
      ) : (
        <div className="flex gap-[2px] overflow-hidden" role="img" aria-label="Timeline regime IHSG">
          {data.recent.slice(-60).map((d) => {
            const color = REGIME_COLOR[d.regime ?? ""] ?? "var(--border)";
            const hot = (d.realized_vol ?? 0) >= 30;
            return (
              <div
                key={d.date}
                title={`${d.date} · ${d.regime} · ADX ${d.adx ?? "-"} · vol ${d.realized_vol ?? "-"}%`}
                className="h-8 flex-1 rounded-sm transition-transform hover:scale-y-125"
                style={{
                  background: color,
                  opacity: hot ? 1 : 0.55,
                  outline: hot ? "1px solid rgba(251,191,36,.7)" : undefined,
                }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
