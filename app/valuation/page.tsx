"use client";

import Link from "next/link";
import { useValuation } from "@/lib/hooks";
import { fmtNum, fmtPct } from "@/lib/format";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { RegimeBanner } from "@/components/RegimeBanner";

function zBadge(z: number | null): string {
  if (z === null) return "badge badge-hold";
  if (z <= -2) return "badge badge-buy";
  if (z <= -1) return "badge badge-accent";
  if (z >= 2) return "badge badge-sell";
  return "badge badge-hold";
}

function RowTable({ rows, kind }: {
  rows: {
    code: string;
    name: string | null;
    close: number | null;
    z_score: number | null;
    momentum_pct: number | null;
    rsi: number | null;
    trend_up: boolean;
    target_price: number | null;
  }[];
  kind: "under" | "over";
}) {
  if (rows.length === 0) return <EmptyState message="Tidak ada saham di kategori ini hari ini." />;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Kode</th>
            <th className="text-right">Close</th>
            <th className="text-right">Rata-rata 60d</th>
            <th className="text-right">Z-Score</th>
            <th className="text-right">Momentum 20d</th>
            <th className="text-right">RSI</th>
            <th className="text-center">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td>
                <Link href={`/stock/${r.code}`} className="font-semibold hover:underline">
                  {r.code}
                </Link>
                {r.name && (
                  <span className="text-muted ml-2 hidden text-xs md:inline">
                    {r.name.length > 22 ? `${r.name.slice(0, 22)}…` : r.name}
                  </span>
                )}
              </td>
              <td className="text-right tabular-nums">{fmtNum(r.close)}</td>
              <td className="text-muted text-right tabular-nums">{fmtNum(r.target_price)}</td>
              <td className="text-right">
                <span className={zBadge(r.z_score)}>{r.z_score?.toFixed(2) ?? "-"}</span>
              </td>
              <td className={`text-right tabular-nums ${(r.momentum_pct ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                {fmtPct(r.momentum_pct)}
              </td>
              <td className="text-right tabular-nums">{r.rsi !== null ? r.rsi.toFixed(1) : "-"}</td>
              <td className="text-center">
                <span className={r.trend_up ? "text-up" : "text-down"}>
                  {r.trend_up ? "▲" : "▼"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ValuationPage() {
  const { data, error, isLoading } = useValuation();

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Under<span className="gradient-text">/Over</span>value
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Screening statistik terhadap harga saham sendiri (mean reversion)
        </p>
      </div>

      <RegimeBanner />

      <div className="card p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
        <span className="font-semibold text-[var(--fg)]">Cara baca: </span>
        Z-score mengukur seberapa jauh harga sekarang dari rata-rata 60 hari
        (dalam satuan deviasi standar).{" "}
        <span className="text-up font-medium">Undervalued</span> = harga tertekan
        jauh di bawah rata-ratanya sendiri (z ≤ −1.0) — kandidat “kualitas diskon”.{" "}
        <span className="text-down font-medium">Overvalued</span> = harga melar di
        atas rata-rata (z ≥ +1.5) — waspada koreksi. Ini{" "}
        <span className="font-semibold text-[var(--fg)]">bukan</span> valuasi
        fundamental (P/E, PBV) — data fundamental tidak tersedia di endpoint gratis
        IDX; ini alat screening, bukan rekomendasi beli/jual.
      </div>

      {error ? (
        <ErrorState message={`Gagal memuat valuasi: ${error.message}`} />
      ) : isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <Card
            title={`🟢 Potensi Undervalued${data ? ` · ${data.undervalued.length} saham` : ""}`}
            subtitle="Harga di bawah band statistiknya, tertekan paling dalam di atas"
          >
            {data && <RowTable rows={data.undervalued} kind="under" />}
          </Card>
          <Card
            title={`🔴 Potensi Overvalued${data ? ` · ${data.overvalued.length} saham` : ""}`}
            subtitle="Harga paling melar di atas band statistiknya"
          >
            {data && <RowTable rows={data.overvalued} kind="over" />}
          </Card>
        </>
      )}
    </main>
  );
}
