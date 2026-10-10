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

const AXIS = "var(--chart-axis)";
const GRID = "var(--chart-grid)";
const STRATEGY = "var(--chart-strategy)";
const BENCHMARK = "var(--chart-benchmark)";

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
          stroke="var(--chart-ref)"
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
