"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockBrokerActivity } from "@/lib/hooks";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";
const SCORE_LINE = "#2962ff";
const MEDIAN_LINE = "rgba(148,163,184,0.55)";

/** Pilihan zoom sesi bursa. */
const ZOOMS = [5, 20, 60, 120] as const;
type Zoom = (typeof ZOOMS)[number];

interface TimelinePoint {
  date: string;
  score: number;
  median: number | null;
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | null;
}

function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload.find((p) => p.name === "Skor")?.value;
  const median = payload.find((p) => p.name === "Median pasar")?.value;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      <p className="tabular-nums" style={{ color: SCORE_LINE }}>
        Skor: {score === null || score === undefined ? "-" : score.toFixed(1)}
      </p>
      {median !== null && median !== undefined && (
        <p className="text-muted tabular-nums">Median pasar: {median.toFixed(1)}</p>
      )}
    </div>
  );
}

/**
 * Warna fase satu sesi: skala kontinu dari baseline 50 — makin jauh di atas
 * median makin hijau, makin jauh di bawah makin merah. Ini "gradien" fase
 * akumulasi/distribusi yang dibaca sekilas, bukan klasifikasi biner.
 */
function phaseColor(score: number, median: number | null): string {
  const ref = median ?? 50;
  const delta = score - ref;
  const intensity = Math.min(Math.abs(delta) / 25, 1); // 25 poin = penuh
  const alpha = 0.25 + 0.6 * intensity;
  return delta >= 0 ? `rgba(34,197,94,${alpha.toFixed(2)})` : `rgba(239,68,68,${alpha.toFixed(2)})`;
}

/** Strip panas di bawah chart: satu blok per sesi, warna = fase + intensitas. */
function PhaseStrip({ view }: { view: TimelinePoint[] }) {
  if (view.length < 2) return null;
  return (
    <div className="mt-1">
      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
        {view.map((p) => (
          <div
            key={p.date}
            className="h-full flex-1"
            style={{ backgroundColor: phaseColor(p.score, p.median) }}
            title={`${p.date} · skor ${p.score.toFixed(0)} (median ${p.median?.toFixed(0) ?? "-"})`}
          />
        ))}
      </div>
      <div className="text-muted mt-1 flex items-center justify-between text-[10px]">
        <span>distribusi</span>
        <span>
          fase per sesi — makin pekat makin jauh dari median pasar
        </span>
        <span>akumulasi</span>
      </div>
    </div>
  );
}

/** Kartu timeline aliran dana harian satu emiten (skor + median pasar + zoom). */
export function FlowTimelineCard({
  code,
  lookback = 120,
  title = "Timeline Aliran Dana",
  className = "",
}: {
  code: string;
  lookback?: number;
  title?: string;
  className?: string;
}) {
  const { data, error, isLoading } = useStockBrokerActivity(code, lookback);
  const [zoom, setZoom] = useState<Zoom>(20);

  const points = useMemo<TimelinePoint[]>(
    () =>
      (data?.history ?? []).map((h) => ({
        date: h.date,
        score: h.score,
        median: h.market_median ?? null,
      })),
    [data?.history],
  );
  const view = points.slice(-zoom);

  return (
    <Card
      className={className}
      title={title}
      subtitle={
        data?.as_of
          ? `Skor akumulasi harian — s/d sesi ${data.as_of}`
          : "Skor akumulasi harian"
      }
      info="Bagaimana skor aktivitas broker emiten ini bergerak hari ke hari. Skor bersifat relatif (50 = median pasar hari itu): di atas garis abu-abu = fase akumulasi relatif, di bawah = distribusi relatif. Strip warna di bawah chart merangkum fasenya per sesi."
      right={
        <div className="flex items-center gap-1">
          {ZOOMS.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                zoom === z ? "bg-[var(--accent)] text-white" : "text-muted hover:bg-white/[0.06]"
              }`}
            >
              {z}h
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat timeline: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-44 w-full" />
      ) : view.length < 2 ? (
        <EmptyState message="Belum ada riwayat skor yang cukup untuk timeline (butuh ≥ 2 sesi berskor; faktor aliran juga harus tervalidasi IC)." />
      ) : (
        <div>
          <p className="text-muted mb-1 text-[11px]">
            <span style={{ color: "var(--up)" }}>Hijau</span> = di atas median pasar
            (akumulasi relatif) · <span style={{ color: "var(--down)" }}>merah</span> = di
            bawah (distribusi relatif)
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={view} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="flowTimelineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SCORE_LINE} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={SCORE_LINE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<TimelineTooltip />} />
              <ReferenceLine y={50} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="score"
                name="Skor"
                stroke={SCORE_LINE}
                strokeWidth={2}
                fill="url(#flowTimelineFill)"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="median"
                name="Median pasar"
                stroke={MEDIAN_LINE}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <PhaseStrip view={view} />
        </div>
      )}
    </Card>
  );
}
