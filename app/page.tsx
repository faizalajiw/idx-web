"use client";

import { useState } from "react";
import { MarketOverview } from "@/components/MarketOverview";
import { MarketNarrationCard } from "@/components/MarketNarration";
import { SessionMovers } from "@/components/SessionMovers";
import { WatchlistTable } from "@/components/WatchlistTable";
import { HoldCheckPanel } from "@/components/HoldCheckPanel";
import { SignalsPanel } from "@/components/SignalsPanel";
import { TechnicalChart } from "@/components/TechnicalChart";
import { useMarketOverview } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact, trendClass } from "@/lib/format";
import Link from "next/link";

function HeroIndex() {
  const { data } = useMarketOverview();
  const idx = data?.index;
  const chg = idx?.change ?? 0;
  const pct = idx?.percent ?? 0;
  const up = chg > 0;
  const down = chg < 0;

  return (
    <Link
      href="/"
      className="card card-hover fade-up flex flex-wrap items-center justify-between gap-4 p-5"
    >
      <div>
        <p className="text-muted text-xs font-semibold tracking-widest uppercase">
          IHSG · Composite
        </p>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {fmtNum(idx?.current ?? idx?.close, 2)}
        </p>
        <p className={`mt-1 text-sm font-semibold tabular-nums ${trendClass(chg)}`}>
          {up ? "▲" : down ? "▼" : "•"} {fmtNum(chg, 2)} ({fmtPct(pct)})
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        <div>
          <p className="text-muted text-xs">Volume</p>
          <p className="text-sm font-semibold tabular-nums">
            {fmtCompact(data?.totals.total_volume)}
          </p>
        </div>
        <div>
          <p className="text-muted text-xs">Value</p>
          <p className="text-sm font-semibold tabular-nums">
            Rp {fmtCompact(data?.totals.total_value)}
          </p>
        </div>
        <div>
          <p className="text-muted text-xs">Emiten Aktif</p>
          <p className="text-sm font-semibold tabular-nums">
            {fmtNum(data?.totals.stock_count)}
          </p>
        </div>
      </div>
    </Link>
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

      <HeroIndex />
      <MarketNarrationCard />
      <MarketOverview />

      {/* Screening: watchlist + signals side by side, both drive the chart below */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WatchlistTable onSelect={setSelected} selected={selected} />
        <SignalsPanel onSelect={setSelected} selected={selected} />
      </div>

      {/* Shared detail canvas fed by both selectors above */}
      <TechnicalChart code={selected} />

      {/* Secondary analysis: hold check + session movers side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HoldCheckPanel onSelect={setSelected} selected={selected} />
        <SessionMovers />
      </div>
    </main>
  );
}
