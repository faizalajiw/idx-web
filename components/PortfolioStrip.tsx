"use client";

import { fmtNum } from "@/lib/format";
import {
  asNumber,
  MAX_EXPOSURE_PCT,
  MAX_OPEN_POSITIONS,
  type PortfolioField,
  type PortfolioState,
} from "@/lib/portfolio";

/** Risiko per transaksi yang dipakai backend (`DEFAULT_RISK_PCT`) bila isian dikosongkan. */
const DEFAULT_RISK_PCT = 1;

interface PortfolioStripProps {
  state: PortfolioState;
  setField: (field: PortfolioField, value: string) => void;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-muted text-[11px]">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${tone ?? ""}`}>{value}</dd>
    </div>
  );
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
    <div>
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

/**
 * Strip portofolio di atas papan kandidat (permukaan C, spec P5): menjawab
 * "masih boleh masuk berapa nama lagi?". Angka porsi sendiri ada di tiap kartu.
 */
export function PortfolioStrip({ state, setField }: PortfolioStripProps) {
  const modal = asNumber(state.modal);
  const risk = asNumber(state.riskPct);
  const open = asNumber(state.openPositions);
  const exposure = asNumber(state.exposurePct);

  const modalSalah = modal !== null && modal <= 0;
  const riskSalah = risk !== null && risk <= 0;
  const openSalah = open !== null && open < 0;
  const eksposurSalah = exposure !== null && exposure < 0;

  const modalKosong = state.modal.trim() === "";
  const risikoEfektif = risk === null || riskSalah ? DEFAULT_RISK_PCT : risk;
  const ruangSisa =
    exposure === null || eksposurSalah ? null : Math.max(0, MAX_EXPOSURE_PCT - exposure);
  const serentak =
    open === null || openSalah ? null : Math.round(open * risikoEfektif * 10) / 10;

  return (
    <section className="card p-4" aria-labelledby="rencana-posisi-judul">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="rencana-posisi-judul" className="text-sm font-semibold">
          Rencana posisi
        </h2>
        <p className="text-muted text-[11px] leading-snug">
          Angka ini kamu isi sendiri, bukan catatan posisi nyata. Tersimpan di browser ini saja.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field
          id="ml-modal"
          label="Modal (Rp)"
          value={state.modal}
          invalid={modalSalah}
          onChange={(v) => setField("modal", v)}
        />
        <Field
          id="ml-risk"
          label="Risiko per transaksi (%)"
          value={state.riskPct}
          invalid={riskSalah}
          onChange={(v) => setField("riskPct", v)}
        />
        <Field
          id="ml-open"
          label="Posisi terbuka"
          value={state.openPositions}
          invalid={openSalah}
          onChange={(v) => setField("openPositions", v)}
        />
        <Field
          id="ml-exposure"
          label="Eksposur sekarang (%)"
          value={state.exposurePct}
          invalid={eksposurSalah}
          onChange={(v) => setField("exposurePct", v)}
        />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <Metric
          label="Modal"
          value={modal === null || modalSalah ? "-" : `Rp ${fmtNum(modal)}`}
        />
        <Metric
          label="Risiko per transaksi"
          value={riskSalah ? "-" : `${fmtNum(risikoEfektif)}%${risk === null ? " (bawaan)" : ""}`}
        />
        <Metric
          label="Posisi terbuka"
          value={open === null || openSalah ? "-" : `${fmtNum(open)} dari ${MAX_OPEN_POSITIONS}`}
          tone={open !== null && open > MAX_OPEN_POSITIONS ? "text-[var(--warn)]" : undefined}
        />
        <Metric
          label="Eksposur"
          value={exposure === null || eksposurSalah ? "-" : `${fmtNum(exposure)}%`}
        />
        <Metric
          label="Ruang sisa"
          value={ruangSisa === null ? "-" : `${fmtNum(ruangSisa)}%`}
          tone={ruangSisa === 0 ? "text-[var(--warn)]" : undefined}
        />
        <Metric
          label="Risiko serentak"
          value={serentak === null ? "-" : `${fmtNum(serentak)}%`}
        />
      </dl>
      <p className="text-muted mt-1 text-[11px] leading-snug">
        Risiko serentak turunan dari posisi terbuka x risiko per transaksi, bukan catatan.
      </p>

      {modalKosong && (
        <p className="text-muted mt-2 text-[11px] leading-snug">
          Isi modal untuk melihat rupiah, lot, dan rugi maksimum. Tanpa modal, papan menampilkan
          persen saja.
        </p>
      )}
      {(modalSalah || riskSalah) && (
        <p className="text-[var(--warn)] mt-2 text-[11px] leading-snug" role="status">
          Isi angka lebih dari 0.
        </p>
      )}
      {(openSalah || eksposurSalah) && (
        <p className="text-[var(--warn)] mt-2 text-[11px] leading-snug" role="status">
          Isi angka 0 atau lebih.
        </p>
      )}
      <p className="text-muted mt-2 text-[11px] leading-snug">
        Ini risiko rencana, bukan jaminan kerugian maksimum harian: harga bisa melewati stop.
      </p>
    </section>
  );
}
