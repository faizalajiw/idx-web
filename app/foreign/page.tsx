"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useForeignFlow } from "@/lib/hooks";
import { fmtCompact, fmtPct, fmtNum } from "@/lib/format";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { RegimeBanner } from "@/components/RegimeBanner";

function shortDate(d: string): string {
  return d.slice(5);
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value?: number | null }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-0.5">{label}</p>
      <p className={`tabular-nums font-semibold ${(v ?? 0) >= 0 ? "text-up" : "text-down"}`}>
        Net {fmtCompact(v)}
      </p>
    </div>
  );
}

export default function ForeignFlowPage() {
  const { data, error, isLoading } = useForeignFlow(20);

  const chartData = (data?.days ?? []).map((d) => ({
    date: shortDate(d.date),
    net: d.net !== null ? d.net / 1e9 : null, // tampilkan dalam miliar
  }));
  const net = data?.total_net ?? 0;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Foreign <span className="gradient-text">Flow</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Arus dana asing di pasar reguler (notional = lembar × harga close)
        </p>
      </div>

      <RegimeBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-hover p-5">
          <p className="text-muted text-xs font-semibold tracking-widest uppercase">
            Net Asing · {data?.date ?? "-"}
          </p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${net >= 0 ? "text-up" : "text-down"}`}>
            {net >= 0 ? "+" : "-"}Rp {fmtCompact(Math.abs(net) || null)}
          </p>
          <p className="text-muted mt-1 text-xs">
            Buy Rp {fmtCompact(data?.total_buy)} · Sell Rp {fmtCompact(data?.total_sell)}
          </p>
        </div>
        <div className="card p-5 lg:col-span-2">
          <p className="text-muted mb-2 text-xs font-semibold tracking-widest uppercase">
            Harian (miliar Rp)
          </p>
          {error ? (
            <ErrorState message={`Gagal memuat: ${error.message}`} />
          ) : isLoading ? (
            <Skeleton className="h-44" />
          ) : chartData.length === 0 ? (
            <EmptyState message="Belum ada data foreign flow." />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#8f97ab" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8f97ab" fontSize={10} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" />
                <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={(d.net ?? 0) >= 0 ? "#34d399" : "#f87171"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="🟢 Top Net Buy" subtitle="Akumulasi asing terbesar">
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.top_net_in.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {data.top_net_in.map((m, i) => (
                <li key={m.code} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted w-5 text-xs tabular-nums">{i + 1}.</span>
                    <span className="font-semibold">{m.code}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted tabular-nums">{fmtPct(m.percent)}</span>
                    <span className="text-up w-20 text-right font-semibold tabular-nums">
                      {fmtCompact(m.net)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="🔴 Top Net Sell" subtitle="Distribusi asing terbesar">
          {isLoading || !data ? (
            <Skeleton className="h-64" />
          ) : data.top_net_out.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {data.top_net_out.map((m, i) => (
                <li key={m.code} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted w-5 text-xs tabular-nums">{i + 1}.</span>
                    <span className="font-semibold">{m.code}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted tabular-nums">{fmtPct(m.percent)}</span>
                    <span className="text-down w-20 text-right font-semibold tabular-nums">
                      {fmtCompact(m.net)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-muted text-xs leading-relaxed">
        Catatan: IDX mempublikasikan volume asing dalam lembar saham; nilai rupiah
        di atas adalah estimasi notional (lembar × close). Data diperbarui tiap hari bursa (EOD).
      </p>
    </main>
  );
}
