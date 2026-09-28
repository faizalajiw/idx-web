"use client";

import { useState } from "react";
import { useMarketLeaders } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { LeaderRow, MarketLeaders } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";
import { TickerLogo } from "./TickerLogo";

type Metric = "volume" | "value" | "frequency";

const META: Record<
  Metric,
  { title: string; subtitle: string; info: string; unit: (r: LeaderRow) => string }
> = {
  volume: {
    title: "Top Volume",
    subtitle: "Lembar diperdagangkan terbanyak",
    info: "Emiten dengan jumlah lembar saham (volume) diperdagangkan terbanyak. Saat jam bursa memakai data realtime; di luar jam pakai data akhir sesi (EOD) terakhir.",
    unit: (r) => fmtCompact(r.volume),
  },
  value: {
    title: "Top Value",
    subtitle: "Nilai transaksi terbesar (Rp)",
    info: "Emiten dengan nilai transaksi (rupiah) terbesar. Saat jam bursa memakai data realtime; di luar jam pakai data akhir sesi (EOD) terakhir.",
    unit: (r) => `Rp ${fmtCompact(r.value)}`,
  },
  frequency: {
    title: "Top Frequency",
    subtitle: "Frekuensi transaksi terbanyak",
    info: "Emiten dengan jumlah transaksi (frekuensi) terbanyak. Frekuensi tidak tersedia realtime, jadi panel ini selalu memakai data akhir sesi (EOD) terakhir.",
    unit: (r) => `${fmtNum(r.frequency)}x`,
  },
};

function SourceBadge({ data }: { data: MarketLeaders }) {
  const live = data.source === "intraday";
  return (
    <span
      title={live ? "Ranking realtime dari data intraday" : "Ranking dari data akhir sesi (EOD) terakhir"}
      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        live
          ? "border-[var(--up)]/40 bg-[var(--up)]/10 text-up"
          : "border-[var(--border)] text-muted"
      }`}
    >
      {live ? "Live" : "EOD"}
    </span>
  );
}

function LeaderItem({
  r,
  rank,
  metric,
  onSelect,
  selected,
}: {
  r: LeaderRow;
  rank: number;
  metric: Metric;
  onSelect?: (c: string) => void;
  selected?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const up = (r.percent ?? 0) >= 0;
  const meta = META[metric];

  return (
    <div
      className={`rounded-lg border border-[var(--border)] transition-colors hover:bg-white/[0.04] ${
        selected === r.code ? "ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          onSelect?.(r.code);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="text-muted w-4 shrink-0 text-center text-xs font-semibold tabular-nums">{rank}</span>
        <TickerLogo code={r.code} size={22} />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">{r.code}</span>
          {r.name && <span className="text-muted truncate text-[10px]">{r.name}</span>}
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="text-sm font-semibold tabular-nums">{meta.unit(r)}</span>
          <span className={`text-[11px] tabular-nums ${up ? "text-up" : "text-down"}`}>{fmtPct(r.percent)}</span>
        </div>
      </button>
      {open && (
        <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] px-3 py-2">
          <Detail label="Harga" value={fmtNum(r.close)} />
          <Detail label="Volume" value={fmtCompact(r.volume)} />
          <Detail label="Value" value={`Rp ${fmtCompact(r.value)}`} />
          <Detail label="Freq" value={r.frequency !== null ? `${fmtNum(r.frequency)}x` : "-"} />
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted text-[10px] uppercase tracking-wide">{label}</span>
      <span className="text-xs tabular-nums">{value}</span>
    </div>
  );
}

export function TopLeadersPanel({
  metric,
  onSelect,
  selected,
}: {
  metric: Metric;
  onSelect?: (code: string) => void;
  selected?: string | null;
}) {
  const { data, error, isLoading } = useMarketLeaders(metric);
  const meta = META[metric];

  return (
    <Card
      title={meta.title}
      subtitle={meta.subtitle}
      info={meta.info}
      right={
        <div className="flex items-center gap-2">
          {data && <SourceBadge data={data} />}
          <LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />
        </div>
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat ${meta.title}: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[46px]" />
          ))}
        </div>
      ) : data.rows.length === 0 ? (
        <EmptyState message="Belum ada data ranking." />
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {data.rows.map((r, i) => (
            <LeaderItem
              key={r.code}
              r={r}
              rank={i + 1}
              metric={metric}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
