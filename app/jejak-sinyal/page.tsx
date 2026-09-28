"use client";

import { useState } from "react";
import { useSignalTrack } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import type { SignalTrack, SignalTrackStat } from "@/lib/types";
import { LastUpdated } from "@/components/LastUpdated";
import { ArrowDownRight, ArrowUpRight, History, Target } from "lucide-react";

const pct = (v: number | null) =>
  v === null ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
const hitPct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(0)}%`);
const num = (v: number | null, digits = 2) => (v === null ? "-" : v.toFixed(digits));

const tone = (v: number | null) =>
  v === null ? "text-muted" : v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted";

function HorizonPills({
  horizons,
  active,
  onChange,
}: {
  horizons: number[];
  active: number;
  onChange: (h: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {horizons.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={`btn ${h === active ? "btn-primary" : "btn-ghost"} px-2.5 py-1 text-xs`}
          aria-pressed={h === active}
        >
          {h}h
        </button>
      ))}
    </div>
  );
}

function StatTable({ rows, horizon }: { rows: SignalTrackStat[]; horizon: number }) {
  const visible = rows.filter((r) => r.horizon === horizon && r.n > 0);
  if (visible.length === 0) return <EmptyState message="Belum cukup data pada horizon ini." />;
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Sinyal</th>
            <th className="text-right">n</th>
            <th className="text-right">Hit rate</th>
            <th className="text-right" title="Rata-rata return setelah sinyal (entry close T+1)">
              Mean
            </th>
            <th className="text-right">Median</th>
            <th className="text-right" title="Dikurangi return pasar equal-weight, window sama">
              Abnormal
            </th>
            <th className="text-right" title="Newey-West lag 5">t-stat</th>
            <th className="text-right" title="Puncak kenaikan terbaik dalam horizon (rata-rata)">
              MFE
            </th>
            <th className="text-right" title="Penurunan terburuk dalam horizon (rata-rata)">
              MAE
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={`${r.signal}-${r.regime ?? "all"}-${r.horizon}`}>
              <td>
                <span className={`badge ${r.signal === "BUY" ? "badge-buy" : "badge-sell"}`}>
                  {r.signal}
                </span>
                {r.regime && <span className="text-muted ml-2 text-xs">{r.regime}</span>}
              </td>
              <td className="text-right tabular-nums">{r.n}</td>
              <td className="text-right tabular-nums">{hitPct(r.hit_rate)}</td>
              <td className={`text-right tabular-nums ${tone(r.mean_fwd)}`}>{pct(r.mean_fwd)}</td>
              <td className={`text-right tabular-nums ${tone(r.median_fwd)}`}>
                {pct(r.median_fwd)}
              </td>
              <td className={`text-right tabular-nums ${tone(r.mean_abnormal)}`}>
                {pct(r.mean_abnormal)}
              </td>
              <td className="text-muted text-right tabular-nums">{num(r.t_stat)}</td>
              <td className="text-muted text-right tabular-nums">{pct(r.avg_mfe)}</td>
              <td className="text-muted text-right tabular-nums">{pct(r.avg_mae)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStrip({ data }: { data: SignalTrack }) {
  const items = [
    { label: "Total sinyal", value: String(data.signals) },
    { label: "BUY / SELL", value: `${data.buy} / ${data.sell}` },
    { label: "Periode", value: `${data.first_date ?? "-"} → ${data.last_date ?? "-"}` },
    { label: "Dihitung", value: data.generated_at?.replace("T", " ") ?? "-" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="card p-3">
          <p className="text-muted text-[11px] uppercase tracking-wide">{it.label}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function JejakSinyalPage() {
  const { data, error, isLoading } = useSignalTrack();
  const [horizon, setHorizon] = useState(21);

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <ErrorState message="Gagal memuat jejak sinyal. Pastikan backend & database hidup." />
      </main>
    );
  }

  const horizons = data?.horizons ?? [5, 10, 21];
  const activeHorizon = horizons.includes(horizon) ? horizon : (horizons[horizons.length - 1] ?? 21);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Jejak <span className="gradient-text">Sinyal</span>
        </h1>
        <p className="text-muted mt-0.5 flex items-center gap-2 text-sm">
          Track record historis sinyal BUY/SELL — hit-rate, return setelah sinyal, dan
          selisihnya terhadap pasar, dipecah per regime IHSG.
          <LastUpdated sessionDate={data?.last_date} updatedAt={data?.generated_at} />
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <SummaryStrip data={data} />

          <Card
            title={
              <>
                <Target size={15} aria-hidden /> Kinerja per Sinyal
              </>
            }
            subtitle="Entry di close T+1, dibandingkan pasar equal-weight pada window yang sama"
            info="Melacak seberapa akurat sinyal beli/jual di aplikasi ini bila benar-benar diikuti — apakah rata-rata untung dan mengalahkan pasar? Ini rapor kejujuran sinyalnya."
            right={<HorizonPills horizons={horizons} active={activeHorizon} onChange={setHorizon} />}
          >
            <StatTable rows={data.overall} horizon={activeHorizon} />
          </Card>

          <Card
            title={
              <>
                <History size={15} aria-hidden /> Kinerja per Regime IHSG
              </>
            }
            subtitle="Apakah sinyal bekerja lebih baik saat pasar trending, ranging, atau transisi?"
            info="Membedah kinerja sinyal berdasarkan kondisi pasar. Banyak sinyal bagus saat pasar tren tapi buruk saat pasar menyamping — di sini kamu bisa lihat kapan sebaiknya lebih percaya sinyalnya."
          >
            <StatTable rows={data.by_regime} horizon={activeHorizon} />
          </Card>

          <Card
            title="Sinyal Terbaru"
            subtitle="Return yang sudah terealisasi sejak sinyal (kosong = horizon belum selesai)"
            info="Daftar sinyal yang baru muncul beserta hasilnya sejauh ini. Kolom kosong berarti waktunya belum cukup untuk menilai hasil akhir."
          >
            {data.recent.length === 0 ? (
              <EmptyState message="Belum ada sinyal tercatat." />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Tanggal</th>
                      <th className="text-left">Emiten</th>
                      <th className="text-left">Sinyal</th>
                      <th className="text-right">Close</th>
                      <th className="text-right">5h</th>
                      <th className="text-right">10h</th>
                      <th className="text-right">21h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={`${r.code}-${r.date}`}>
                        <td className="text-muted tabular-nums">{r.date}</td>
                        <td className="font-medium">{r.code}</td>
                        <td>
                          <span
                            className={`badge ${
                              r.signal === "BUY" ? "badge-buy" : "badge-sell"
                            } inline-flex items-center gap-1`}
                          >
                            {r.signal === "BUY" ? (
                              <ArrowUpRight size={12} aria-hidden />
                            ) : (
                              <ArrowDownRight size={12} aria-hidden />
                            )}
                            {r.signal}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{num(r.close, 0)}</td>
                        <td className={`text-right tabular-nums ${tone(r.fwd_5)}`}>
                          {pct(r.fwd_5)}
                        </td>
                        <td className={`text-right tabular-nums ${tone(r.fwd_10)}`}>
                          {pct(r.fwd_10)}
                        </td>
                        <td className={`text-right tabular-nums ${tone(r.fwd_21)}`}>
                          {pct(r.fwd_21)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <p className="text-muted text-[11px] leading-snug">
        Metodologi: sinyal dihitung point-in-time dari layer harga bebas
        look-ahead (rule SMA20/50 + RSI yang sama dengan dashboard), entry di
        close T+1, SELL palsu ex-dividend tidak dicatat. Return historis adalah
        ukuran deskriptif — bukan jaminan hasil masa depan, dan belum
        memperhitungkan biaya transaksi.
      </p>
    </main>
  );
}
