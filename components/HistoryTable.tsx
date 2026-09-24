"use client";

import { useHistory } from "@/lib/hooks";
import { fmtNum, fmtCompact, trendClass } from "@/lib/format";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

export function HistoryTable({ code }: { code: string }) {
  const { data, error, isLoading } = useHistory(code);

  return (
    <Card title={`Riwayat Harga — ${code}`} subtitle="20 hari terakhir (terbaru di atas)">
      {error ? (
        <ErrorState message={`Gagal memuat riwayat: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">Tanggal</th>
                <th className="text-right">Open</th>
                <th className="text-right">High</th>
                <th className="text-right">Low</th>
                <th className="text-right">Close</th>
                <th className="text-right">Volume</th>
              </tr>
            </thead>
            <tbody>
              {[...data]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 20)
                .map((r, i, arr) => {
                  const prev = arr[i + 1]?.close ?? null;
                  const pct =
                    prev !== null && prev !== 0 && r.close !== null
                      ? ((r.close - prev) / prev) * 100
                      : null;
                  return (
                    <tr
                      key={r.date}
                      className="border-b border-[var(--border)]/50 last:border-0"
                    >
                      <td className="text-muted py-2 pr-3 tabular-nums">{r.date}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.open)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.high)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.low)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <span className={trendClass(pct)}>{fmtNum(r.close)}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtCompact(r.volume)}</td>
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
