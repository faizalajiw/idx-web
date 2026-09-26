"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/types";
import { fmtCompact } from "@/lib/format";

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";
const STRATEGY = "#22d3ee";
const BENCHMARK = "#8f97ab";

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | null;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: Rp {fmtCompact(p.value)}
        </p>
      ))}
    </div>
  );
}

/** Strategy equity curve vs the equal-weighted buy & hold benchmark. */
export function EquityCurveChart({
  points,
  initialCash,
}: {
  points: EquityPoint[];
  initialCash: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          stroke={AXIS}
          fontSize={11}
          minTickGap={28}
        />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          width={66}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => fmtCompact(v)}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine
          y={initialCash}
          stroke="rgba(148,163,184,0.35)"
          strokeDasharray="4 4"
          label={{ value: "modal awal", position: "insideTopLeft", fill: AXIS, fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="equity"
          name="Strategi"
          stroke={STRATEGY}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="benchmark"
          name="Buy & Hold"
          stroke={BENCHMARK}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
