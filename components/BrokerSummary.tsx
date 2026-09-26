"use client";

import { useStockBrokers } from "@/lib/hooks";
import { fmtCompact } from "@/lib/format";
import type { BrokerRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

function Side({ title, rows, kind }: { title: string; rows: BrokerRow[]; kind: "buy" | "sell" }) {
  const tone = kind === "buy" ? "text-up" : "text-down";
  return (
    <div>
      <p className={`mb-2 text-xs font-semibold ${tone}`}>{title}</p>
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={`${r.broker}-${kind}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium" title={r.broker}>
                {r.broker}
              </span>
              <span className={`shrink-0 tabular-nums font-semibold ${tone}`}>
                {fmtCompact(kind === "buy" ? r.buy_value : r.sell_value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BrokerSummary({ code }: { code: string }) {
  const { data, error, isLoading } = useStockBrokers(code);

  return (
    <Card
      title="Aliran Dana (proxy)"
      subtitle={data?.date ? `EOD ${data.date}` : "Estimasi dari data agregat"}
    >
      {error ? (
        <ErrorState message={`Gagal memuat aliran dana: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : data.top_buyers.length === 0 && data.top_sellers.length === 0 ? (
        <EmptyState message="Belum ada data aliran dana untuk emiten ini." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Side title="Sisi Beli" rows={data.top_buyers} kind="buy" />
            <Side title="Sisi Jual" rows={data.top_sellers} kind="sell" />
          </div>
          <p className="text-muted mt-3 text-xs leading-relaxed">
            Data broker tidak tersedia dari sumber gratis. Angka ini{" "}
            <span className="text-warn font-medium">estimasi</span>: agregat asing +
            proxy domestik dari imbalance bid/offer intraday (× harga close).
          </p>
        </>
      )}
    </Card>
  );
}
