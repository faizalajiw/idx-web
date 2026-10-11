"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockForeignFlow } from "@/lib/hooks";
import { fmtCompact, fmtDateStr } from "@/lib/format";
import type { StockForeignFlowPeer } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";
import { InfoHint } from "./InfoHint";
import { TickerLogo } from "./TickerLogo";

const UP = "var(--chart-up)"; // asing net beli
const DOWN = "var(--chart-down)"; // asing net jual
const FLIP = "var(--chart-flip)"; // hari asing balik arah

/** Kartu kecil berisi satu fakta dengan label bahasa awam. */
function Fact({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-muted text-[11px]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/** Legenda warna yang selalu tampil di atas chart. */
function Legend() {
  const item = (color: string, text: string) => (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {text}
    </span>
  );
  return (
    <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
      {item(UP, "Asing net beli")}
      {item(DOWN, "Asing net jual")}
      {item(FLIP, "Hari asing balik arah")}
    </div>
  );
}

/** Net harian per sesi dalam miliar rupiah. */
function FlowChart({
  flow,
  height = 170,
}: {
  flow: { date: string; net: number | null; flip: boolean | null }[];
  height?: number;
}) {
  const points = flow
    .filter((p) => p.net !== null)
    .map((p) => ({
      label: fmtDateStr(p.date)?.slice(0, 6) ?? p.date,
      date: p.date,
      net: p.net! / 1e9,
      flip: p.flip === true,
      raw: p.net!,
    }));
  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) => `${v} M`}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ fill: "var(--chart-cursor)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof points)[number];
            return (
              <div className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  {fmtDateStr(d.date) ?? d.date}
                  {d.flip && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      BALIK ARAH
                    </span>
                  )}
                </p>
                <p className="tabular-nums">
                  {d.raw > 0 ? "Asing net beli" : "Asing net jual"}{" "}
                  <span className={d.raw > 0 ? "text-up" : "text-down"}>Rp {fmtCompact(Math.abs(d.raw))}</span>
                </p>
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke="var(--chart-ref)" />
        <Bar dataKey="net" maxBarSize={22} radius={[3, 3, 0, 0]}>
          {points.map((p, i) => (
            <Cell key={i} fill={p.flip ? FLIP : p.raw > 0 ? UP : DOWN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Pembanding sektor: batang dari garis tengah, hijau ke kanan = net beli. */
function PeerList({
  peers,
  comparable,
}: {
  peers: StockForeignFlowPeer[];
  comparable: boolean;
}) {
  const maxAbs = Math.max(...peers.map((p) => Math.abs(p.net_sum)), 1);
  const days = peers[0]?.n_days ?? 10;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-sm font-semibold">
        Dibandingkan saham sejenis
        <InfoHint text={`Total net asing tiap emiten se-sektor selama ${days} sesi bursa terakhir. Hijau = asing lebih banyak membeli, merah = lebih banyak menjual. Saham yang sedang kamu lihat ditandai ←.`} />
      </p>
      <ul className="space-y-2">
        {peers.map((p) => (
          <li key={p.code} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${p.is_self ? "bg-[var(--accent)]/10" : ""}`}>
            <span className="flex w-20 shrink-0 items-center gap-1.5">
              <TickerLogo code={p.code} size={16} />
              <span className={`font-semibold ${p.is_self ? "text-up" : ""}`}>
                {p.code}
                {p.is_self ? " ←" : ""}
              </span>
            </span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="absolute top-0 h-full rounded-full"
                style={{
                  width: `${(Math.abs(p.net_sum) / maxAbs) * 50}%`,
                  left: p.net_sum >= 0 ? "50%" : undefined,
                  right: p.net_sum < 0 ? "50%" : undefined,
                  backgroundColor: p.net_sum >= 0 ? UP : DOWN,
                }}
              />
              <span className="absolute left-1/2 top-0 h-full w-px bg-white/25" />
            </span>
            <span className={`w-20 shrink-0 text-right tabular-nums ${p.net_sum >= 0 ? "text-up" : "text-down"}`}>
              {p.net_sum >= 0 ? "+" : "-"}Rp {fmtCompact(Math.abs(p.net_sum))}
            </span>
          </li>
        ))}
      </ul>
      {!comparable && (
        <p className="text-muted mt-2 text-[11px] leading-snug">
          Sektor saham ini belum terpetakan, jadi pembanding hanya gambaran kasar.
        </p>
      )}
    </div>
  );
}

/**
 * Arus asing per emiten dalam bahasa awam: ringkasan arah hari ini, grafik
 * net harian, dan pembanding sektor. `compact` menyembunyikan pembanding.
 */
export function ForeignFlowCard({
  code,
  compact = false,
  className = "",
}: {
  code: string;
  compact?: boolean;
  className?: string;
}) {
  const { data, error, isLoading } = useStockForeignFlow(code, 30, 10);
  const fs = data?.flip_summary;
  // Net sesi terakhir yang BERNILAI (hari tanpa data dilewati, bukan 0).
  const lastNet = useMemo(() => {
    for (let i = (data?.flow.length ?? 0) - 1; i >= 0; i--) {
      const net = data?.flow[i]?.net;
      if (net !== null && net !== undefined) return net;
    }
    return null;
  }, [data?.flow]);

  const side = fs?.current_side;
  const isBuy = side === "net_buy";
  const isSell = side === "net_sell";
  const headline = isBuy
    ? "Asing sedang net beli"
    : isSell
      ? "Asing sedang net jual"
      : "Asing belum punya arah jelas";
  const tone = isBuy ? "text-up" : isSell ? "text-down" : "";

  return (
    <section className={`card min-w-0 p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Arus Asing</h2>
          <p className="text-muted mt-0.5 text-sm">
            Apakah investor asing sedang membeli atau menjual saham ini
            {data?.sector ? ` · ${data.sector}` : ""}.
          </p>
        </div>
        <LastUpdated sessionDate={data?.date} updatedAt={null} dep={data} />
      </header>

      {error ? (
        <ErrorState message={`Gagal memuat arus asing: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-52 w-full" />
      ) : data.flow.length === 0 || data.flow.every((p) => p.net === null) ? (
        <EmptyState message="Belum ada data aliran asing untuk emiten ini (data EOD diisi lewat `idx serve` atau backfill)." />
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl bg-[var(--bg-elev)] p-4">
            <p className={`text-lg font-bold ${tone}`}>{headline}</p>
            <p className="text-muted mt-1 text-sm tabular-nums">
              {lastNet !== null ? (
                <>
                  Sesi terakhir{" "}
                  <span className={lastNet >= 0 ? "text-up font-semibold" : "text-down font-semibold"}>
                    {lastNet >= 0 ? "+" : "-"}Rp {fmtCompact(Math.abs(lastNet))}
                  </span>
                  {fs?.current_streak ? ` · sudah ${fs.current_streak} sesi berturut-turut` : ""}
                </>
              ) : (
                "Belum ada nilai sesi terakhir."
              )}
            </p>
          </div>

          <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
            <Fact
              label="Terakhir berbalik arah"
              value={
                fs?.last_flip
                  ? fs.last_flip.to === "net_buy"
                    ? "Dari jual ke beli"
                    : "Dari beli ke jual"
                  : "Belum pernah"
              }
              tone={fs?.last_flip?.to === "net_buy" ? "text-up" : fs?.last_flip?.to === "net_sell" ? "text-down" : ""}
            />
            <Fact
              label="Sudah berjalan sejak balik arah"
              value={
                fs?.days_since_flip !== null && fs?.days_since_flip !== undefined
                  ? fs.days_since_flip === 0
                    ? "Hari ini"
                    : `${fs.days_since_flip} sesi`
                  : "-"
              }
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-sm font-semibold">
                Net asing harian
                <InfoHint text="Batang ke atas = asing net beli, ke bawah = asing net jual, dalam miliar rupiah. Amber = hari asing berbalik arah." />
              </p>
              <Legend />
            </div>
            <FlowChart flow={data.flow} />
          </div>

          {!compact && data.peers.length > 1 && (
            <PeerList peers={data.peers} comparable={data.comparable} />
          )}

          {!compact && data.peer_rank.count > 1 && (
            <p className="text-muted text-xs leading-relaxed">
              Saham ini ada di urutan <strong className="text-[var(--fg)]">#{data.peer_rank.rank}</strong> dari{" "}
              {data.peer_rank.count} saham sejenis.
            </p>
          )}
        </div>
      )}
    </section>
  );
}