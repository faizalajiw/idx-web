"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Award, List, Lightbulb, ShieldAlert, ChevronDown } from "lucide-react";
import { useRecommendations, useRecommendationTrack } from "@/lib/hooks";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { RegimeBanner } from "@/components/RegimeBanner";
import { TickerLogo } from "@/components/TickerLogo";
import { fmtNum, fmtPct, fmtCompact, trendClass } from "@/lib/format";
import type {
  RecommendationRow,
  RecommendationLayerStatus,
  RecommendationTrack,
} from "@/lib/types";

type Grade = "A" | "B" | "C";

/** Grade ditampilkan sebagai bahasa sehari-hari; kode A/B/C tetap dipakai untuk logika. */
const GRADE_META: Record<Grade, { label: string; hint: string; badge: string }> = {
  A: { label: "Teratas", hint: "Peringkat paling kuat hari ini", badge: "badge badge-buy" },
  B: { label: "Bagus", hint: "Di bawah yang teratas, masih kuat", badge: "badge badge-warn" },
  C: { label: "Cadangan", hint: "Layak dipantau, bukan prioritas", badge: "badge badge-hold" },
};

const SETUP_LABEL: Record<string, string> = {
  pullback: "Turun sebentar lalu memantul",
  breakout: "Menembus area tertinggi",
  trend: "Sedang tren naik",
  netral: "Belum ada pola jelas",
};

const PATTERN_LABEL: Record<string, string> = {
  silent_accumulation: "Ada akumulasi diam-diam",
  initiation: "Volume & asing mulai masuk",
  distribution_on_rally: "Ada pelepasan saat naik",
  silent_distribution: "Ada pelepasan diam-diam",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  tinggi: "Keyakinan tinggi",
  sedang: "Keyakinan sedang",
  lemah: "Keyakinan rendah",
};

const rp = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : `${(v * 100).toFixed(2)}%`;

