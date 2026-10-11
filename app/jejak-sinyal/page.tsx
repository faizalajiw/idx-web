"use client";

import { useState } from "react";
import { useSignalTrack } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { TickerLogo } from "@/components/TickerLogo";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import type { SignalTrack, SignalTrackStat } from "@/lib/types";
import { ArrowDownRight, ArrowUpRight, History, Scale, Target, TrendingUp } from "lucide-react";

const pct = (v: number | null) =>
  v === null ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
const hitPct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(0)}%`);
const num = (v: number | null, digits = 2) => (v === null ? "-" : v.toFixed(digits));

const tone = (v: number | null) =>
  v === null ? "text-muted" : v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted";

// Horizon dihitung dalam hari bursa (trading day), bukan jam.
const HORIZON_LABEL: Record<number, { title: string; hint: string }> = {
  5: { title: "1 minggu", hint: "5 hari bursa" },
  10: { title: "2 minggu", hint: "10 hari bursa" },
  21: { title: "1 bulan", hint: "21 hari bursa" },
};
const horizonLabel = (h: number) =>
  HORIZON_LABEL[h] ?? { title: `${h} hari`, hint: `${h} hari bursa` };

/** Penilaian sederhana: apakah sinyal mengalahkan pasar, dan apakah buktinya cukup kuat. */
function verdict(row: SignalTrackStat | undefined) {
  if (!row || row.mean_abnormal === null) {
    return { text: "Data belum cukup", cls: "badge" };
  }
  const beats = row.mean_abnormal > 0;
  const solid = row.t_stat !== null && Math.abs(row.t_stat) >= 2;
  const rawPositive = row.mean_fwd !== null && row.mean_fwd > 0;
  if (beats && solid && rawPositive) return { text: "Mengalahkan pasar", cls: "badge-buy" };
  if (beats) return { text: "Unggul tipis, belum pasti", cls: "badge" };
  return { text: "Belum mengalahkan pasar", cls: "badge-sell" };
}

function HorizonTabs({
  horizons,
  active,
  onChange,
}: {
  horizons: number[];
  active: number;
  onChange: (h: number) => void;
}) {
  return (
    <div role="tablist" aria-label="Pilih jangka waktu" className="grid grid-cols-3 gap-2">
      {horizons.map((h) => {
        const on = h === active;
        const l = horizonLabel(h);
        return (
          <button
            key={h}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(h)}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${
              on
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] hover:bg-[var(--bg-elev)]"
            }`}
          >
            <p className={`text-sm font-semibold ${on ? "text-[var(--accent)]" : ""}`}>{l.title}</p>
            <p className="text-muted text-[11px]">{l.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

function SignalResultCard({
  signal,
  row,
}: {
  signal: "BUY" | "SELL";
  row: SignalTrackStat | undefined;
}) {
  const label = signal === "BUY" ? "Beli" : "Jual";
  const v = verdict(row);
  const Icon = signal === "BUY" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`badge ${signal === "BUY" ? "badge-buy" : "badge-sell"} inline-flex items-center gap-1`}
        >
          <Icon size={12} aria-hidden /> Sinyal {label}
        </span>
        <span className={`badge ${v.cls}`}>{v.text}</span>
      </div>

      {!row || row.n === 0 ? (
        <p className="text-muted mt-4 text-sm">Belum ada sinyal {label.toLowerCase()} yang sudah selesai dihitung.</p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-bold tabular-nums">{hitPct(row.hit_rate)}</p>
          <p className="text-muted mt-1 text-xs">
            Dari {row.n} sinyal, {hitPct(row.hit_rate)} searah dengan prediksi.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted text-[11px] uppercase tracking-wide">Rata-rata return</dt>
              <dd className={`font-semibold tabular-nums ${tone(row.mean_fwd)}`}>{pct(row.mean_fwd)}</dd>
            </div>
            <div>
              <dt className="text-muted text-[11px] uppercase tracking-wide">Vs pasar</dt>
              <dd className={`font-semibold tabular-nums ${tone(row.mean_abnormal)}`}>
                {pct(row.mean_abnormal)}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-[11px] uppercase tracking-wide">Return tengah</dt>
              <dd className={`tabular-nums ${tone(row.median_fwd)}`}>{pct(row.median_fwd)}</dd>
            </div>
            <div>
              <dt className="text-muted text-[11px] uppercase tracking-wide">Kekuatan bukti</dt>
              <dd className="tabular-nums">
                {row.t_stat === null ? "-" : Math.abs(row.t_stat) >= 2 ? "Kuat" : "Lemah"}{" "}
                <span className="text-muted text-xs">(t {num(row.t_stat)})</span>
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

function RegimeCard({ row }: { row: SignalTrackStat }) {
  const v = verdict(row);
  const toneText = v.cls === "badge-buy" ? "text-up" : v.cls === "badge-sell" ? "text-down" : "text-muted";
  return (
    <div className="rounded-xl border border-[var(--border)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`badge ${row.signal === "BUY" ? "badge-buy" : "badge-sell"}`}>
            {row.signal === "BUY" ? "Beli" : "Jual"}
          </span>
          <span className="truncate text-sm font-medium">{row.regime ?? "Semua kondisi"}</span>
        </div>
        <span className="text-muted shrink-0 text-xs">n = {row.n}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tabular-nums">{hitPct(row.hit_rate)}</p>
          <p className="text-muted text-[11px]">tingkat keberhasilan</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${tone(row.mean_abnormal)}`}>
            {pct(row.mean_abnormal)}
          </p>
          <p className="text-muted text-[11px]">vs pasar</p>
        </div>
      </div>
      <p className={`mt-2 text-xs ${toneText}`}>{v.text}</p>
    </div>
  );
}

function SummaryStrip({ data }: { data: SignalTrack }) {
  const items = [
    { label: "Sinyal tercatat", value: String(data.signals) },
    { label: "Beli / Jual", value: `${data.buy} / ${data.sell}` },
    { label: "Periode data", value: `${data.first_date ?? "-"} s/d ${data.last_date ?? "-"}` },
    { label: "Terakhir dihitung", value: data.generated_at?.replace("T", " ").slice(0, 16) ?? "-" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="card p-3">
          <p className="text-muted text-[11px] uppercase tracking-wide">{it.label}</p>
          <p className="mt-1 break-words text-sm font-semibold tabular-nums">{it.value}</p>
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

  const overall = data?.overall.filter((r) => r.horizon === activeHorizon && r.regime === null) ?? [];
  const buyRow = overall.find((r) => r.signal === "BUY");
  const sellRow = overall.find((r) => r.signal === "SELL");
  const regimeRows = (data?.by_regime ?? []).filter((r) => r.horizon === activeHorizon && r.n > 0);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  <History size={26} className="text-accent" aria-hidden />
                  Jejak <span className="gradient-text">Sinyal</span>
                </h1>
        <p className="text-muted mt-1 text-sm">
          Seberapa sering sinyal beli dan jual di aplikasi ini benar-benar berhasil, dilihat dari data masa lalu.
        </p>
        <div className="mt-1">
          <LastUpdated sessionDate={data?.last_date} updatedAt={data?.generated_at} />
        </div>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <Scale size={15} aria-hidden /> Pilih jangka waktu
              </span>
            }
            subtitle="Setelah sinyal muncul, seberapa lama kamu menunggu hasilnya?"
            info="Jangka waktu dihitung dalam hari bursa. Pilih 1 minggu untuk hasil jangka pendek, 1 bulan untuk jangka lebih panjang."
          >
            <HorizonTabs horizons={horizons} active={activeHorizon} onChange={setHorizon} />
          </Card>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Target size={16} aria-hidden /> Hasil sinyal dalam {horizonLabel(activeHorizon).title}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <SignalResultCard signal="BUY" row={buyRow} />
              <SignalResultCard signal="SELL" row={sellRow} />
            </div>
            <p className="text-muted text-xs">
              <strong className="text-[var(--fg)]">Vs pasar</strong> = selisih hasil sinyal dibanding rata-rata pasar pada
              periode yang sama. Positif berarti sinyal lebih baik dari pasar.{" "}
              <strong className="text-[var(--fg)]">Kekuatan bukti</strong> menunjukkan apakah hasil ini cukup konsisten,
              bukan sekadar kebetulan.
            </p>
          </section>

          <Card
            title={
              <span className="inline-flex items-center gap-2">
                <TrendingUp size={15} aria-hidden /> Kapan sinyal paling bisa dipercaya?
              </span>
            }
            subtitle="Hasil dipecah berdasarkan kondisi pasar IHSG"
            info="Banyak sinyal bekerja baik saat pasar trending, tapi kurang akurat saat pasar menyamping. Bagian ini membantu kamu tahu kapan sebaiknya lebih percaya pada sinyal."
          >
            {regimeRows.length === 0 ? (
              <EmptyState message="Belum cukup data per kondisi pasar untuk jangka waktu ini." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {regimeRows.map((r) => (
                  <RegimeCard key={`${r.signal}-${r.regime ?? "all"}-${r.horizon}`} row={r} />
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Sinyal terbaru"
            subtitle="Hasil yang sudah terjadi sejak sinyal muncul. Tanda '-' berarti jangka waktu belum selesai."
            info="Daftar sinyal terbaru beserta hasilnya sejauh ini. Tanda '-' berarti jangka waktu belum selesai, jadi hasilnya belum bisa dinilai."
          >
            {data.recent.length === 0 ? (
              <EmptyState message="Belum ada sinyal tercatat." />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Tanggal</th>
                      <th className="text-left">Saham</th>
                      <th className="text-left">Sinyal</th>
                      <th className="hidden text-right sm:table-cell">Harga</th>
                      <th className="text-right">1 minggu</th>
                      <th className="hidden text-right md:table-cell">2 minggu</th>
                      <th className="text-right">1 bulan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={`${r.code}-${r.date}-${r.signal}`}>
                        <td className="text-muted tabular-nums">{r.date}</td>
                        <td className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            <TickerLogo code={r.code} size={18} />
                            {r.code}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.signal === "BUY" ? "badge-buy" : "badge-sell"}`}>
                            {r.signal === "BUY" ? "Beli" : "Jual"}
                          </span>
                        </td>
                        <td className="hidden text-right tabular-nums sm:table-cell">{num(r.close, 0)}</td>
                        <td className={`text-right tabular-nums ${tone(r.fwd_5)}`}>{pct(r.fwd_5)}</td>
                        <td className={`hidden text-right tabular-nums md:table-cell ${tone(r.fwd_10)}`}>
                          {pct(r.fwd_10)}
                        </td>
                        <td className={`text-right tabular-nums ${tone(r.fwd_21)}`}>{pct(r.fwd_21)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <SummaryStrip data={data} />
        </>
      )}

      <p className="text-muted text-[11px] leading-snug">
        Metodologi: sinyal dihitung hanya dengan data yang tersedia pada hari itu (bebas look-ahead), entry di harga
        penutupan hari berikutnya (T+1), dan SELL palsu saat ex-dividend tidak dicatat. Hasil masa lalu bukan jaminan hasil
        di masa depan, dan belum memperhitungkan biaya transaksi.
      </p>
    </main>
  );
}
