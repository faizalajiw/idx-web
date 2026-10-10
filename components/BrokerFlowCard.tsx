"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBrokerFlow } from "@/lib/hooks";
import { fmtCompact, fmtDateStr } from "@/lib/format";
import type { BrokerFlowCategory, BrokerFlowDay } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";
import { InfoHint } from "./InfoHint";

// Warna konsisten dengan legenda broker di seluruh dashboard (lihat lib/brokerType).
const CAT_META: Record<BrokerFlowCategory, { label: string; color: string }> = {
  asing: { label: "Asing", color: "var(--chart-foreign)" },
  lokal: { label: "Lokal", color: "var(--chart-local)" },
  bumn: { label: "BUMN", color: "var(--chart-bumn)" },
};
const CATS: BrokerFlowCategory[] = ["asing", "lokal", "bumn"];

/** Satu bar horizontal 100% dari porsi tiga kategori sesi terakhir. */
function ShareBar({
  shares,
}: {
  shares: Record<BrokerFlowCategory, number | null>;
}) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
        {CATS.map((c) => {
          const s = shares[c];
          if (s === null || s <= 0) return null;
          return (
            <div
              key={c}
              className="h-full"
              style={{ width: `${s * 100}%`, backgroundColor: CAT_META[c].color }}
              title={`${CAT_META[c].label} ${(s * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {CATS.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: CAT_META[c].color }}
            />
            <span className="font-medium">{CAT_META[c].label}</span>
            <span className="tabular-nums">
              {shares[c] === null ? "-" : `${(shares[c]! * 100).toFixed(1)}%`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Satu kolom kategori: share besar + nilai + daftar firma terbesar. */
function CategoryColumn({
  cat,
  stat,
  top,
}: {
  cat: BrokerFlowCategory;
  stat: { value: number | null; share: number | null; n_brokers: number };
  top: { broker_code: string; broker_name: string | null; value: number; share: number | null }[];
}) {
  const meta = CAT_META[cat];
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          {meta.label}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {stat.share === null ? "-" : `${(stat.share * 100).toFixed(1)}%`}
        </span>
      </div>
      <p className="text-muted mt-0.5 text-[11px] tabular-nums">
        Rp {fmtCompact(stat.value)} · {stat.n_brokers} firma
      </p>
      {top.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-[var(--border)] pt-2">
          {top.map((b) => (
            <li key={b.broker_code} className="flex items-center gap-2 text-[11px]">
              <span className="w-7 shrink-0 font-semibold">{b.broker_code}</span>
              <span className="text-muted min-w-0 flex-1 truncate">{b.broker_name ?? "-"}</span>
              <span className="shrink-0 tabular-nums">
                {b.share === null ? "-" : `${(b.share * 100).toFixed(1)}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tren porsi kategori per sesi — stacked % bar chart. */
function HistoryChart({ history }: { history: BrokerFlowDay[] }) {
  const points = history
    .filter((h) => h.asing_share !== null && h.lokal_share !== null && h.bumn_share !== null)
    .map((h) => ({
      label: fmtDateStr(h.date)?.slice(0, 6) ?? h.date,
      Asing: Number((h.asing_share! * 100).toFixed(2)),
      Lokal: Number((h.lokal_share! * 100).toFixed(2)),
      BUMN: Number((h.bumn_share! * 100).toFixed(2)),
      // Nilai mentah ikut di data supaya tooltip bisa menampilkan rupiahnya.
      _asing: h.asing_value,
      _lokal: h.lokal_value,
      _bumn: h.bumn_value,
      _total: h.total_value,
    }));
  if (points.length === 0) return null;

  return (
    <div>
      <p className="text-muted mb-1 flex items-center gap-1 text-[11px]">
        Tren porsi per sesi
        <InfoHint text="Porsi nilai transaksi tiap kategori terhadap total pasar per hari bursa. Ketinggian batang selalu 100% — yang dibaca adalah pergeseran komposisinya, bukan besaran pasarnya." />
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof points)[number];
              return (
                <div className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 font-semibold">{fmtDateStr(d.label) ?? d.label}</p>
                  {CATS.map((c) => (
                    <p key={c} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: CAT_META[c].color }}
                      />
                      <span>{CAT_META[c].label}</span>
                      <span className="ml-auto tabular-nums">
                        {d[c === "asing" ? "Asing" : c === "lokal" ? "Lokal" : "BUMN"].toFixed(1)}% · Rp{" "}
                        {fmtCompact(d[`_${c}` as const])}
                      </span>
                    </p>
                  ))}
                  <p className="text-muted mt-1 tabular-nums">Total: Rp {fmtCompact(d._total)}</p>
                </div>
              );
            }}
          />
          {CATS.map((c) => (
            <Bar
              key={c}
              dataKey={CAT_META[c].label}
              stackId="komposisi"
              fill={CAT_META[c].color}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Komposisi nilai transaksi broker: asing / lokal / BUMN (EOD, seluruh pasar).
 * `compact` (di detail emiten) menyembunyikan tren riwayat & meringkas catatan.
 */
export function BrokerFlowCard({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { data, error, isLoading } = useBrokerFlow(20, 5);
  const [showMap, setShowMap] = useState(false);

  return (
    <Card
      className={className}
      title="Komposisi Broker"
      subtitle={
        data?.date
          ? `Nilai transaksi asing / lokal / BUMN — sesi ${fmtDateStr(data.date)}`
          : "Nilai transaksi asing / lokal / BUMN"
      }
      info="Porsi nilai transaksi pasar per kategori broker. Sekuritas asing (UBS, CGS, J.P. Morgan, dll) dipisah dari lokal, dan sekuritas milik BUMN (Mandiri, BNI, BRI Danareksa, Bahana) dipisah sendiri."
      right={
        <LastUpdated sessionDate={data?.date} updatedAt={data?.captured_at} dep={data} />
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat komposisi broker: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-44 w-full" />
      ) : data.n_brokers === 0 || data.total_value === null ? (
        <EmptyState message="Belum ada data broker. Isi lewat `idx serve` (job 16:30 WIB) atau `python -m scripts.backfill_broker_eod`." />
      ) : (
        <div className="space-y-4">
          <ShareBar
            shares={{
              asing: data.categories.asing.share,
              lokal: data.categories.lokal.share,
              bumn: data.categories.bumn.share,
            }}
          />

          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
            {CATS.map((c) => (
              <CategoryColumn key={c} cat={c} stat={data.categories[c]} top={data.top[c]} />
            ))}
          </div>

          {!compact && data.history.length > 1 && <HistoryChart history={data.history} />}

          <div className="space-y-1">
            <p className="text-muted text-[11px] leading-snug">
              Yang diukur adalah <strong>porsi nilai transaksi</strong> (setiap trade
              dihitung sekali di broker pembeli dan sekali di broker penjual, jadi
              totalnya dua sisi perdagangan) — bukan net beli/jual: IDX tidak
              mempublikasikan split beli/jual per broker di data gratis. Kategori
              dari map kurasi kode broker{" "}
              <button
                type="button"
                className="underline decoration-dotted hover:underline"
                onClick={() => setShowMap((v) => !v)}
              >
                {showMap ? "sembunyikan" : "lihat klasifikasi"}
              </button>
              .
            </p>
            {showMap && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--border)] p-2">
                <table className="w-full text-[11px]">
                  <tbody>
                    {data.classification.map((b) => (
                      <tr key={b.broker_code} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-0.5 pr-2 font-semibold">{b.broker_code}</td>
                        <td className="text-muted py-0.5 pr-2">{b.broker_name ?? "-"}</td>
                        <td className="py-0.5 text-right">
                          <span
                            className="inline-flex items-center gap-1"
                            style={{ color: CAT_META[b.category as BrokerFlowCategory]?.color }}
                          >
                            {CAT_META[b.category as BrokerFlowCategory]?.label ?? b.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
