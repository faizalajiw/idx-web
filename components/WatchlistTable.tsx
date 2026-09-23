"use client";

import { useWatchlist } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

export function WatchlistTable({
  codes,
  onSelect,
  selected,
}: {
  codes?: string;
  onSelect?: (code: string) => void;
  selected?: string | null;
}) {
  const { data, error, isLoading } = useWatchlist(codes);

  return (
    <Card title="Watchlist" subtitle="Snapshot terakhir per emiten">
      {error ? (
        <ErrorState message={`Gagal memuat watchlist: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-48" />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted border-b border-[var(--border)] text-left text-xs">
                <th className="py-2 pr-3 font-medium">Kode</th>
                <th className="py-2 pr-3 text-right font-medium">Close</th>
                <th className="py-2 pr-3 text-right font-medium">Change</th>
                <th className="py-2 pr-3 text-right font-medium">%</th>
                <th className="py-2 pr-3 text-right font-medium">Volume</th>
                <th className="py-2 pr-3 text-right font-medium">Foreign Net</th>
                <th className="py-2 text-right font-medium">Hari</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const isSel = selected === r.code;
                return (
                  <tr
                    key={r.code}
                    onClick={() => onSelect?.(r.code)}
                    className={`border-b border-[var(--border)]/50 transition-colors ${
                      onSelect ? "cursor-pointer hover:bg-white/[0.03]" : ""
                    } ${isSel ? "bg-[var(--accent)]/10" : ""}`}
                  >
                    <td className="py-2 pr-3 font-semibold">{r.code}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.close)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${(r.change ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {fmtNum(r.change)}
                    </td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${(r.percent ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {fmtPct(r.percent)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtCompact(r.volume)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                      {fmtCompact(r.foreign_net)}
                    </td>
                    <td className="text-muted py-2 text-right tabular-nums">{r.hist_days}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
