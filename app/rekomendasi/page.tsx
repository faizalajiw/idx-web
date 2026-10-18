"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Target, Crown, Award, List, Lightbulb, ShieldAlert, ChevronDown } from "lucide-react";
import { useRecommendations, useRecommendationTrack } from "@/lib/hooks";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { RegimeBanner } from "@/components/RegimeBanner";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { TickerLogo } from "@/components/TickerLogo";
import { PortfolioStrip } from "@/components/PortfolioStrip";
import { fmtNum, fmtNum1, fmtPct, fmtCompact, trendClass } from "@/lib/format";
import { asNumber, portfolioQuery, usePortfolio } from "@/lib/portfolio";
import type {
  PositionPlan,
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

/** Label skor (spec D3) - beda dari `confidence` pola buru di atas. */
const SCORE_CONFIDENCE_LABEL: Record<string, string> = {
  meyakinkan: "Meyakinkan",
  "belum terbukti": "Belum terbukti",
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

/** Nama plafon dalam bahasa manusia (kunci `binding_cap` dari backend). */
const PLAFON_LABEL: Record<string, string> = {
  per_name: "per nama",
  liquidity: "likuiditas",
  regime: "rezim",
  portfolio: "portofolio",
};

/**
 * Baris rencana posisi di kartu papan (permukaan A, spec P5): porsi, nilai beli,
 * lot, dan rugi kalau stop kena. Tanpa modal hanya porsi persen yang tampil -
 * rupiah dan lot yang dikarang lebih buruk daripada tidak ada.
 */
function PlanLine({ plan, modal }: { plan: PositionPlan; modal: number | null }) {
  if (plan.pct === null) return null;
  const plafon = plan.binding_cap ? (PLAFON_LABEL[plan.binding_cap] ?? plan.binding_cap) : null;
  const adaModal = plan.rupiah !== null;
  const adaLot = adaModal && plan.lots !== null && plan.lots > 0;
  // Risiko yang berlaku = rugi stop dibagi modal, dibulatkan satu desimal seperti
  // angka lain di layar. Angkanya dari backend, jadi pembulatan lot sudah ikut -
  // bukan persen yang diminta dibulatkan lagi.
  const rasio = adaLot && modal !== null && modal > 0 && plan.risk_rupiah !== null
    ? (plan.risk_rupiah / modal) * 100
    : null;
  const risikoModal = rasio === null ? null : fmtNum(Math.round(rasio * 10) / 10);
  const catatan = plan.lots === 0 || plan.binding_cap !== null ? plan.note : null;
  const sisa = adaLot
    ? ` · ${rp(plan.rupiah)} · ${fmtNum(plan.lots)} lot`
    : adaModal
      ? ""
      : " modal";
  const sebutPlafon = plafon ? ` (plafon ${plafon})` : "";

  return (
    <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-xs">
      <p className="font-semibold tabular-nums">
        Porsi {fmtNum1(plan.pct)}%{sebutPlafon}
        {sisa}
      </p>
      {adaLot && (
        <p className="text-muted mt-0.5 tabular-nums">
          stop kena = rugi {rp(plan.risk_rupiah)}
          {risikoModal ? ` (${risikoModal}% modal)` : ""}
        </p>
      )}
      {catatan && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--warn)" }}>
          {catatan}
        </p>
      )}
    </div>
  );
}

