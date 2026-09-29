"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockBrokerActivity } from "@/lib/hooks";
import type {
  BrokerActivityDriver,
  BrokerActivitySector,
  StockBrokerActivity,
} from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";
const SCORE_LINE = "#2962ff";

/** Berapa sesi riwayat driver yang ditampilkan di daftar (bukan di chart). */
const DRIVER_ROWS = 10;

function scoreTone(score: number): string {
  if (score >= 60) return "var(--up)";
  if (score <= 40) return "var(--down)";
  return "var(--accent)";
}

const p0 = (v: number) => `${(v * 100).toFixed(0)}%`;

/** Chip driver: tanda menunjukkan arah dorongan ke skor (bukan arah harga). */
function DriverChips({ drivers }: { drivers: BrokerActivityDriver[] }) {
  if (drivers.length === 0) return <span className="text-muted text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {drivers.map((d) => (
        <span key={d.factor} className="badge badge-hold gap-1 whitespace-nowrap">
          <span className={d.contribution >= 0 ? "text-up" : "text-down"}>
            {d.contribution >= 0 ? "▲" : "▼"}
          </span>
          {d.label}
          {d.percentile !== null && (
            <span className="text-muted tabular-nums">{p0(d.percentile)}</span>
          )}
        </span>
      ))}
    </div>
  );
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | null;
}

function ScoreTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="tabular-nums" style={{ color: payload[0]?.color }}>
        Skor: {score === null || score === undefined ? "-" : score.toFixed(1)}
      </p>
    </div>
  );
}

function CurrentScore({ data }: { data: StockBrokerActivity }) {
  const cur = data.current;
  if (!cur)
    return (
      <p className="text-muted text-xs">
        Tidak ada skor untuk sesi terakhir — coverage faktor emiten ini di bawah
        ambang hari ini.
      </p>
    );

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">Skor akumulasi</span>
        <span className="font-semibold tabular-nums" style={{ color: scoreTone(cur.score) }}>
          {cur.score.toFixed(0)}/100
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, cur.score))}%`, background: scoreTone(cur.score) }}
        />
      </div>
      <p className="text-muted mt-1 text-[11px] tabular-nums">
        Peringkat {cur.rank} dari {cur.universe} emiten · persentil pasar{" "}
        {p0(cur.percentile)} · coverage faktor {p0(cur.coverage)}
      </p>
      <div className="mt-2">
        <DriverChips drivers={cur.drivers} />
      </div>
    </div>
  );
}

function ScoreHistory({ data }: { data: StockBrokerActivity }) {
  const points = data.history.map((h) => ({ date: h.date, score: h.score }));
  // Satu titik tidak membentuk garis; biarkan CurrentScore yang bicara.
  if (points.length < 2) return null;

  return (
    <div>
      <p className="text-muted mb-1 text-[11px]">
        Riwayat skor — tiap titik diukur terhadap pasar hari itu (garis putus-putus
        = median pasar)
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            stroke={AXIS}
            fontSize={10}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            stroke={AXIS}
            fontSize={10}
            width={28}
          />
          <Tooltip content={<ScoreTooltip />} />
          <ReferenceLine y={50} stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            name="Skor"
            stroke={SCORE_LINE}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorComparison({ sector }: { sector: BrokerActivitySector }) {
  if (!sector.comparable)
    return (
      <p className="text-muted text-[11px] leading-snug">
        Emiten ini belum dipetakan ke sektor spesifik (masuk bucket
        &ldquo;{sector.name}&rdquo;), jadi skornya tidak dibandingkan dengan emiten
        lain: bucket itu menampung emiten dari berbagai sektor, sehingga
        perbandingannya tidak berarti.
      </p>
    );

  const self = sector.peers.find((p) => p.is_self);
  const vsMedian =
    self && sector.median_score !== null
      ? self.score > sector.median_score
        ? " — di atas median sektor"
        : self.score < sector.median_score
          ? " — di bawah median sektor"
          : " — tepat di median sektor"
      : "";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted">
          Sektor <span className="font-medium text-[var(--fg)]">{sector.name}</span>
        </span>
        {sector.my_rank !== null && (
          <span className="text-muted tabular-nums">
            peringkat {sector.my_rank} dari {sector.peer_count}
          </span>
        )}
      </div>

      {self && sector.median_score !== null && (
        <p className="text-muted mt-0.5 text-[11px] tabular-nums">
          Skor {self.score.toFixed(0)} vs median sektor{" "}
          {sector.median_score.toFixed(0)}
          {vsMedian}
        </p>
      )}

      <ul className="mt-2 space-y-0.5">
        {sector.peers.map((p, i) => (
          <li
            key={p.code}
            className={`flex items-center gap-2 rounded px-1.5 py-1 text-[11px] ${
              p.is_self ? "bg-white/[0.06] ring-1 ring-[var(--accent)]" : ""
            }`}
            title={p.name ?? p.code}
          >
            {/* Daftar sudah urut skor turun -> indeks + 1 = peringkat sektor. */}
            <span className="text-muted w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
            <span className="w-14 shrink-0 truncate font-semibold">{p.code}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, p.score))}%`,
                  background: scoreTone(p.score),
                }}
              />
            </div>
            <span
              className="w-7 shrink-0 text-right font-semibold tabular-nums"
              style={{ color: scoreTone(p.score) }}
            >
              {p.score.toFixed(0)}
            </span>
          </li>
        ))}
      </ul>

      {!self && sector.my_rank !== null && (
        <p className="text-muted mt-1.5 text-[11px]">
          Emiten ini (peringkat {sector.my_rank}) di luar {sector.peers.length} besar
          daftar yang ditampilkan.
        </p>
      )}

      <p className="text-muted mt-1.5 text-[11px] leading-snug">
        Hanya emiten sektor ini yang <em>sudah</em> punya skor yang ikut dibandingkan —
        yang belum punya skor tidak dihitung sebagai nol.
      </p>
    </div>
  );
}

