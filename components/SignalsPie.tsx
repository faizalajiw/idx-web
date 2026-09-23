"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useSignals } from "@/lib/hooks";
import type { Signal } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const COLORS: Record<string, string> = {
  BUY: "#16c784",
  SELL: "#ea3943",
  HOLD: "#8b93a7",
};

function summarize(signals: Signal[]): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  for (const s of signals) counts[s.signal] = (counts[s.signal] ?? 0) + 1;
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function SignalsPie() {
  const { data, error, isLoading } = useSignals();

  return (
    <Card title="Distribusi Sinyal" subtitle="Seluruh watchlist (rule-based)">
      {error ? (
        <ErrorState message={`Gagal memuat sinyal: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-56" />
      ) : data.length === 0 ? (
        <EmptyState message="Belum ada sinyal — seed data historis dulu." />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={summarize(data)}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              strokeWidth={0}
            >
              {summarize(data).map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] ?? "#6366f1"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--fg)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(label: string, entry: { payload?: { value?: number } }) =>
                `${label} · ${entry?.payload?.value ?? 0}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