function CandidateCard({
  row,
  withheldNote,
  modal,
}: {
  row: RecommendationRow;
  withheldNote: string | null;
  /** Modal pemilik (Rp) dari strip portofolio; `null` = belum diisi. */
  modal: number | null;
}) {
  const grade = GRADE_META[row.grade as Grade] ?? GRADE_META.C;
  // Verdict bisa ditahan karena dua sebab berbeda: data basi (spec D1) atau rezim
  // yang eksplisit menolak (spec 6.5/Q5). Grade & ukuran posisi jadi `null` -
  // jangan render "null", dan jangan salah menyebut sebabnya.
  const withheld = row.withheld === true || row.grade === null;
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
          {withheld ? (
            <span className="badge badge-hold">Ditahan</span>
          ) : (
            <span className={grade.badge}>{grade.label}</span>
          )}
          {/* Skala yang bisa dibandingkan (spec D3 poin 1): peringkat persentil di
              antara KANDIDAT yang lolos penyaringan hari itu - bukan kolam likuiditas
              (itu `pool_size`), dan bukan skor mentah 0-100 yang gampang dibaca
              sebagai keyakinan. */}
          <p className="text-muted mt-1 text-[11px] tabular-nums">
            {row.percentile === null || row.percentile === undefined
              ? "-"
              : `Peringkat ${Math.round(row.percentile)}% dari kandidat`}
          </p>
        </div>
      </div>

      {why && (
        <p className="mt-3 flex gap-2 text-xs leading-relaxed">
          <Lightbulb size={14} className="text-muted mt-0.5 shrink-0" aria-hidden />
          <span>{why}</span>
        </p>
      )}

      {withheld && (
        <p
          className="mt-3 flex gap-1.5 text-[11px] leading-snug"
          style={{ color: "var(--warn)" }}
          role="status"
        >
          <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{withheldNote ?? "Verdict ditahan: grade & rencana posisi belum bisa dipakai."}</span>
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-white/[0.03] p-3">
        <Stat label="Harga beli" value={entry} />
        <Stat label="Batas rugi" value={rp(row.stop)} tone="text-down" />
        <Stat label="Target" value={rp(row.target)} tone="text-up" />
      </div>

      {!withheld && row.plan && <PlanLine plan={row.plan} modal={modal} />}

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
              label="Vs riwayat sendiri"
              value={
                row.own_percentile === null || row.own_percentile === undefined
                  ? "-"
                  : `${Math.round(row.own_percentile)}%`
              }
            />
            <Stat
              label="Keyakinan skor"
              value={
                row.score_confidence
                  ? (SCORE_CONFIDENCE_LABEL[row.score_confidence] ?? row.score_confidence)
                  : "-"
              }
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
          {row.rank_basis && row.rank_basis.order.length > 0 && (
            <p className="text-muted text-[11px] leading-snug">
              Urutan saat skor seri: {row.rank_basis.order.join(" → ")}.
            </p>
          )}
          <p className="text-muted text-[11px] leading-snug tabular-nums">
            Skor dasar {row.score.toFixed(1)} — angka ini peringkat mentah, bukan ukuran
            keyakinan.
          </p>
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
  // Empat angka keadaan pemilik (modal, risiko, posisi terbuka, eksposur) hidup
  // di localStorage browser ini dan hanya dikirim sebagai query - backend tidak
  // pernah menyimpannya, dan cache papan tidak dipecah olehnya.
  const { state: portfolio, setField } = usePortfolio();
  const query = portfolioQuery(portfolio);
  const modal = asNumber(portfolio.modal);
  const { data, error, isLoading } = useRecommendations(limit, minGrade, query);
  const { data: all } = useRecommendations(100, "C", query);
  const { data: track } = useRecommendationTrack();

  const topCount = data?.rows.filter((r) => r.grade === "A").length ?? 0;
  // Dua sebab penahanan yang berbeda (spec D1 vs 6.5/Q5): kalimatnya tidak boleh
  // saling tukar - yang satu soal data yang belum masuk, yang satu soal rezim.
  const withheldNote = data?.gate?.blocked
    ? `Rezim sedang menolak: grade & rencana posisi ditahan sampai kondisinya berubah. ${data.gate.reason}.`
    : data?.withheld
      ? `${data.freshness?.reason ?? "Data sesi ini belum segar."} Grade dan rencana posisi ditahan sampai datanya masuk.`
      : null;
  // Verdict ditahan = hitungan grade tidak lagi bermakna: "0" di atas dua puluh
  // kartu yang jelas tampil akan terbaca sebagai halaman rusak. Sembunyikan
  // angkanya, jangan melaporkan nol yang salah.
  const countTidakBermakna = Boolean(data?.gate?.blocked || data?.withheld);
  const tabCount = (grade: Grade) => {
    if (countTidakBermakna) return null;
    const rows = all?.rows ?? [];
    const allowed = grade === "A" ? ["A"] : grade === "B" ? ["A", "B"] : ["A", "B", "C"];
    // Grade `null` = verdict ditahan (spec D1): bukan kandidat, jangan dihitung.
    return all
      ? rows.filter((r) => r.grade !== null && allowed.includes(r.grade)).length
      : null;
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  <Target size={26} className="text-accent" aria-hidden />
                  Rekomendasi <span className="gradient-text">Beli</span>
                </h1>
        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          Saham yang menurut sistem paling layak dibeli hari ini, lengkap dengan harga beli, batas
          rugi, dan target. Pilih kandidat, baca alasannya, lalu putuskan sendiri.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <LastUpdated sessionDate={data?.date} updatedAt={data?.generated_at} />
          <FreshnessBadge basis="panel" freshness={data?.freshness} />
        </div>
        {data?.gate?.blocked && (
          <p className="text-warn text-xs leading-relaxed" role="status">
            Gerbang rezim menahan tawaran baru: {data.gate.reason}. Angka, harga beli, batas rugi,
            dan target tetap tampil — yang ditahan cuma grade dan rencana posisi.
          </p>
        )}
        {data?.withheld && (
          <p className="text-warn text-xs leading-relaxed" role="status">
            {data.freshness?.reason ?? "Data sesi ini belum segar."} Grade dan rencana posisi
            ditahan sampai datanya masuk.
          </p>
        )}
        {data?.gate && data.gate.regime_fresh === false && (
          <p className="text-warn text-xs leading-relaxed" role="status">
            {data.gate.reason} — penanda ini soal seri rezimnya, bukan soal panel saham: papan
            tetap terbuka.
          </p>
        )}
      </header>

      <RegimeBanner />

      <PortfolioStrip state={portfolio} setField={setField} />

      {error ? (
        <ErrorState message="Gagal memuat rekomendasi. Pastikan backend & database hidup." />
      ) : (
        <>
          <section className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
            <Stat label="Kandidat hari ini" value={data ? `${data.total_candidates} saham` : "-"} />
            {/* Kolam = nama yang berhak masuk papan (likuid & konsisten). Yang benar-benar
                dinilai lebih sedikit dari itu, dan yang tampil lebih sedikit lagi. */}
            <Stat
              label="Kolam → tampil"
              value={
                data && data.pool_size != null
                  ? `${data.pool_size} → ${data.rows.length} saham`
                  : "-"
              }
            />
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
                      {tabCount(grade) !== null && (
                        <span className="text-muted rounded-full bg-white/[0.06] px-1.5 text-[11px]">
                          {tabCount(grade)}
                        </span>
                      )}
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
                  <CandidateCard
                    key={row.code}
                    row={row}
                    withheldNote={withheldNote}
                    modal={modal}
                  />
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