const FILTERS: { grade: Grade; label: string; icon: typeof Crown }[] = [
  { grade: "A", label: "Teratas", icon: Crown },
  { grade: "B", label: "Teratas + Bagus", icon: Award },
  { grade: "C", label: "Semua", icon: List },
];

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-muted text-[11px]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function CandidateCard({ row }: { row: RecommendationRow }) {
  const grade = GRADE_META[row.grade as Grade] ?? GRADE_META.C;
  const entry =
    row.entry_low !== null && row.entry_high !== null
      ? `${rp(row.entry_low)} – ${fmtNum(row.entry_high)}`
      : rp(row.entry_ref);
  const m = row.metrics;
  const why = row.reasons[0];

  return (
    <li className="card card-hover flex h-full flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TickerLogo code={row.code} size={40} />
          <div className="min-w-0">
            <Link href={`/keputusan/${row.code}`} className="text-base font-bold hover:underline">
              {row.code}
            </Link>
            <p className="text-muted truncate text-xs">{row.name ?? "-"}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={grade.badge}>{grade.label}</span>
          <p className="text-muted mt-1 text-[11px] tabular-nums">Skor {row.score.toFixed(0)}</p>
        </div>
      </div>

      {why && (
        <p className="mt-3 flex gap-2 text-xs leading-relaxed">
          <Lightbulb size={14} className="text-muted mt-0.5 shrink-0" aria-hidden />
          <span>{why}</span>
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-white/[0.03] p-3">
        <Stat label="Harga beli" value={entry} />
        <Stat label="Batas rugi" value={rp(row.stop)} tone="text-down" />
        <Stat label="Target" value={rp(row.target)} tone="text-up" />
      </div>

      {row.warnings.length > 0 && (
        <p className="mt-3 flex gap-1.5 text-[11px] leading-snug text-[var(--warn)]">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{row.warnings[0]}</span>
        </p>
      )}

      <details className="group mt-auto pt-3">
        <summary className="text-muted flex cursor-pointer list-none items-center gap-1 text-[11px] hover:text-[var(--fg)]">
          <ChevronDown
            size={13}
            className="transition-transform group-open:rotate-180"
            aria-hidden
          />
          Lihat detail
        </summary>
        <div className="mt-3 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Pola" value={row.setup ? (SETUP_LABEL[row.setup] ?? row.setup) : "-"} />
            <Stat
              label="Perkiraan waktu"
              value={row.horizon_days ? `±${row.horizon_days} hari bursa` : "-"}
            />
            <Stat
              label="Untung vs rugi"
              value={row.rr === null ? "-" : `1 : ${row.rr.toFixed(1)}`}
            />
            <Stat
              label="Saran porsi"
              value={row.position_pct === null ? "-" : `${row.position_pct}% modal`}
            />
          </div>
          {row.confidence && (
            <p className="text-muted">{CONFIDENCE_LABEL[row.confidence] ?? row.confidence}</p>
          )}
          {row.patterns.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {row.patterns.map((p) => (
                <span key={p} className="badge badge-hold">
                  {PATTERN_LABEL[p] ?? p}
                </span>
              ))}
            </div>
          )}
          {row.reasons.length > 1 && (
            <ul className="text-muted list-inside list-disc space-y-0.5 leading-snug">
              {row.reasons.slice(1, 4).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {row.warnings.length > 1 && (
            <ul className="space-y-0.5 leading-snug text-[var(--warn)]">
              {row.warnings.slice(1, 3).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {m && (
            <p className="text-muted tabular-nums">
              RSI {m.rsi === null ? "-" : m.rsi.toFixed(0)} · Momentum 20 hari{" "}
              {m.mom_20d === null ? "-" : fmtPct(m.mom_20d)} · Nilai transaksi{" "}
              {m.value === null ? "-" : fmtCompact(m.value)}
            </p>
          )}
          {row.entry_note && <p className="text-muted leading-snug">{row.entry_note}</p>}
          <div className="flex gap-4 pt-1 text-[11px]">
            <Link href={`/keputusan/${row.code}`} className="font-medium hover:underline">
              Ruang Keputusan →
            </Link>
            <Link href={`/stock/${row.code}`} className="font-medium hover:underline">
              Grafik &amp; teknikal →
            </Link>
          </div>
        </div>
      </details>
    </li>
  );
}

function LayerList({ layers }: { layers: RecommendationLayerStatus }) {
  const items = [
    { on: true, label: "Pola harga dan volume", note: "Selalu dipakai" },
    { on: layers.factor, label: "Faktor saham yang terbukti", note: layers.factor_note },
    { on: layers.broker, label: "Aliran dana broker", note: layers.broker_note },
  ];
  return (
    <div className="mt-3 space-y-2 text-xs">
      {items.map((it) => (
        <div key={it.label} className="flex items-start gap-2">
          <span
            className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: it.on ? "var(--up)" : "var(--border)" }}
            aria-hidden
          />
          <div>
            <p className={it.on ? "font-medium" : "text-muted font-medium"}>
              {it.label} · {it.on ? "ikut dihitung" : "belum ikut dihitung"}
            </p>
            {it.note && <p className="text-muted">{it.note}</p>}
          </div>
        </div>
      ))}
      {layers.note && <p className="text-muted pt-1 leading-snug">{layers.note}</p>}
    </div>
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
          "Belum ada riwayat rekomendasi. Data akan terisi otomatis setelah sistem berjalan beberapa hari."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted text-xs">Cek hasilnya setelah:</span>
        {track.horizons.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            aria-pressed={h === horizon}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              h === horizon
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-muted hover:bg-white/[0.06]"
            }`}
          >
            {h} hari bursa
          </button>
        ))}
        <span className="text-muted ml-auto text-[11px] tabular-nums">
          {track.candidates} rekomendasi tercatat · {track.first_date} s/d {track.last_date}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const grade = GRADE_META[r.grade as Grade] ?? GRADE_META.C;
          const hit = r.hit_rate === null ? null : Math.round(r.hit_rate * 100);
          const beat = r.mean_abnormal === null ? null : r.mean_abnormal >= 0;
          return (
            <div key={r.grade} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <span className={grade.badge}>{grade.label}</span>
                <span className="text-muted text-[11px] tabular-nums">{r.n} sampel</span>
              </div>
              <p className="text-muted mt-3 text-xs">Dari 100 rekomendasi, yang naik:</p>
              <p className="text-3xl font-bold tabular-nums">
                {hit === null ? "-" : hit}
                <span className="text-muted text-base font-semibold"> / 100</span>
              </p>
              {hit !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
                  <div className="bg-up h-full rounded-full" style={{ width: `${hit}%` }} />
                </div>
              )}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Rata-rata perubahan</span>
                  <span className={`font-semibold tabular-nums ${trendClass(r.mean_fwd)}`}>
                    {pct(r.mean_fwd)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Dibanding pasar</span>
                  <span className={`font-semibold tabular-nums ${trendClass(r.mean_abnormal)}`}>
                    {r.mean_abnormal === null
                      ? "-"
                      : `${beat ? "Lebih baik" : "Lebih buruk"} ${pct(Math.abs(r.mean_abnormal))}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-muted text-xs leading-relaxed">
        Hasil masa lalu tidak menjamin hasil ke depan. Sampel kecil sebaiknya dibaca sekilas saja.
      </p>
    </div>
  );
}

export default function RekomendasiPage() {
  const [minGrade, setMinGrade] = useState<Grade>("C");
  const [limit, setLimit] = useState(20);
  const { data, error, isLoading } = useRecommendations(limit, minGrade);
  const { data: track } = useRecommendationTrack();

  const topCount = data?.rows.filter((r) => r.grade === "A").length ?? 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Rekomendasi <span className="gradient-text">Beli</span>
        </h1>
        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          Saham yang menurut sistem paling layak dibeli hari ini, lengkap dengan harga beli, batas
          rugi, dan target. Pilih kandidat, baca alasannya, lalu putuskan sendiri.
        </p>
        <LastUpdated sessionDate={data?.date} updatedAt={data?.generated_at} />
      </header>

      <RegimeBanner />

      {error ? (
        <ErrorState message="Gagal memuat rekomendasi. Pastikan backend & database hidup." />
      ) : (
        <>
          <section className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Stat label="Kandidat hari ini" value={data ? `${data.total_candidates} saham` : "-"} />
            <Stat label="Kategori Teratas" value={data ? `${topCount} saham` : "-"} />
            <Stat label="Emiten dipindai" value={data ? `${data.scanned} saham` : "-"} />
            <Stat label="Data sesi" value={data?.date ?? "-"} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)]">
              <div role="tablist" aria-label="Filter kategori" className="flex flex-wrap gap-1">
                {FILTERS.map(({ grade, label, icon: Icon }) => {
                  const active = grade === minGrade;
                  return (
                    <button
                      key={grade}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMinGrade(grade)}
                      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "border-[var(--accent)] text-[var(--fg)]"
                          : "text-muted border-transparent hover:text-[var(--fg)]"
                      }`}
                    >
                      <Icon size={15} aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
              <label className="text-muted flex items-center gap-2 pb-2 text-xs">
                Tampilkan
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-xs text-[var(--fg)]"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} saham
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-muted text-xs">
              {GRADE_META[minGrade].hint}.
              {minGrade !== "A" &&
                " Teratas: peringkat paling kuat hari itu. Bagus: di bawahnya, masih kuat."}
            </p>

            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : data.rows.length === 0 ? (
              <EmptyState
                message={
                  minGrade === "A"
                    ? "Belum ada saham kategori Teratas hari ini. Coba pilih 'Teratas + Bagus' atau 'Semua'."
                    : "Belum ada saham yang lolos penilaian hari ini."
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.rows.map((row) => (
                  <CandidateCard key={row.code} row={row} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Seberapa akurat sistem ini?</h2>
              <p className="text-muted text-xs">
                Kami cek kembali rekomendasi masa lalu: apakah harganya benar-benar naik?
              </p>
            </div>
            {track ? <TrackRecord track={track} /> : <Skeleton className="h-40 w-full" />}
          </section>

          {data && (
            <details className="card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                Dari mana skor ini berasal?
                <ChevronDown size={16} className="text-muted" aria-hidden />
              </summary>
              <LayerList layers={data.layers} />
            </details>
          )}
        </>
      )}

      <p className="text-muted border-t border-[var(--border)] pt-4 text-xs leading-relaxed">
        Ini alat bantu riset, bukan saran keuangan. Harga beli, batas rugi, dan target adalah acuan
        dari harga, bukan janji. Keputusan akhir tetap ada di tangan kamu.
      </p>
    </main>
  );
}