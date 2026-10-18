"use client";

import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { fmtNum, fmtNum1 } from "@/lib/format";
import { useStockRecommendation } from "@/lib/hooks";
import { asNumber, portfolioQuery, usePortfolio } from "@/lib/portfolio";
import type { PositionPlan, RecommendationRow, StockRecommendation } from "@/lib/types";

/**
 * Panel rencana posisi di halaman emiten (permukaan B, spec P5).
 *
 * Memakai `usePortfolio` yang sama dengan strip di papan, jadi angka modal dan
 * risiko yang diketik di satu halaman terbaca di halaman lain lewat localStorage.
 * Angka rencananya sendiri datang dari backend (fungsi yang sama dengan papan),
 * bukan dihitung ulang di klien.
 */

const rp = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

/** Plafon ditulis apa adanya; `null` = memang tidak berlaku (bukan nol). */
const plafon = (v: number | null | undefined) =>
  v === null || v === undefined ? "tidak berlaku" : `${fmtNum(v)}%`;

/** Harga beli: rentang bila ada, kalau tidak harga acuan. */
function hargaBeli(row: RecommendationRow): string {
  if (row.entry_low !== null && row.entry_high !== null) {
    return `${rp(row.entry_low)} – ${fmtNum(row.entry_high)}`;
  }
  return rp(row.entry_ref);
}

/**
 * Sebab penahanan memakai kalimat backend sendiri (spec D1 untuk data basi,
 * spec 6.5/Q5 untuk gerbang rezim). `gate.reason` sudah diawali "rezim menolak",
 * jadi di sini tidak diberi awalan yang mengulang maksudnya.
 */
function sebabTahan(rec: StockRecommendation): string {
  if (rec.gate?.blocked) return rec.gate.reason ?? "kondisi pasar belum mendukung";
  return rec.freshness?.reason ?? "data sesi ini belum segar";
}

