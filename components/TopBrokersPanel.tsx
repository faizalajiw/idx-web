"use client";

import { useState } from "react";
import { useTopBrokers } from "@/lib/hooks";
import { fmtNum, fmtCompact } from "@/lib/format";
import type { BrokerLeaderRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";

function BrokerItem({ r, rank }: { r: BrokerLeaderRow; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--border)] transition-colors hover:bg-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="text-muted w-4 shrink-0 text-center text-xs font-semibold tabular-nums">{rank}</span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">{r.broker_code}</span>
          {r.broker_name && <span className="text-muted truncate text-[10px]">{r.broker_name}</span>}
        </div>
        <span className="ml-auto text-sm font-semibold tabular-nums">Rp {fmtCompact(r.value)}</span>
      </button>
      {open && (
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--border)] px-3 py-2">
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

export function TopBrokersPanel() {
  const { data, error, isLoading } = useTopBrokers();

  return (
    <Card
      title="Top Broker"
      subtitle="Broker teraktif per nilai transaksi"
      info="Broker dengan nilai transaksi terbesar pada sesi bursa terakhir (data akhir sesi)."
      right={<LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />}
    >
      {error ? (
        <ErrorState message={`Gagal memuat Top Broker: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[46px]" />
          ))}
        </div>
      ) : data.rows.length === 0 ? (
        <EmptyState message="Belum ada data broker." />
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {data.rows.map((r, i) => (
            <BrokerItem key={r.broker_code} r={r} rank={i + 1} />
          ))}
        </div>
      )}
    </Card>
  );
}