function DriverHistory({ data }: { data: StockBrokerActivity }) {
  const recent = [...data.history].reverse().slice(0, DRIVER_ROWS);
  if (recent.length === 0) return null;

  return (
    <div>
      <p className="text-muted mb-1.5 text-[11px]">Driver terakhir ({recent.length} sesi)</p>
      <ul className="space-y-1.5">
        {recent.map((h) => (
          <li key={h.date} className="border-b border-[var(--border)] pb-1.5">
            <div className="flex items-center justify-between text-[11px] tabular-nums">
              <span className="text-muted">{h.date}</span>
              <span className="font-semibold" style={{ color: scoreTone(h.score) }}>
                {h.score.toFixed(0)}
              </span>
            </div>
            <div className="mt-1">
              <DriverChips drivers={h.drivers} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Body({ data }: { data: StockBrokerActivity }) {
  if (!data.validated)
    return (
      <div className="space-y-2">
        <p className="text-muted text-sm">
          {data.reason ?? "Skor aktivitas broker belum tervalidasi."}
        </p>
        <p className="text-muted text-[11px] leading-snug">
          Skor hanya dihitung dari faktor aliran yang sudah lolos uji statistik
          (IC), jadi selama belum ada yang lolos bagian ini sengaja dikosongkan
          alih-alih menampilkan angka tanpa dasar.
        </p>
      </div>
    );

  if (!data.current && data.history.length === 0)
    return (
      <EmptyState message="Belum ada skor untuk emiten ini — data aliran belum cukup (butuh ≥ 21 hari)." />
    );

  return (
    <div className="space-y-4">
      <CurrentScore data={data} />
      {data.sector && <SectorComparison sector={data.sector} />}
      <ScoreHistory data={data} />
      <DriverHistory data={data} />
    </div>
  );
}

/**
 * Skor aktivitas broker satu emiten + riwayat driver-nya.
 *
 * Skor terkini identik dengan angka di halaman Aktivitas Broker; riwayatnya
 * dihitung per tanggal terhadap pasar hari itu, jadi pergerakan garisnya benar
 * (bukan pergeseran percentile pasar hari ini).
 */
export function BrokerActivityCard({ code }: { code: string }) {
  const { data, error, isLoading } = useStockBrokerActivity(code);

  return (
    <Card
      title="Aktivitas Broker"
      subtitle="Skor proksi aliran terkuat + riwayat driver-nya"
      info="Skor 0-100 dari aliran asing bernotasi + ketimpangan buku intraday, dibobot oleh uji IC. 50 = median pasar. Skor dipakai ulang oleh Screener dan Hold Check, jadi angkanya konsisten antar halaman. Pembanding sektor memakai emiten sektor yang sama yang sudah punya skor."
      right={<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />}
    >
      {error ? (
        <ErrorState message={`Gagal memuat aktivitas broker: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Body data={data} />
      )}
    </Card>
  );
}
