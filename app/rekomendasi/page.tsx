"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Target, Crosshair, ShieldAlert, Layers, Info } from "lucide-react";
import { useRecommendations, useRecommendationTrack } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { RegimeBanner } from "@/components/RegimeBanner";
import { fmtNum, fmtPct, fmtCompact, trendClass } from "@/lib/format";
import type {
  RecommendationRow,
  RecommendationLayerStatus,
  RecommendationTrack,
} from "@/lib/types";

const GRADE_BADGE: Record<string, string> = {
  A: "badge badge-buy",
  B: "badge badge-warn",
  C: "badge badge-hold",
};

const CONFIDENCE_TONE: Record<string, string> = {
  tinggi: "text-up",
  sedang: "text-muted",
  lemah: "text-muted",
};

const PATTERN_LABEL: Record<string, string> = {
  silent_accumulation: "Akumulasi diam-diam",
  initiation: "Inisiasi volume + asing",
  distribution_on_rally: "Distribusi saat naik",
  silent_distribution: "Distribusi diam-diam",
};

const rp = (v: number | null) =>
  v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

/** Strip status lapisan: mana yang ikut menggerakkan skor, dan kenapa. */
function LayerStrip({ layers }: { layers: RecommendationLayerStatus }) {
  const chips = [
    { active: true, label: "Teknikal + entry timing", note: "selalu aktif" },
    {
      active: layers.factor,
      label: "Faktor IC",
      note: layers.factor ? "aktif" : "belum lolos gate",
    },
    {
      active: layers.broker,
      label: "Aliran broker",
      note: layers.broker ? "aktif" : "belum lolos gate",
    },
  ];
  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs">
      <span className="text-muted flex items-center gap-1.5 font-semibold uppercase tracking-widest">
        <Layers size={13} aria-hidden /> Lapisan skor
      </span>
      {chips.map((c) => (
        <span key={c.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: c.active ? "var(--up)" : "var(--border)" }}
            aria-hidden
          />
          <span className={c.active ? "" : "text-muted"}>{c.label}</span>
          <span className="text-muted">· {c.note}</span>
        </span>
      ))}
      <span className="text-muted ml-auto hidden max-w-md text-[11px] leading-snug md:block">
        {layers.note}
      </span>
    </div>
  );
}

function LevelRow({ row }: { row: RecommendationRow }) {
  const entry =
    row.entry_low !== null && row.entry_high !== null
      ? `${rp(row.entry_low)}–${fmtNum(row.entry_high)}`
      : rp(row.entry_ref);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wide">Entry</p>
        <p className="font-semibold tabular-nums">{entry}</p>
      </div>
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wide">Stop</p>
        <p className="font-semibold tabular-nums text-down">{rp(row.stop)}</p>
      </div>
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wide">Target</p>
        <p className="font-semibold tabular-nums text-up">{rp(row.target)}</p>
      </div>
      <div>
        <p className="text-muted text-[10px] uppercase tracking-wide">R/R · Posisi</p>
        <p className="font-semibold tabular-nums">
          {row.rr === null ? "-" : row.rr.toFixed(1)} ·{" "}
          {row.position_pct === null ? "-" : `${row.position_pct}% modal`}
        </p>
      </div>
    </div>
  );
}

