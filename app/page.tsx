"use client";

import { useState } from "react";
import { MarketOverview } from "@/components/MarketOverview";
import { MarketNarrationCard } from "@/components/MarketNarration";
import { TopLeadersPanel } from "@/components/TopLeadersPanel";
import { TopBrokersPanel } from "@/components/TopBrokersPanel";
import { SignalsPanel } from "@/components/SignalsPanel";
import { TechnicalChart } from "@/components/TechnicalChart";
import { MarketRegimeCard } from "@/components/MarketRegimeCard";
import { useMarketOverview } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LastUpdated } from "@/components/LastUpdated";

function HeroIndex() {
  const { data } = useMarketOverview();
  const idx = data?.index;
  const chg = idx?.change ?? 0;
  const pct = idx?.percent ?? 0;
  const up = chg > 0;
  const down = chg < 0;
  const badgeTone = up ? "badge-buy" : down ? "badge-sell" : "badge-hold";
  const DirIcon = up ? TrendingUp : down ? TrendingDown : Minus;

  const stats = [
    { label: "Volume", value: fmtCompact(data?.totals.total_volume), prefix: "" },
    { label: "Value", value: fmtCompact(data?.totals.total_value), prefix: "Rp " },
    { label: "Emiten Aktif", value: fmtNum(data?.totals.stock_count), prefix: "" },
  ];

  return (
    <div className="card card-hover fade-up flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
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

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[var(--border)] px-4 py-3 text-center sm:text-left"
          >
            <p className="text-muted text-[10px] font-medium tracking-widest uppercase">
              {s.label}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">
              {s.prefix}
              {s.value}
            </p>
          </div>
        ))}
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
