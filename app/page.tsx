"use client";

import { useEffect, useRef, useState } from "react";
import { MarketOverview } from "@/components/MarketOverview";
import { LatestNewsCard } from "@/components/NewsCards";
import { TopLeadersPanel } from "@/components/TopLeadersPanel";
import { TopBrokersPanel } from "@/components/TopBrokersPanel";
import { SignalsPanel } from "@/components/SignalsPanel";
import { TechnicalChart } from "@/components/TechnicalChart";
import { MarketRegimeCard } from "@/components/MarketRegimeCard";
import { useMarketOverview, useMarketTradeSummary } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact, fmtDateStr } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  Wallet,
  Building2,
  Activity,
  Landmark,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { LastUpdated } from "@/components/LastUpdated";
import { InfoHint } from "@/components/InfoHint";

/** Satu kotak statistik di hero IHSG: ikon berwarna, label kecil, nilai utama, sub-nilai opsional. */
function StatTile({
  label,
  value,
  sub,
  warn = false,
  title,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  title?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="stat-box flex items-center gap-3 px-3.5 py-3" title={title}>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon size={18} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={`truncate text-[11px] font-medium ${warn ? "text-warn" : "text-muted"}`}>
          {label}
        </p>
        <p className="text-base font-semibold tabular-nums sm:text-lg">{value}</p>
        {sub && <p className="text-muted text-[11px] tabular-nums">{sub}</p>}
      </div>
    </div>
  );
}


/** Angka IHSG: count-up halus saat nilai berubah, hormati reduced-motion. */
function IndexValue({ value }: { value: number | null }) {
  const [display, setDisplay] = useState<number | null>(value);
  const fromRef = useRef<number | null>(null);

  useEffect(() => {
    if (value == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current ?? value;
    fromRef.current = value;
    if (reduce || from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <p
      key={value ?? "none"}
      className="index-value text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl"
    >
      {fmtNum(display, 2)}
    </p>
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

  const volLot = trade?.total.volume_lot ?? null;
  const totalValue =
    trade && hasTrade ? trade.total.value : (data?.totals.total_value ?? null);

  const tiles = [
    {
      label: "Volume",
      value: volLot != null ? `${fmtCompact(volLot)} lot` : "-",
      icon: Activity,
      color: "#38bdf8",
    },
    {
      label: "Nilai Transaksi",
      value: totalValue != null ? `Rp ${fmtCompact(totalValue)}` : "-",
      icon: Wallet,
      color: "#4ade80",
    },
    { label: "Emiten Aktif", value: fmtNum(stocks), icon: Building2, color: "#c4b5fd" },
  ];

  const segments = [
    { label: "Pasar Reguler", seg: trade?.regular, warn: false, icon: Landmark, color: "#fbbf24" },
    { label: "Pasar Non-Reguler", seg: trade?.non_regular, warn: true, icon: Handshake, color: "#fb923c" },
  ];

  return (
    <div className="card card-hover fade-up flex h-full flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted text-[11px] font-semibold tracking-[0.16em] uppercase">
            IHSG · Composite
          </p>
          <span className={`badge tabular-nums ${badgeTone}`}>
            <DirIcon size={12} className="mr-1" aria-hidden />
            {fmtNum(chg, 2)} ({fmtPct(pct)})
          </span>
        </div>
        <IndexValue value={idx?.current ?? idx?.close ?? null} />
        <LastUpdated
          sessionDate={data?.index?.captured_at}
          updatedAt={data?.index?.captured_at}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {tiles.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} icon={t.icon} color={t.color} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {segments.map((s) => (
            <StatTile
              key={s.label}
              label={s.label}
              warn={s.warn}
              icon={s.icon}
              color={s.color}
              title="1 lot = 100 lembar"
              value={s.seg?.value != null ? `Rp ${fmtCompact(s.seg.value)}` : "-"}
              sub={s.seg?.volume_lot != null ? `${fmtCompact(s.seg.volume_lot)} lot` : undefined}
            />
          ))}
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
      <LatestNewsCard />
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
