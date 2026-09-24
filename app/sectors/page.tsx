"use client";

import Link from "next/link";
import { useSectors } from "@/lib/hooks";
import { fmtPct, fmtCompact } from "@/lib/format";
import type { SectorRow } from "@/lib/types";
import { Card } from "@/components/Card";
import { SectorRRGChart } from "@/components/SectorRRGChart";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

function heatColor(pct: number | null): string {
  if (pct === null) return "rgba(143,151,171,0.15)";
  const clamped = Math.max(-3, Math.min(3, pct));
  if (clamped >= 0) return `rgba(52,211,153,${0.1 + (clamped / 3) * 0.4})`;
  return `rgba(248,113,113,${0.1 + (-clamped / 3) * 0.4})`;
}

export default function SectorsPage() {
  const { data, error, isLoading } = useSectors();
  const sectors = data?.sectors ?? [];

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Analisis <span className="gradient-text">Sektor</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Rata-rata pergerakan, nilai transaksi, dan arus asing per sektor ·{" "}
          {data?.date ?? "-"}
        </p>
      </div>

      <SectorRRGChart />

      <Card title="Peta Sektor" subtitle="Diurutkan dari sektor terkuat">
        {error ? (
          <ErrorState message={`Gagal memuat sektor: ${error.message}`} />
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : sectors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Sektor</th>
                  <th className="text-right">Rata-rata %</th>
                  <th className="text-center">Breadth</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Foreign Net</th>
                  <th className="text-left">Top Stock</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.sector}>
                    <td>
                      <div
                        className="-mx-2 rounded-lg px-2 py-1.5"
                        style={{ background: heatColor(s.avg_percent) }}
                      >
                        <span className="font-semibold">{s.sector}</span>
                        <span className="text-muted ml-2 text-xs">{s.stock_count} saham</span>
                      </div>
                    </td>
                    <td
                      className={`text-right font-bold tabular-nums ${(s.avg_percent ?? 0) >= 0 ? "text-up" : "text-down"}`}
                    >
                      {fmtPct(s.avg_percent)}
                    </td>
                    <td>
                      <div className="flex h-2 overflow-hidden rounded-full" style={{ minWidth: 90 }}>
                        <div
                          className="bg-[var(--up)]"
                          style={{ flexGrow: s.gainers + 0.001 }}
                        />
                        <div
                          className="bg-[var(--down)]"
                          style={{ flexGrow: s.losers + 0.001 }}
                        />
                      </div>
                      <span className="text-muted text-xs">
                        {s.gainers}▲ / {s.losers}▼
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{fmtCompact(s.total_value)}</td>
                    <td
                      className={`text-right tabular-nums ${(s.total_foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`}
                    >
                      {fmtCompact(s.total_foreign_net)}
                    </td>
                    <td>
                      {s.top_stock ? (
                        <Link
                          href={`/stock/${s.top_stock.code}`}
                          className="font-medium hover:underline"
                        >
                          {s.top_stock.code}{" "}
                          <span className="text-up text-xs">{fmtPct(s.top_stock.percent)}</span>
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-muted text-xs leading-relaxed">
        Catatan: klasifikasi sektor memakai mapping kurasi internal (gaya IDX-IC)
        untuk emiten likuid; emiten di luar mapping masuk kategori “Lainnya”.
      </p>
    </main>
  );
}
