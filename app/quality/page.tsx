"use client";

import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { fmtNum } from "@/lib/format";
import {
  useQualityOverview,
  useQuarantine,
  useQuarantineReasons,
  useCoverageGaps,
  useThinDays,
  useCorpActionSummary,
  useQualityDuplicates,
} from "@/lib/hooks";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "neutral" }) {
  const cls = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="text-muted text-xs">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function OverviewCard() {
  const { data, error, isLoading } = useQualityOverview();
  if (error) return <ErrorState message="Gagal memuat ringkasan kualitas." />;
  if (isLoading || !data) return <Skeleton className="h-40 w-full" />;

  const stale = data.staleness_hours;
  const staleTone = stale === null ? "neutral" : stale > 30 ? "down" : "up";
  const qTone = data.quarantine_rows > 0 ? "down" : "up";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Stat label="Raw EOD rows" value={fmtNum(data.raw_rows)} />
      <Stat label="Emiten" value={fmtNum(data.raw_codes)} />
      <Stat label="Trading days" value={fmtNum(data.trading_days)} />
      <Stat label="PIT rows" value={fmtNum(data.pit_rows)} />
      <Stat label="Corp actions" value={fmtNum(data.corp_actions)} />
      <Stat label="Quarantine" value={fmtNum(data.quarantine_rows)} tone={qTone} />
      <Stat
        label="Staleness (jam)"
        value={stale === null ? "-" : stale.toFixed(1)}
        tone={staleTone}
      />
      <Stat
        label="Window"
        value={data.first_day && data.last_day ? `${data.first_day} → ${data.last_day}` : "-"}
      />
    </div>
  );
}

function QuarantineCard() {
  const { data: reasons } = useQuarantineReasons();
  const { data: rows, error, isLoading } = useQuarantine(100);
  if (error) return <ErrorState message="Gagal memuat quarantine." />;
  if (isLoading || !rows) return <Skeleton className="h-40 w-full" />;
  if (rows.length === 0)
    return <EmptyState message="Tidak ada baris quarantine — semua EOD lolos quality gate." />;

  return (
    <div className="space-y-3">
      {reasons && reasons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <span key={r.reason} className="badge badge-sell">
              {r.reason}: {r.count}
            </span>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Kode</th>
              <th className="text-left">Tanggal</th>
              <th className="text-left">Alasan</th>
              <th className="text-left">Ingested</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.code}-${r.trade_date}-${i}`}>
                <td className="font-semibold">{r.code ?? "-"}</td>
                <td className="tabular-nums">{r.trade_date ?? "-"}</td>
                <td className="text-down">{r.reason}</td>
                <td className="text-muted tabular-nums">
                  {r.ingested_at ? r.ingested_at.slice(0, 19).replace("T", " ") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoverageCard() {
  const { data, error, isLoading } = useCoverageGaps();
  if (error) return <ErrorState message="Gagal memuat coverage." />;
  if (isLoading || !data) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      <p className="text-muted text-sm">
        {data.covered_days} hari ter-cover
        {data.window ? ` (${data.window.first} → ${data.window.last})` : ""}. Weekday tanpa data di
        bawah — kemungkinan libur bursa atau scrape miss (tidak ada kalender libur untuk memastikan).
      </p>
      {data.missing_weekdays.length === 0 ? (
        <EmptyState message="Tidak ada weekday yang kosong." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {data.missing_weekdays.map((d) => (
            <span key={d} className="badge badge-hold tabular-nums">
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinDaysCard() {
  const { data, error, isLoading } = useThinDays(100, 30);
  if (error) return <ErrorState message="Gagal memuat thin days." />;
  if (isLoading || !data) return <Skeleton className="h-32 w-full" />;
  if (data.length === 0)
    return <EmptyState message="Tidak ada hari dengan emiten < 100 — coverage konsisten." />;

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Tanggal</th>
            <th className="text-right">Jumlah emiten</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.trade_date}>
              <td className="tabular-nums">{d.trade_date}</td>
              <td className="text-right tabular-nums text-down">{d.codes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DuplicatesCard() {
  const { data, error, isLoading } = useQualityDuplicates();
  if (error) return <ErrorState message="Gagal memuat duplicate check." />;
  if (isLoading || !data) return <Skeleton className="h-20 w-full" />;

  const n = data.multi_versioned_bars;
  const tone = n === 0 ? "text-up" : n < 50 ? "" : "text-down";
  return (
    <p className="text-sm leading-relaxed">
      <span className={`font-semibold tabular-nums ${tone}`}>{fmtNum(n)}</span> bar
      harga memiliki lebih dari satu versi (knowledge_date berbeda). Normal bila
      kecil — hasil re-ingest/backfill yang sah; lonjakan mendadak bisa menandakan
      bug re-ingest yang menulis ulang histori.
    </p>
  );
}

function CorpActionsCard() {
  const { data, error, isLoading } = useCorpActionSummary();
  if (error) return <ErrorState message="Gagal memuat corp actions." />;
  if (isLoading || !data) return <Skeleton className="h-32 w-full" />;

  const types = Object.entries(data.by_type);
  const sources = Object.entries(data.by_source);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div className="text-muted mb-2 text-xs font-semibold">Per Jenis</div>
        <div className="flex flex-wrap gap-2">
          {types.map(([k, v]) => (
            <span key={k} className="badge badge-accent">
              {k}: {fmtNum(v)}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-muted mb-2 text-xs font-semibold">Per Sumber</div>
        <div className="flex flex-wrap gap-2">
          {sources.map(([k, v]) => (
            <span key={k} className="badge badge-hold">
              {k}: {fmtNum(v)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function QualityPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Kualitas Data</h1>
        <p className="text-muted mt-1 text-sm">
          Kesehatan layer riset (research.*): coverage, freshness, quarantine, dan corporate
          actions.
        </p>
      </div>

      <Card title="Ringkasan">
        <OverviewCard />
      </Card>

      <Card title="Quarantine" subtitle="Baris EOD yang ditolak quality gate">
        <QuarantineCard />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Coverage Gaps" subtitle="Weekday tanpa data EOD">
          <CoverageCard />
        </Card>
        <Card title="Thin Days" subtitle="Hari dengan < 100 emiten (kemungkinan scrape parsial)">
          <ThinDaysCard />
        </Card>
      </div>

      <Card title="Duplicate Bars" subtitle="Sanity: (code, tanggal) dengan >1 versi knowledge">
        <DuplicatesCard />
      </Card>

      <Card title="Corporate Actions" subtitle="Breakdown per jenis & sumber">
        <CorpActionsCard />
      </Card>
    </div>
  );
}
