"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTechnical } from "@/lib/hooks";
import { fmtNum } from "@/lib/format";
import type { IndicatorBar } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

function badgeClass(sig: string): string {
  if (sig === "BUY") return "badge badge-buy";
  if (sig === "SELL") return "badge badge-sell";
  return "badge badge-hold";
}

const AXIS = "#8b93a7";
const GRID = "rgba(255,255,255,0.06)";

function shortDate(d: string): string {
  return d.slice(5); // MM-DD
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | null;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {p.value !== null && p.value !== undefined ? fmtNum(p.value, 2) : "-"}
        </p>
      ))}
    </div>
  );
}

export function TechnicalChart({ code }: { code: string | null }) {
  const { data, error, isLoading } = useTechnical(code);

  if (!code) {
    return (
      <Card title="Technical Chart">
        <EmptyState message="Pilih emiten dari watchlist atau signals untuk melihat chart." />
      </Card>
    );
  }

  const bars: IndicatorBar[] = data?.bars ?? [];

  return (
    <Card
      title={`Technical — ${code}`}
      subtitle="Close, MA20/50, Bollinger, RSI, MACD"
      right={data ? <span className={badgeClass(data.signal)}>{data.signal}</span> : undefined}
    >
      {error ? (
        <ErrorState message={`Gagal memuat chart: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-[420px]" />
      ) : bars.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {/* Price + MA + Bollinger */}
          <div>
            <p className="text-muted mb-1 text-xs">Harga & Moving Average</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={bars} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} fontSize={11} minTickGap={24} />
                <YAxis stroke={AXIS} fontSize={11} domain={["auto", "auto"]} width={52} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="bb_upper"
                  name="BB Upper"
                  stroke="rgba(99,102,241,0.35)"
                  fill="rgba(99,102,241,0.06)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="bb_lower"
                  name="BB Lower"
                  stroke="rgba(99,102,241,0.35)"
                  fill="rgba(99,102,241,0.06)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                />
                <Line type="monotone" dataKey="close" name="Close" stroke="#e6e9ef" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ma_short" name="MA20" stroke="#16c784" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="ma_long" name="MA50" stroke="#f5a623" strokeWidth={1.5} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* RSI */}
          <div>
            <p className="text-muted mb-1 text-xs">RSI (14)</p>
            <ResponsiveContainer width="100%" height={110}>
              <ComposedChart data={bars} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} fontSize={11} minTickGap={24} />
                <YAxis stroke={AXIS} fontSize={11} domain={[0, 100]} ticks={[30, 50, 70]} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="rsi" name="RSI" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* MACD */}
          <div>
            <p className="text-muted mb-1 text-xs">MACD (12,26,9)</p>
            <ResponsiveContainer width="100%" height={110}>
              <ComposedChart data={bars} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke={AXIS} fontSize={11} minTickGap={24} />
                <YAxis stroke={AXIS} fontSize={11} width={52} tickFormatter={(v) => fmtNum(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="macd" name="MACD" stroke="#16c784" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="macd_signal" name="Signal" stroke="#ea3943" strokeWidth={1.5} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
