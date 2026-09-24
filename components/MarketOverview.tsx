"use client";

import { useMarketOverview } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact, trendClass } from "@/lib/format";
import type { Mover } from "@/lib/types";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card card-hover p-4">
      <p className="text-muted text-xs">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone ?? ""}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${tone ?? "text-muted"}`}>{sub}</p>}
    </div>
  );
}

function MoverList({ items, kind }: { items: Mover[]; kind: "gain" | "lose" }) {
  return (
    <div>
      <div className="text-muted grid grid-cols-[1.5rem_1fr_5rem_4rem] items-center gap-3 border-b border-[var(--border)] px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wide">
        <span className="text-right">#</span>
        <span>Kode</span>
        <span className="text-right">Harga</span>
        <span className="text-right">%</span>
      </div>
      <ul className="mt-1 space-y-1">
        {items.map((m, i) => (
          <li
            key={m.code}
            className="grid grid-cols-[1.5rem_1fr_5rem_4rem] items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.04]"
          >
            <span className="text-muted text-right text-xs tabular-nums">{i + 1}</span>
            <span className="font-medium">{m.code}</span>
            <span className="text-muted text-right tabular-nums">{fmtNum(m.close)}</span>
            <span className={`text-right font-semibold tabular-nums ${kind === "gain" ? "text-up" : "text-down"}`}>
              {fmtPct(m.percent)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketOverview() {
  const { data, error, isLoading } = useMarketOverview();

  if (error) return <ErrorState message={`Gagal memuat market overview: ${error.message}`} />;

  const idx = data?.index;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <Stat
              label="IHSG (COMPOSITE)"
              value={fmtNum(idx?.current ?? idx?.close, 2)}
              sub={`${fmtNum(idx?.change, 2)} (${fmtPct(idx?.percent)})`}
              tone={trendClass(idx?.change)}
            />
            <Stat label="Total Volume" value={fmtCompact(data.totals.total_volume)} />
            <Stat label="Total Value" value={`Rp ${fmtCompact(data.totals.total_value)}`} />
            <Stat label="Emiten Aktif" value={fmtNum(data.totals.stock_count)} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="🚀 Top Gainers" hover>
          {isLoading || !data ? <Skeleton className="h-40" /> : <MoverList items={data.top_gainers} kind="gain" />}
        </Card>
        <Card title="🩸 Top Losers" hover>
          {isLoading || !data ? <Skeleton className="h-40" /> : <MoverList items={data.top_losers} kind="lose" />}
        </Card>
      </div>
    </div>
  );
}