function Field({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-muted text-[11px]">
        {label}
      </label>
      <input
        id={id}
        className="input mt-1 w-full tabular-nums"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        autoComplete="off"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TabelRencana({ plan, stop }: { plan: PositionPlan; stop: number | null }) {
  // Sebab wajib terbaca begitu angka bisa menyesatkan: ada plafon memotong,
  // porsi jatuh ke nol, atau modal belum diisi sehingga rupiah dan lot kosong
  // (D14/R4: angka nol tidak boleh tampil tanpa sebab). Saat porsi penuh
  // dipakai apa adanya, catatannya cuma "tidak ada plafon yang memotong".
  const sebabPerlu =
    plan.binding_cap !== null || plan.pct === 0 || plan.lots === null || plan.lots === 0;
  return (
    <>
      <table className="data-table mt-3 max-w-sm">
        <tbody>
          <tr>
            <td className="text-muted">Porsi</td>
            <td className="text-right font-semibold tabular-nums">{fmtNum1(plan.pct)}% modal</td>
          </tr>
          <tr>
            <td className="text-muted">Nilai beli</td>
            <td className="text-right tabular-nums">{rp(plan.rupiah)}</td>
          </tr>
          <tr>
            <td className="text-muted">Jumlah lot</td>
            <td className="text-right tabular-nums">
              {plan.lots === null ? "-" : `${fmtNum(plan.lots)} lot`}
            </td>
          </tr>
          <tr>
            <td className="text-muted">Rugi maksimum</td>
            <td className="text-down text-right font-semibold tabular-nums">
              {rp(plan.risk_rupiah)}
            </td>
          </tr>
          <tr>
            <td className="text-muted">Plafon likuiditas</td>
            <td className="text-right tabular-nums">{plafon(plan.caps?.liquidity)}</td>
          </tr>
          <tr>
            <td className="text-muted">Plafon rezim</td>
            <td className="text-right tabular-nums">{plafon(plan.caps?.regime)}</td>
          </tr>
        </tbody>
      </table>
      {sebabPerlu && (
        <p className="text-[var(--warn)] mt-2 text-xs leading-snug" role="status">
          {plan.note}
        </p>
      )}
      <p className="text-[var(--warn)] mt-3 border-t border-dashed border-[var(--border)] pt-3 text-xs leading-snug">
        Rencana batal kalau harga menembus {rp(stop)}. Di bawah level itu tidak ada menambah posisi.
      </p>
    </>
  );
}

function TabelLevel({ rec, row }: { rec: StockRecommendation; row: RecommendationRow }) {
  return (
    <>
      <p className="text-[var(--warn)] mt-3 text-xs leading-snug" role="status">
        Ukuran posisi ditahan ({sebabTahan(rec)}). Yang tetap tampil cuma levelnya.
      </p>
      <table className="data-table mt-3 max-w-sm">
        <tbody>
          <tr>
            <td className="text-muted">Harga beli</td>
            <td className="text-right tabular-nums">{hargaBeli(row)}</td>
          </tr>
          <tr>
            <td className="text-muted">Batas rugi</td>
            <td className="text-down text-right tabular-nums">{rp(row.stop)}</td>
          </tr>
          <tr>
            <td className="text-muted">Target</td>
            <td className="text-up text-right tabular-nums">{rp(row.target)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export function PositionPlanPanel({ code }: { code: string }) {
  const { state, setField } = usePortfolio();
  const query = portfolioQuery(state);
  const { data: rec, error, isLoading, mutate } = useStockRecommendation(code, query);

  const modal = asNumber(state.modal);
  const risk = asNumber(state.riskPct);
  const modalSalah = modal !== null && modal <= 0;
  const riskSalah = risk !== null && risk <= 0;

  const candidate = rec?.candidate ?? null;
  const plan = candidate?.plan ?? null;

  return (
    <section className="card p-4" aria-labelledby="rencana-posisi-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="rencana-posisi-panel" className="text-sm font-semibold">
          Rencana posisi
        </h2>
        <p className="text-muted text-[11px] leading-snug">
          Angka ini kamu isi sendiri, bukan catatan posisi nyata. Tersimpan di browser ini saja.
        </p>
      </div>

      <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
        <Field
          id="panel-modal"
          label="Modal (Rp)"
          value={state.modal}
          invalid={modalSalah}
          onChange={(v) => setField("modal", v)}
        />
        <Field
          id="panel-risk"
          label="Risiko per transaksi (%)"
          value={state.riskPct}
          invalid={riskSalah}
          onChange={(v) => setField("riskPct", v)}
        />
      </div>
      {risk === null && (
        <p className="text-muted mt-1 text-[11px] leading-snug">
          Risiko kosong: backend memakai 1% per transaksi.
        </p>
      )}
      {(modalSalah || riskSalah) && (
        <p className="text-[var(--warn)] mt-1 text-[11px] leading-snug" role="status">
          Isi angka lebih dari 0.
        </p>
      )}

      {error ? (
        <div className="mt-3">
          <ErrorState
            message={`Gagal memuat rencana posisi: ${error.message}`}
            onRetry={() => mutate()}
          />
        </div>
      ) : isLoading && !rec ? (
        <Skeleton className="mt-3 h-40 w-full" />
      ) : !rec ? (
        <div className="mt-3">
          <EmptyState message="Data emiten ini belum bisa dimuat." />
        </div>
      ) : !candidate ? (
        <div className="mt-3">
          <EmptyState
            message={rec.reason ?? "Belum ada kandidat beli untuk emiten ini pada sesi terakhir."}
          />
        </div>
      ) : candidate.withheld ? (
        <TabelLevel rec={rec} row={candidate} />
      ) : plan === null || plan.pct === null ? (
        <div className="mt-3">
          <EmptyState message={plan?.note ?? "Rencana ukuran tidak bisa dihitung dari level ini."} />
        </div>
      ) : (
        <TabelRencana plan={plan} stop={candidate.stop} />
      )}
    </section>
  );
}
