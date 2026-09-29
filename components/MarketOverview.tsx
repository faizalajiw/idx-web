"use client";

import { useMarketOverview } from "@/lib/hooks";
import { fmtNum, fmtPct } from "@/lib/format";
import type { Mover } from "@/lib/types";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TickerLogo } from "./TickerLogo";
import { LastUpdated } from "./LastUpdated";

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
            <span className="flex items-center gap-2 font-medium">
              <TickerLogo code={m.code} size={22} />
              {m.code}
            </span>
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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title={<><TrendingUp size={15} className="text-up" /> Top Gainers</>} info="Saham dengan kenaikan harga persentase terbesar hari ini. Naik banyak belum tentu bagus untuk dibeli — bisa jadi sudah telanjur mahal atau baru pom-pom sesaat." right={<LastUpdated sessionDate={data?.index?.captured_at} updatedAt={data?.index?.captured_at} />} hover>
        {isLoading || !data ? <Skeleton className="h-40" /> : <MoverList items={data.top_gainers} kind="gain" />}
      </Card>
      <Card title={<><TrendingDown size={15} className="text-down" /> Top Losers</>} info="Saham dengan penurunan harga persentase terbesar hari ini. Turun banyak bukan berarti murah — cek dulu alasannya sebelum tergoda 'beli di harga diskon'." right={<LastUpdated sessionDate={data?.index?.captured_at} updatedAt={data?.index?.captured_at} />} hover>
        {isLoading || !data ? <Skeleton className="h-40" /> : <MoverList items={data.top_losers} kind="lose" />}
      </Card>
    </div>
  );
}
