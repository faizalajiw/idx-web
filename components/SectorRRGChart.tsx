"use client";

import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import { useSectorRRG } from "@/lib/hooks";
import type { RRGPoint } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";

const QUADRANT_INFO: Record<string, { color: string; hint: string }> = {
  Leading: { color: "var(--up)", hint: "kuat & menguat" },
  Improving: { color: "var(--accent-2)", hint: "mulai menguat" },
  Weakening: { color: "#fbbf24", hint: "mulai melemah" },
  Lagging: { color: "var(--down)", hint: "lemah" },
};

const PAD = 2.5;

function quadrantOf(ratio: number, mom: number): keyof typeof QUADRANT_INFO {
  if (ratio >= 100 && mom >= 100) return "Leading";
  if (ratio < 100 && mom >= 100) return "Improving";
  if (ratio >= 100) return "Weakening";
  return "Lagging";
}

function sectorColor(name: string, palette: string[]): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

const PALETTE = [
  "#6366f1", "#22d3ee", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#f472b6", "#4ade80", "#fb923c", "#38bdf8",
];

interface TooltipEntry {
  payload?: RRGPoint & { sector: string };
}

function RRGTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const q = quadrantOf(p.rs_ratio, p.rs_momentum);
  return (
    <div className="card p-2 text-xs">
      <p className="font-semibold">{p.sector}</p>
      <p className="text-muted">{p.date}</p>
      <p className="tabular-nums">RS-Ratio: {p.rs_ratio.toFixed(2)}</p>
      <p className="tabular-nums">RS-Momentum: {p.rs_momentum.toFixed(2)}</p>
      <p style={{ color: QUADRANT_INFO[q].color }}>{q}</p>
    </div>
  );
}

export function SectorRRGChart() {
  const { data, error, isLoading } = useSectorRRG();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { points, domain } = useMemo(() => {
    const all = (data?.points ?? []).filter((p) => !hidden.has(p.sector));
    const latestBySector = new Map<string, RRGPoint>();
    for (const p of all) latestBySector.set(p.sector, p);
    const latest = [...latestBySector.values()];
    if (latest.length === 0) {
      return { points: all, domain: { x: [98, 102] as [number, number], y: [98, 102] as [number, number] } };
    }
    const pad = (min: number, max: number): [number, number] => [
      Math.min(100, min) - PAD,
      Math.max(100, max) + PAD,
    ];
    return {
      points: all,
      domain: {
        x: pad(Math.min(...latest.map((p) => p.rs_ratio)), Math.max(...latest.map((p) => p.rs_ratio))),
        y: pad(Math.min(...latest.map((p) => p.rs_momentum)), Math.max(...latest.map((p) => p.rs_momentum))),
      },
    };
  }, [data, hidden]);

  // One Scatter per sector so each gets its own color + legend toggle.
  const bySector = useMemo(() => {
    const m = new Map<string, RRGPoint[]>();
    for (const p of points) {
      const arr = m.get(p.sector) ?? [];
      arr.push(p);
      m.set(p.sector, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [points]);

  const sectors = bySector.map(([s]) => s);

  function toggle(s: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <Card
      title="RRG Sektor"
      subtitle="Rotasi sektor mingguan vs IHSG · kanan = outperform, atas = menguat"
      right={data?.date ? <span className="text-muted text-xs">{data.date}</span> : undefined}
    >
      {error ? (
        <ErrorState message={`Gagal memuat RRG: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-[420px]" />
      ) : sectors.length === 0 ? (
        <EmptyState message="Belum cukup data historis untuk menghitung RRG." />
      ) : (
        <div className="space-y-3">
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis
                  type="number"
                  dataKey="rs_ratio"
                  domain={domain.x}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: "RS-Ratio", position: "insideBottomRight", offset: -4, fill: AXIS, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="rs_momentum"
                  domain={domain.y}
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: "RS-Momentum", angle: -90, position: "insideLeft", offset: 12, fill: AXIS, fontSize: 11 }}
                />
                <ZAxis range={[30, 30]} />
                <ReferenceLine x={100} stroke={AXIS} strokeDasharray="4 4" />
                <ReferenceLine y={100} stroke={AXIS} strokeDasharray="4 4" />
                <Tooltip content={<RRGTooltip />} />
                {bySector.map(([sector, pts]) => {
                  const color = sectorColor(sector, PALETTE);
                  return (
                    <Scatter
                      key={sector}
                      name={sector}
                      data={pts}
                      line={{ stroke: color, strokeWidth: 1.2, strokeDasharray: "3 3" }}
                      lineType="joint"
                      fill={color}
                      fillOpacity={0.85}
                    />
                  );
                })}
                {/* Label only the latest point of each visible sector */}
                {bySector.map(([sector, pts]) => {
                  const color = sectorColor(sector, PALETTE);
                  const last = pts[pts.length - 1];
                  return (
                    <Scatter
                      key={`lbl-${sector}`}
                      name={`${sector} label`}
                      data={[last]}
                      fill="transparent"
                      legendType="none"
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey="sector"
                        position="right"
                        style={{ fill: color, fontSize: 10, fontWeight: 600 }}
                      />
                    </Scatter>
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant guide + legend */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(QUADRANT_INFO) as Array<keyof typeof QUADRANT_INFO>).map((q) => (
                <span key={q} className="text-muted text-xs">
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: QUADRANT_INFO[q].color }}
                  />
                  {q} <span className="text-muted">({QUADRANT_INFO[q].hint})</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`badge transition-opacity ${hidden.has(s) ? "badge-hold opacity-40" : "badge-accent"}`}
                style={!hidden.has(s) ? { color: sectorColor(s, PALETTE) } : undefined}
                aria-pressed={!hidden.has(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-muted text-[11px] leading-snug">
            Titik = posisi mingguan; garis putus-putus = jalur rotasi (terbaru di ujung).
            Sektor di kanan garis 100 mengungguli IHSG; di atas garis 100 momentumnya
            menguat. Kuadran bermanfaat: cari kandidat di Leading & Improving.
          </p>
        </div>
      )}
    </Card>
  );
}
