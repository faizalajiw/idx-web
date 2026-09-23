"use client";

import { useSessionMovers } from "@/lib/hooks";
import { fmtNum, fmtPct } from "@/lib/format";
import type { Mover } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

function MoverRow({ m, kind }: { m: Mover; kind: "gain" | "lose" }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="font-medium">{m.code}</span>
      <span className="flex items-center gap-3">
        <span className="text-muted tabular-nums">{fmtNum(m.close)}</span>
        <span className={`tabular-nums font-semibold ${kind === "gain" ? "text-up" : "text-down"}`}>
          {fmtPct(m.percent)}
        </span>
      </span>
    </li>
  );
}

export function SessionMovers() {
  const { data, error, isLoading } = useSessionMovers();

  return (
    <Card title="Session Movers (EOD)" subtitle={data?.date ? `Tanggal ${data.date}` : undefined}>
      {error ? (
        <ErrorState message={`Gagal memuat session movers: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-56" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-up mb-2 text-xs font-semibold">Top Gainers</p>
            {data.top_gainers.length ? (
              <ul className="space-y-1.5">
                {data.top_gainers.map((m) => (
                  <MoverRow key={m.code} m={m} kind="gain" />
                ))}
              </ul>
            ) : (
              <EmptyState />
            )}
          </div>
          <div>
            <p className="text-down mb-2 text-xs font-semibold">Top Losers</p>
            {data.top_losers.length ? (
              <ul className="space-y-1.5">
                {data.top_losers.map((m) => (
                  <MoverRow key={m.code} m={m} kind="lose" />
                ))}
              </ul>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
