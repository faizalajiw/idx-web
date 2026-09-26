"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DividendYear } from "@/lib/types";

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";
const EVENTS = "#26a69a";
const CODES = "#a78bfa";

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
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Dividend activity per calendar year. We chart *counts*, not cash: the feed
 * stores dividend per share, so a money total across emiten would be nonsense.
 */
export function DividendYearChart({ years }: { years: DividendYear[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={years} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" stroke={AXIS} fontSize={11} minTickGap={12} />
        <YAxis
          yAxisId="left"
          stroke={AXIS}
          fontSize={11}
          width={42}
          allowDecimals={false}
          tickFormatter={(v: number) => `${v}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={AXIS}
          fontSize={11}
          width={42}
          allowDecimals={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          yAxisId="left"
          dataKey="events"
          name="Pembayaran"
          fill={EVENTS}
          fillOpacity={0.55}
          radius={[3, 3, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="codes"
          name="Emiten"
          stroke={CODES}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
