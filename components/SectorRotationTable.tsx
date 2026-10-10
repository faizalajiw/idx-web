"use client";

import { useSectorRotation } from "@/lib/hooks";
import type { SectorRotationRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";

const PHASE_STYLE: Record<string, { badge: string; label: string }> = {
  AKUMULASI: { badge: "badge badge-buy", label: "Akumulasi" },
  MEMBAIK: { badge: "badge badge-hold", label: "Membaik" },
  MEMUDAR: { badge: "badge badge-warn", label: "Memudar" },
  TERPURUK: { badge: "badge badge-sell", label: "Terpuruk" },
  STABIL: { badge: "badge badge-hold opacity-60", label: "Stabil" },
};

const p0 = (v: number) => `${(v * 100).toFixed(0)}%`;

function deltaCell(v: number | null): string {
  if (v === null) return "-";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

function deltaClass(v: number | null): string {
  if (v === null || v === 0) return "text-muted";
  return v > 0 ? "text-up" : "text-down";
}

/** Sparkline median skor sektor — SVG polos, tanpa Recharts per baris. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 76;
  const h = 22;
  // Sertakan 50 supaya garis netralnya selalu terlihat di skala.
  const min = Math.min(...values, 50);
  const max = Math.max(...values, 50);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / span) * h;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <svg width={w} height={h} aria-hidden className="overflow-visible">
      <line
        x1={0}
        x2={w}
        y1={y(50)}
        y2={y(50)}
        stroke="var(--chart-ref-soft)"
        strokeDasharray="2 2"
      />
      <polyline
        points={points}
        fill="none"
        stroke={last >= 50 ? "var(--chart-up)" : "var(--chart-down)"}
        strokeWidth={1.5}
      />
    </svg>
  );
}

function RotationTable() {
  const { data, error, isLoading } = useSectorRotation(60, 3);

  if (error) return <ErrorState message={`Gagal memuat rotasi sektor: ${error.message}`} />;
  if (isLoading || !data) return <Skeleton className="h-72 w-full" />;

  if (!data.validated)
    return (
      <div className="space-y-2">
        <p className="text-muted text-sm">
          {data.reason ?? "Rotasi sektor belum bisa dihitung."}
        </p>
        <p className="text-muted text-[11px] leading-snug">
          Rotasi ini diturunkan dari skor aktivitas broker, dan skor itu hanya
          memakai faktor aliran yang sudah lolos uji IC. Selama belum ada yang
          lolos, tidak ada yang bisa dirotasi — jadi tabel ini sengaja kosong.
        </p>
      </div>
    );

  if (data.sectors.length === 0)
    return (
      <EmptyState
        message={`Belum ada sektor dengan minimal ${data.min_names} emiten berskor.`}
      />
    );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Sektor</th>
              <th className="text-left">Fase</th>
              <th className="text-right">Median skor</th>
              <th className="text-right">Δ 5 sesi</th>
              <th className="text-right">Δ 21 sesi</th>
              <th className="text-right">Breadth</th>
              <th className="text-left">Tren</th>
            </tr>
          </thead>
          <tbody>
            {data.sectors.map((s: SectorRotationRow) => {
              const style = (s.phase && PHASE_STYLE[s.phase]) || null;
              return (
                <tr key={s.sector}>
                  <td>
                    <span className="font-semibold">{s.sector}</span>
                    <span className="text-muted ml-2 text-xs">{s.n_names} emiten</span>
                  </td>
                  <td>
                    {style ? (
                      <span className={style.badge}>{style.label}</span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="text-right font-semibold tabular-nums">{s.median_score.toFixed(1)}</td>
                  <td className={`text-right tabular-nums ${deltaClass(s.delta_5d)}`}>
                    {deltaCell(s.delta_5d)}
                  </td>
                  <td className={`text-right tabular-nums ${deltaClass(s.delta_21d)}`}>
                    {deltaCell(s.delta_21d)}
                  </td>
                  <td className="text-right tabular-nums">{p0(s.breadth)}</td>
                  <td>
                    <Sparkline values={s.history} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted text-[11px] leading-snug">
        Urut dari sektor yang paling sedang menguat (Δ 5 sesi). Median dipakai
        agar satu emiten ekstrem tidak mewakili seluruh sektor. Breadth = porsi
        emiten sektor itu yang skornya ≥ 60 (benar-benar diakumulasi). Sektor
        dengan kurang dari {data.min_names} emiten berskor tidak ditampilkan
        {data.unmapped_names > 0 &&
          `; ${data.unmapped_names} emiten berskor belum punya sektor sebenarnya dan tidak diikutkan`}
        . Δ = perubahan median, bukan levelnya — sektor kuat yang mulai turun
        berbeda artinya dari yang sedang naik.
      </p>
    </div>
  );
}

/**
 * Rotasi sektor berbasis skor aktivitas broker.
 *
 * Rotasi sektor berbasis skor aktivitas broker, mengukur JEJAK ALIRAN
 * (proksi akumulasi/distribusi). Sektor bisa saja harganya belum bergerak
 * padahal alirannya sudah berbalik — itu justru yang dicari di sini.
 */
export function SectorRotationTable() {
  const { data } = useSectorRotation(60, 3);

  return (
    <Card
      title="Rotasi Sektor — Aktivitas Broker"
      subtitle="Median skor aliran per sektor + arah perubahannya"
      info="Sektor mana yang aliran dananya sedang berbalik naik (akumulasi) atau turun (distribusi). Dihitung dari jejak aliran broker (proksi arus asing + buku intraday), dibobot oleh uji IC."
      right={<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />}
    >
      <RotationTable />
    </Card>
  );
}
