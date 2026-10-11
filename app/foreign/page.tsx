"use client";

import { useState } from "react";
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
import { fmtCompact, fmtPct } from "@/lib/format";
import { InfoHint } from "@/components/InfoHint";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { RegimeBanner } from "@/components/RegimeBanner";
import { TickerLogo } from "@/components/TickerLogo";
import { LastUpdated } from "@/components/LastUpdated";
import { TrendingUp, TrendingDown, Globe2 } from "lucide-react";

type Side = "in" | "out";
type Mover = { code: string; name: string | null; net: number | null; percent: number | null };

function shortDate(d: string): string {
  return d.slice(5);
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value?: number | null }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="card p-2 text-xs">
      <p className="text-muted mb-0.5">{label}</p>
      <p className={`tabular-nums font-semibold ${v >= 0 ? "text-up" : "text-down"}`}>
        {v >= 0 ? "Asing masuk" : "Asing keluar"} Rp {Math.abs(v).toFixed(1)} miliar
      </p>
    </div>
  );
}

function MoverList({ items, side, max }: { items: Mover[]; side: Side; max: number }) {
  const tone = side === "in" ? "text-up" : "text-down";
  const bar = side === "in" ? "bg-up" : "bg-down";
  return (
    <>
      <div className="text-muted flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 text-xs">
        <span className="pl-[52px]">Saham</span>
        <span className="flex gap-6">
          <span>Net nilai (Rp)</span>
          <span className="w-14 text-right">Harga %</span>
        </span>
      </div>
    <ul className="divide-y divide-[var(--border)]">
      {items.map((m, i) => {
        const absNet = Math.abs(m.net ?? 0);
        const width = max > 0 ? Math.max(4, (absNet / max) * 100) : 0;
        return (
          <li key={m.code} className="flex items-center gap-3 py-3">
            <span className="text-muted w-5 text-xs tabular-nums">{i + 1}</span>
            <TickerLogo code={m.code} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{m.code}</span>
                <span className={`font-semibold tabular-nums ${tone}`}>{fmtCompact(m.net)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
                </div>
                <span className="text-muted w-14 text-right text-xs tabular-nums">
                  {fmtPct(m.percent)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}

export default function ForeignFlowPage() {
  const { data, error, isLoading } = useForeignFlow(20);
  const [side, setSide] = useState<Side>("in");

  const chartData = (data?.days ?? []).map((d) => ({
    date: shortDate(d.date),
    net: d.net !== null ? d.net / 1e9 : null,
  }));
  const net = data?.total_net ?? 0;
  const buy = data?.total_buy ?? 0;
  const sell = data?.total_sell ?? 0;
  const buyShare = buy + sell > 0 ? (buy / (buy + sell)) * 100 : 50;
  const movers = side === "in" ? data?.top_net_in ?? [] : data?.top_net_out ?? [];
  const maxMover = Math.max(0, ...movers.map((m) => Math.abs(m.net ?? 0)));
  const isNetIn = net >= 0;

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Globe2 size={26} className="text-accent" aria-hidden />
          Foreign <span className="gradient-text">Flow</span>
        </h1>
        <p className="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
          Pantau ke mana investor asing mengalirkan dana di pasar reguler.
          <LastUpdated sessionDate={data?.date} />
        </p>
      </div>

      <RegimeBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card card-hover p-5">
          <div className="flex items-center justify-between">
            <p className="text-muted flex items-center gap-1 text-xs font-semibold tracking-widest uppercase">
              Posisi asing · {data?.date ?? "-"}
              <InfoHint text="Selisih total beli dikurangi total jual oleh investor asing. Hijau = asing net masuk, merah = asing net keluar." />
            </p>
            {data && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isNetIn ? "badge-buy" : "badge-sell"
                }`}
              >
                {isNetIn ? "Net masuk" : "Net keluar"}
              </span>
            )}
          </div>
          {isLoading || !data ? (
            <Skeleton className="mt-3 h-24" />
          ) : (
            <>
              <p className={`mt-3 text-3xl font-bold tabular-nums ${isNetIn ? "text-up" : "text-down"}`}>
                {isNetIn ? "+" : "-"}Rp {fmtCompact(Math.abs(net) || null)}
              </p>
              <div className="mt-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div className="bg-up h-full" style={{ width: `${buyShare}%` }} />
                  <div className="bg-down h-full" style={{ width: `${100 - buyShare}%` }} />
                </div>
                <div className="text-muted mt-2 flex justify-between text-xs tabular-nums">
                  <span>Beli Rp {fmtCompact(buy)}</span>
                  <span>Jual Rp {fmtCompact(sell)}</span>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-semibold tracking-widest uppercase">
              Tren harian
            </p>
            <div className="text-muted flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-up" />Masuk</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-down" />Keluar</span>
            </div>
          </div>
          <div className="mt-3">
            {error ? (
              <ErrorState message={`Gagal memuat: ${error.message}`} />
            ) : isLoading ? (
              <Skeleton className="h-48" />
            ) : chartData.length === 0 ? (
              <EmptyState message="Belum ada data foreign flow." />
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--chart-axis)" fontSize={10} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-cursor)" }} />
                  <ReferenceLine y={0} stroke="var(--chart-ref-soft)" />
                  <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={26}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={(d.net ?? 0) >= 0 ? "var(--chart-net-up)" : "var(--chart-net-down)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Saham paling banyak disentuh asing</h2>
            <p className="text-muted text-sm">Akumulasi (beli) atau distribusi (jual) terbesar hari ini.</p>
          </div>
          <div
            role="tablist"
            aria-label="Arah arus asing"
            className="flex gap-1 border-b border-[var(--border)]"
          >
            {(["in", "out"] as const).map((s) => {
              const Icon = s === "in" ? TrendingUp : TrendingDown;
              const active = side === s;
              return (
                <button
                  key={s}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSide(s)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    active
                      ? "border-[var(--accent)] text-[var(--fg)]"
                      : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                  }`}
                >
                  <Icon size={15} aria-hidden className={active ? (s === "in" ? "text-up" : "text-down") : "opacity-70"} />
                  {s === "in" ? "Net beli" : "Net jual"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2">
          {isLoading || !data ? (
            <Skeleton className="mt-4 h-64" />
          ) : error ? null : movers.length === 0 ? (
            <EmptyState />
          ) : (
            <MoverList items={movers} side={side} max={maxMover} />
          )}
        </div>
      </section>

      <p className="text-muted text-xs leading-relaxed">
        Catatan: IDX mempublikasikan volume asing dalam lembar saham; nilai rupiah di atas
        adalah estimasi notional (lembar × close). Data diperbarui tiap hari bursa (EOD).
        Net beli besar bukan jaminan harga naik.
      </p>
    </main>
  );
}
