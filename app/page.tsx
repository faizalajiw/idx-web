"use client";

import { useState } from "react";
import { MarketOverview } from "@/components/MarketOverview";
import { MarketNarrationCard } from "@/components/MarketNarration";
import { TopLeadersPanel } from "@/components/TopLeadersPanel";
import { TopBrokersPanel } from "@/components/TopBrokersPanel";
import { SignalsPanel } from "@/components/SignalsPanel";
import { TechnicalChart } from "@/components/TechnicalChart";
import { MarketRegimeCard } from "@/components/MarketRegimeCard";
import { useMarketOverview, useMarketTradeSummary } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact, fmtDateStr } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LastUpdated } from "@/components/LastUpdated";
import { InfoHint } from "@/components/InfoHint";
import type { MarketTradeSummary } from "@/lib/types";

/** Kotak segmen pasar (reguler / non-reguler) — jadi item grid di hero IHSG. */
function SegmentBox({
  label,
  seg,
  warn = false,
}: {
  label: string;
  seg?: MarketTradeSummary["regular"];
  warn?: boolean;
}) {
  return (
    <div
      className="stat-box px-4 py-3 text-center sm:text-left"
      title="1 lot = 100 lembar"
    >
      <p
        className={`text-[10px] font-medium tracking-widest uppercase ${warn ? "text-warn" : "text-muted"}`}
      >
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
        {seg?.value != null ? `Rp ${fmtCompact(seg.value)}` : "-"}
      </p>
      <p className="text-muted mt-0.5 text-[11px] tabular-nums">
        {seg?.volume_lot != null ? `${fmtCompact(seg.volume_lot)} lot` : "-"}
      </p>
    </div>
  );
}


function HeroIndex() {
  const { data } = useMarketOverview();
  // Ringkasan pasar reguler/non-reguler dipakai di grid SAMA di bawah, bukan
  // kartu terpisah. Volume/Value hero jadi TOTAL pasar saat data itu ada
  // (kalau tidak, fallback ke angka lama dari overview).
  const { data: trade } = useMarketTradeSummary();
  const hasTrade = trade?.date != null && trade?.total.value != null;

  const idx = data?.index;
  const chg = idx?.change ?? 0;
  const pct = idx?.percent ?? 0;
  const up = chg > 0;
  const down = chg < 0;
  const badgeTone = up ? "badge-buy" : down ? "badge-sell" : "badge-hold";
  const DirIcon = up ? TrendingUp : down ? TrendingDown : Minus;

  const stocks = trade?.stock_count || data?.totals.stock_count || 0;

  const stats = [
    {
      label: "Volume",
      value: fmtCompact(trade?.total.volume_lot ?? null),
      prefix: "",
      suffix: trade?.total.volume_lot != null ? " lot" : "",
    },
    {
      label: "Value",
      value: fmtCompact(trade && hasTrade ? trade.total.value : (data?.totals.total_value ?? null)),
      prefix: "Rp ",
      suffix: "",
    },
    { label: "Emiten Aktif", value: fmtNum(stocks), prefix: "", suffix: "" },
  ];

  return (
    <div className="card card-hover fade-up flex h-full flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
            IHSG · Composite
          </p>
          <span className={`badge tabular-nums ${badgeTone}`}>
            <DirIcon size={12} className="mr-1" aria-hidden />
            {fmtNum(chg, 2)} ({fmtPct(pct)})
          </span>
          <LastUpdated
            sessionDate={data?.index?.captured_at}
            updatedAt={data?.index?.captured_at}
          />
        </div>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {fmtNum(idx?.current ?? idx?.close, 2)}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        {/* Satu grid: Volume, Value, Emiten Aktif + rincian reguler/non-reguler */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-box px-4 py-3 text-center sm:text-left"
            >
              <p className="text-muted text-[10px] font-medium tracking-widest uppercase">
                {s.label}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
                {s.prefix}
                {s.value}
                {s.suffix}
              </p>
            </div>
          ))}

          <SegmentBox
            label="Pasar Reguler"
            seg={trade?.regular}
            warn={false}
          />
          <SegmentBox
            label="Pasar Non-Reguler"
            seg={trade?.non_regular}
            warn
          />
        </div>

        <p className="text-muted flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
          {trade && hasTrade ? (
            <>
              <span>Sesi bursa {fmtDateStr(trade.date)}</span>
              {trade.non_regular_share_value != null && (
                <span>· non-reguler {(trade.non_regular_share_value * 100).toFixed(1)}% value</span>
              )}
              {trade.non_regular_share_volume != null && (
                <span>· {(trade.non_regular_share_volume * 100).toFixed(1)}% volume</span>
              )}
              <span>· angka final setelah pasar tutup</span>
            </>
          ) : (
            <span>
              Pasar reguler/non-reguler: data sesi terbaru belum tersedia · angka final setelah pasar tutup
            </span>
          )}
          <InfoHint text="Pasar reguler = lelang terus-menerus + pra-closing (dipakai harga referensi). Pasar non-reguler = pasar tunai + negosiasi, umumnya transaksi besar di luar lelang. 1 lot = 100 lembar." />
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard <span className="gradient-text">Pasar</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          DataIDX delayed ~5–15 menit · auto-refresh 30 detik
        </p>
      </div>

      {/* Hero IHSG: volume/value total + rincian pasar reguler vs non-reguler */}
      <HeroIndex />
      <MarketRegimeCard />
      <MarketNarrationCard />
      <MarketOverview />

      {/* Leaderboard likuiditas: realtime saat jam bursa, EOD di luar jam */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TopLeadersPanel metric="volume" onSelect={setSelected} selected={selected} />
        <TopLeadersPanel metric="value" onSelect={setSelected} selected={selected} />
        <TopLeadersPanel metric="frequency" onSelect={setSelected} selected={selected} />
        <TopBrokersPanel />
      </div>

      {/* Sinyal teknikal, ikut memilih emiten untuk chart di bawah */}
      <SignalsPanel onSelect={setSelected} selected={selected} />

      {/* Shared detail canvas fed by both selectors above */}
      <TechnicalChart code={selected} />
    </main>
  );
}