function CandidateCard({ row }: { row: RecommendationRow }) {
  const metrics = row.metrics;
  return (
    <li className="card card-hover p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={GRADE_BADGE[row.grade] ?? "badge badge-hold"}>
              Grade {row.grade}
            </span>
            <Link
              href={`/keputusan/${row.code}`}
              className="text-base font-semibold hover:underline"
            >
              {row.code}
            </Link>
            <span className="text-muted truncate text-xs">{row.name ?? "-"}</span>
          </div>
          <p className="text-muted mt-1 text-[11px] tabular-nums">
            {row.setup ?? "-"} · horizon {row.horizon_days ?? "-"} hari bursa
            {row.confidence ? ` · keyakinan ${row.confidence}` : ""}
            {metrics?.rsi !== null && metrics?.rsi !== undefined
              ? ` · RSI ${metrics.rsi.toFixed(0)}`
              : ""}
            {metrics?.mom_20d !== null && metrics?.mom_20d !== undefined
              ? ` · mom20 ${fmtPct(metrics.mom_20d)}`
              : ""}
            {metrics?.value !== null && metrics?.value !== undefined
              ? ` · nilai ${fmtCompact(metrics.value)}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none tabular-nums">{row.score.toFixed(0)}</p>
          <p className="text-muted text-[10px] uppercase tracking-wide">skor</p>
        </div>
      </div>

      <div className="mt-3">
        <LevelRow row={row} />
      </div>

      {row.patterns.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {row.patterns.map((p) => (
            <span key={p} className="badge badge-hold">
              {PATTERN_LABEL[p] ?? p}
            </span>
          ))}
          {row.confidence && (
            <span className={`text-[11px] ${CONFIDENCE_TONE[row.confidence] ?? "text-muted"}`}>
              keyakinan {row.confidence}
            </span>
          )}
        </div>
      )}

      {row.reasons.length > 0 && (
        <ul className="text-muted mt-2 list-inside list-disc space-y-0.5 text-[11px] leading-snug">
          {row.reasons.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {row.warnings.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-[var(--warn)]">
          {row.warnings.slice(0, 2).map((w) => (
            <li key={w} className="flex gap-1">
              <ShieldAlert size={12} className="mt-0.5 shrink-0" aria-hidden />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
      {row.entry_note && (
        <p className="text-muted mt-2 text-[11px] leading-snug">{row.entry_note}</p>
      )}

      <div className="mt-3 flex gap-3 text-[11px]">
        <Link href={`/keputusan/${row.code}`} className="hover:underline">
          Ruang Keputusan →
        </Link>
        <Link href={`/stock/${row.code}`} className="hover:underline">
          Detail teknikal →
        </Link>
      </div>
    </li>
  );
}

function TrackRecord({ track }: { track: RecommendationTrack }) {
  const [horizon, setHorizon] = useState<number>(track.horizons[0] ?? 5);
  const rows = useMemo(
    () => track.by_grade.filter((r) => r.horizon === horizon),
    [track.by_grade, horizon],
  );
  if (!track.candidates) {
    return (
      <EmptyState
        message={
          track.reason ??
          "Belum ada kandidat tercatat — jalankan `idx recommendations` untuk mengisi log."
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-[11px]">Horizon:</span>
        {track.horizons.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              h === horizon
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-muted hover:bg-white/[0.06]"
            }`}
          >
            {h} hari
          </button>
        ))}
        <span className="text-muted ml-auto text-[11px] tabular-nums">
          {track.candidates} kandidat · {track.first_date} → {track.last_date}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Grade</th>
              <th className="text-right">Sampel</th>
              <th className="text-right">Hit rate</th>
              <th className="text-right">Mean fwd</th>
              <th className="text-right">Abnormal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.grade}>
                <td>
                  <span className={GRADE_BADGE[r.grade] ?? "badge badge-hold"}>
                    {r.grade}
                  </span>
                </td>
                <td className="text-right tabular-nums">{r.n}</td>
                <td className="text-right tabular-nums">
                  {r.hit_rate === null ? "-" : `${(r.hit_rate * 100).toFixed(0)}%`}
                </td>
                <td className={`text-right tabular-nums ${trendClass(r.mean_fwd)}`}>
                  {r.mean_fwd === null ? "-" : `${(r.mean_fwd * 100).toFixed(2)}%`}
                </td>
                <td className={`text-right tabular-nums ${trendClass(r.mean_abnormal)}`}>
                  {r.mean_abnormal === null
                    ? "-"
                    : `${(r.mean_abnormal * 100).toFixed(2)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {track.recent.length > 0 && (
        <div>
          <p className="text-muted mb-1.5 text-[11px] font-semibold uppercase tracking-wide">
            Kandidat terbaru (return sudah terealisasi)
          </p>
          <ul className="text-[11px]">
            {track.recent.slice(0, 6).map((r) => (
              <li
                key={`${r.code}-${r.date}`}
                className="flex items-center justify-between border-b border-[var(--border)] py-1 last:border-0 tabular-nums"
              >
                <span>
                  <span className={GRADE_BADGE[r.grade] ?? "badge badge-hold"}>{r.grade}</span>{" "}
                  <span className="font-medium">{r.code}</span>{" "}
                  <span className="text-muted">{r.date}</span>
                </span>
                <span className="flex gap-3">
                  <span className={trendClass(r.fwd_5)}>h5 {fmtPct((r.fwd_5 ?? 0) * 100)}</span>
                  <span className={trendClass(r.fwd_10)}>
                    h10 {fmtPct((r.fwd_10 ?? 0) * 100)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RekomendasiPage() {
  const [minGrade, setMinGrade] = useState<"A" | "B" | "C">("C");
  const [limit, setLimit] = useState(20);
  const { data, error, isLoading } = useRecommendations(limit, minGrade);
  const { data: track } = useRecommendationTrack();

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Rekomendasi <span className="gradient-text">Beli</span>
        </h1>
        <p className="text-muted mt-0.5 flex items-center gap-2 text-sm">
          Kandidat beli se-pasar lengkap dengan level masuk, stop, target, dan R/R
          — diurutkan dari bukti terkuat.
          <LastUpdated sessionDate={data?.date} updatedAt={data?.generated_at} />
        </p>
      </div>

      <RegimeBanner />

      {error ? (
        <ErrorState message="Gagal memuat rekomendasi. Pastikan backend & database hidup." />
      ) : (
        <>
          {data && <LayerStrip layers={data.layers} />}

          <Card
            title={
              <>
                <Target size={15} aria-hidden /> Papan Kandidat
              </>
            }
            subtitle={
              data
                ? `${data.total_candidates} kandidat lolos gate dari ${data.scanned} emiten dipindai`
                : undefined
            }
            info="Tiap kandidat wajib punya level pembatalan (stop) yang bisa dihitung — kalau tidak, emiten tidak ditampilkan. Skor hanya digerakkan lapisan yang terukur (walk-forward); lapisan yang belum lolos gate tidak ikut. Grade = peringkat relatif di dalam pool hari itu (A 2% · B 10% · C 25% teratas), bukan probabilitas. Bukti pola smart money ditampilkan sebagai alasan, tapi belum menimbang skor karena datanya belum cukup panjang. Alat bantu riset, bukan rekomendasi keuangan."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  {(["A", "B", "C"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setMinGrade(g)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        g === minGrade
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border)] text-muted hover:bg-white/[0.06]"
                      }`}
                      title={g === "A" ? "Hanya grade A" : `Grade ${g} ke atas`}
                    >
                      {g === "A" ? "A saja" : `${g} ke atas`}
                    </button>
                  ))}
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-[11px]"
                  aria-label="Jumlah kandidat"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} baris
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : data.rows.length === 0 ? (
              <EmptyState
                message={
                  minGrade === "A"
                    ? "Tidak ada kandidat grade A hari ini — turunkan filter ke B atau C untuk melihat kandidat lain."
                    : "Tidak ada kandidat yang lolos gate hari ini."
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.rows.map((row) => (
                  <CandidateCard key={row.code} row={row} />
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={
              <>
                <Crosshair size={15} aria-hidden /> Track Record Kandidat
              </>
            }
            subtitle="Seberapa sering kandidat ini benar-benar berbuah — diukur, bukan diklaim"
            info="Setiap kandidat dicatat lalu dinilai di close T+1 (disiplin backtest), return diukur per horizon lalu dibandingkan return pasar equal-weight (abnormal). Grade = peringkat relatif di dalam pool hari itu (A 2% · B 10% · C 25% teratas), bukan probabilitas; kalau tabel ini tidak menunjukkan grade tinggi selalu lebih baik, itu memang temuan apa adanya — bukan alasan menyembunyikannya. Sampel kecil dibaca sekilas saja."
          >
            {track ? <TrackRecord track={track} /> : <Skeleton className="h-40 w-full" />}
          </Card>
        </>
      )}

      <div className="text-muted flex items-start gap-2 text-[11px] leading-snug">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          Skor menyusun ulang data yang sudah tersimpan (sinyal teknikal ber-track
          record, pola jejak smart money, dan — bila tervalidasi — faktor IC serta
          aliran broker). Entry/stop/target adalah level referensi dari harga,
          bukan janji. Ukuran posisi = risiko 1% modal per posisi dibagi jarak
          stop, dibatasi 25% modal. Keputusan akhir tetap milik kamu.
        </p>
      </div>
    </main>
  );
}
