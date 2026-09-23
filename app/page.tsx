"use client";

import { useState } from "react";
import { MarketBadge } from "@/components/MarketBadge";
import { MarketOverview } from "@/components/MarketOverview";
import { SessionMovers } from "@/components/SessionMovers";
import { WatchlistTable } from "@/components/WatchlistTable";
import { SignalsPanel } from "@/components/SignalsPanel";
import { TechnicalChart } from "@/components/TechnicalChart";

export default function DashboardPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IDX Dashboard</h1>
          <p className="text-muted text-sm">Near-real-time market data & analytics · delayed ~5–15 menit</p>
        </div>
        <div className="flex items-center gap-3">
          <MarketBadge />
          <span className="text-muted hidden text-xs sm:block">Auto-refresh 30s</span>
        </div>
      </header>

      <div className="space-y-4">
        <MarketOverview />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <WatchlistTable onSelect={setSelected} selected={selected} />
            <TechnicalChart code={selected} />
          </div>
          <div className="space-y-4">
            <SignalsPanel onSelect={setSelected} selected={selected} />
            <SessionMovers />
          </div>
        </div>
      </div>
    </main>
  );
}
