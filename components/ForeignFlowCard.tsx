"use client";

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

const UP = "#22c55e"; // net buy (akumulasi asing)
const DOWN = "#ef4444"; // net sell (distribusi asing)
const FLIP = "#f59e0b"; // hari pergantian arah

/** Satu ringkasan angka di strip atas kartu. */
function Stat({
  label,
  value,
  hint,
  tone = "",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-2.5">
      <p className="text-muted flex items-center gap-1 text-[11px]">
        {label}
        {hint && <InfoHint text={hint} />}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/** Tren net harian: batang hijau (net buy) / merah (net sell), flip disorot amber. */
function FlowChart({
  flow,
  height = 150,
}: {
  flow: { date: string; net: number | null; flip: boolean | null }[];
  height?: number;
}) {
  const points = flow
    .filter((p) => p.net !== null)
    .map((p) => ({
      label: fmtDateStr(p.date)?.slice(0, 6) ?? p.date,
      net: p.net! / 1e9, // miliar supaya sumbu terbaca
      flip: p.flip === true,
      raw: p.net!,
    }));
  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v: number) => `${v} M`}
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof points)[number];
            return (
              <div className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  {fmtDateStr(d.label) ?? d.label}
                  {d.flip && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      FLIP
                    </span>
                  )}
                </p>
                <p className="tabular-nums">
                  Net asing: <span className={d.raw > 0 ? "text-up" : "text-down"}>Rp {fmtCompact(d.raw)}</span>
                </p>
              </div>
            );
          }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" />
        <Bar dataKey="net" maxBarSize={22}>
          {points.map((p, i) => (
            <Cell key={i} fill={p.flip ? FLIP : p.raw > 0 ? UP : DOWN} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Peer sektor: bar relatif terhadap nilai ekstrem di daftar. */
function PeerList({
  peers,
  comparable,
}: {
  peers: StockForeignFlowPeer[];
  comparable: boolean;
}) {
  const maxAbs = Math.max(...peers.map((p) => Math.abs(p.net_sum)), 1);
  return (
    <div>
      <p className="text-muted mb-1.5 flex items-center gap-1 text-[11px]">
        Pembanding sektor (net asing {peers[0]?.n_days ?? 10} sesi terakhir)
        <InfoHint text="Jumlah net flow asing tiap emiten se-sektor dalam jendela pembanding. Hijau = asing sedang akumulasi, merah = distribusi. Posisi emiten ini di antara peer-nya ditandai." />
      </p>
      <ul className="space-y-1">
        {peers.map((p) => (
          <li key={p.code} className="flex items-center gap-2 text-[11px]">
            <span
              className={`w-12 shrink-0 font-semibold ${p.is_self ? "text-up" : ""}`}
              title={p.is_self ? "Emiten ini" : undefined}
            >
              {p.code}
              {p.is_self ? " ←" : ""}
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
              <span className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
            </span>
            <span
              className={`w-16 shrink-0 text-right tabular-nums ${p.net_sum >= 0 ? "text-up" : "text-down"}`}
            >
              Rp {fmtCompact(p.net_sum)}
            </span>
          </li>
        ))}
      </ul>
      {!comparable && (
        <p className="text-muted mt-1.5 text-[10px] leading-snug">
          Sektor emiten ini tidak terpetakan — pembanding diambil dari bucket
          &quot;Lainnya&quot;, jadi anggap gambaran kasar.
        </p>
      )}
    </div>
  );
}

/**
 * Aliran asing per emiten: net harian (rupiah), deteksi flip arah, dan
 * pembanding emiten sejenis di sektor yang sama. `compact` menyembunyikan peer.
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

  return (
    <Card
      className={className}
      title="Arus Asing"
      subtitle={
        data?.date
          ? `Net flow asing harian — sesi ${fmtDateStr(data.date)}${data.sector ? ` · ${data.sector}` : ""}`
          : "Net flow asing harian"
      }
      info="Arah aliran asing agregat per emiten (IDX menggabungkan semua investor asing). Net = beli − jual dalam rupiah (volume saham × close). Batang amber menandai hari pergantian arah (flip). Ini berbeda dari 'Komposisi Broker' yang mengukur porsi transaksi per kategori."
      right={<LastUpdated sessionDate={data?.date} updatedAt={null} dep={data} />}
    >
      {error ? (
        <ErrorState message={`Gagal memuat arus asing: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-44 w-full" />
      ) : data.flow.length === 0 || data.flow.every((p) => p.net === null) ? (
        <EmptyState message="Belum ada data aliran asing untuk emiten ini (data EOD diisi lewat `idx serve` atau backfill)." />
      ) : (
        <div className="space-y-4">
          <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            <Stat
              label="Arah kini"
              value={
                fs?.current_side === "net_buy"
                  ? "Net Buy"
                  : fs?.current_side === "net_sell"
                    ? "Net Sell"
                    : "Datar"
              }
              tone={fs?.current_side === "net_buy" ? "text-up" : fs?.current_side === "net_sell" ? "text-down" : ""}
              hint="Tanda net flow asing pada sesi terakhir."
            />
            <Stat
              label="Streak"
              value={fs?.current_streak ? `${fs.current_streak} hari` : "-"}
              hint="Hari berturut-turut arah sama. Hari net 0 / tanpa data mereset streak."
            />
            <Stat
              label="Flip terakhir"
              value={
                fs?.last_flip
                  ? `${fs.last_flip.to === "net_buy" ? "→ Net Buy" : "→ Net Sell"}`
                  : "Belum ada"
              }
              tone={fs?.last_flip?.to === "net_buy" ? "text-up" : fs?.last_flip?.to === "net_sell" ? "text-down" : ""}
              hint="Kapan terakhir asing berbalik arah. Hari net 0 tidak dihitung flip — asing yang diam bukan perubahan arah."
            />
            <Stat
              label="Sejak flip"
              value={fs?.days_since_flip !== null && fs?.days_since_flip !== undefined ? `${fs.days_since_flip} sesi` : "-"}
              hint="Berapa sesi sejak flip terakhir (0 = flip terjadi hari ini)."
            />
          </div>

          <div>
            <p className="text-muted mb-1 flex items-center gap-1 text-[11px]">
              Tren net harian
              <InfoHint text="Net flow asing per hari dalam miliar rupiah. Hijau = akumulasi, merah = distribusi, amber = hari flip." />
            </p>
            <FlowChart flow={data.flow} />
          </div>

          {!compact && data.peers.length > 1 && (
            <PeerList peers={data.peers} comparable={data.comparable} />
          )}

          {!compact && data.peer_rank.count > 1 && (
            <p className="text-muted text-[11px] leading-snug">
              Posisi di sektor: <strong>#{data.peer_rank.rank}</strong> dari{" "}
              {data.peer_rank.count} emiten (median peer Rp {fmtCompact(data.peer_rank.median_sum)}).
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
