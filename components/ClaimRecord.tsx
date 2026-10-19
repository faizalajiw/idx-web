"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  useJournalClaims,
  useJournalHalt,
  useJournalResume,
  useJournalState,
  useJournalSummary,
} from "@/lib/hooks";
import { fmtNum } from "@/lib/format";
import type { JournalClaim, JournalGateState, JournalSummary } from "@/lib/types";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";

/**
 * Blok rekaman klaim mesin (lapis 4) di atas papan kandidat.
 *
 * Mesin menulis klaimnya sendiri tiap sesi bursa, sebelum hasilnya diketahui, lalu
 * hasilnya diperiksa apa adanya. Blok ini menampilkan empat angka buku lebih dulu
 * daripada isinya (spec D11), lalu gerbang yang menahan klaim baru dan tombol
 * untuk menghentikannya sendiri. Angkanya datang dari backend yang sama dengan
 * CLI dan job terjadwal, jadi layar tidak bisa menjanjikan lebih dari yang
 * dicatat mesin.
 *
 * Keadaan gerbang dibaca terpisah dari rekaman: buku yang belum terbaca tidak
 * boleh menyembunyikan keadaan gerbang, dan sebaliknya.
 */

const VERDICT_META: Record<string, { label: string; badge: string }> = {
  terbukti: { label: "Terbukti", badge: "badge badge-buy" },
  "tidak terbukti": { label: "Tidak terbukti", badge: "badge badge-sell" },
  "belum cukup": { label: "Belum cukup bukti", badge: "badge badge-hold" },
};

const STATUS_BADGE: Record<string, string> = {
  terbuka: "badge badge-hold",
  kena_target: "badge badge-buy",
  kena_stop: "badge badge-sell",
  kedaluwarsa: "badge badge-warn",
};

const STATUS_LABEL: Record<string, string> = {
  terbuka: "terbuka",
  kena_target: "kena target",
  kena_stop: "kena stop",
  kedaluwarsa: "kedaluwarsa",
};

const rp = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : `Rp ${fmtNum(v)}`;

/** Abnormal dalam fraksi (0.014 = +1,4%); "-" berarti belum terukur, bukan nol. */
const abn = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "belum terukur"
    : `${v > 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-muted text-[11px]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

/** Tanggal sesi terbaru di buku (ISO, urut leksikografis = urut waktu). */
function sesiTerakhir(summary: JournalSummary): string | null {
  const tanggal = summary.per_session.map((s) => s.trade_date);
  return tanggal.length > 0 ? tanggal.reduce((a, b) => (a > b ? a : b)) : null;
}

function BarisKlaim({ row }: { row: JournalClaim }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] py-1.5 last:border-b-0">
      <span className="font-semibold tabular-nums">{row.code}</span>
      <span className={STATUS_BADGE[row.status] ?? "badge badge-hold"}>
        {STATUS_LABEL[row.status] ?? row.status}
      </span>
      <span className="text-muted tabular-nums">
        stop {rp(row.stop_raw)} · target {rp(row.target_raw)}
      </span>
      <span className="text-muted ml-auto tabular-nums">
        {row.outcome_abn === null ? "hasil belum terukur" : abn(row.outcome_abn)}
      </span>
    </li>
  );
}

/** Tombol halt/resume plus dialog konfirmasi yang bisa ditutup dengan Escape. */
function GerbangKontrol({ state }: { state: JournalGateState }) {
  const [terbuka, setTerbuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pemicuRef = useRef<HTMLButtonElement | null>(null);
  const halt = useJournalHalt();
  const resume = useJournalResume();

  /** Tutup dialog dan kembalikan fokus ke tombol yang membukanya. */
  function tutup() {
    setTerbuka(false);
    pemicuRef.current?.focus();
  }

  useEffect(() => {
    if (!terbuka) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [terbuka]);

  async function kirim() {
    if (sibuk || alasan.trim() === "") return;
    setSibuk(true);
    setGalat(null);
    try {
      await halt(alasan.trim());
      setAlasan("");
      setTerbuka(false);
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal menghentikan klaim");
    } finally {
      setSibuk(false);
    }
  }

  async function bukaLagi() {
    if (sibuk) return;
    setSibuk(true);
    setGalat(null);
    try {
      await resume();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal membuka lagi klaim");
    } finally {
      setSibuk(false);
    }
  }

  if (state.halt.halted) {
    return (
      <div className="space-y-2">
        <p className="text-warn text-xs leading-relaxed tabular-nums" role="status">
          Dihentikan manual oleh {state.halt.by ?? "pemilik"}:{" "}
          {state.halt.reason ?? "tanpa sebab tertulis"}
          {state.halt.at ? ` (${state.halt.at.slice(0, 16).replace("T", " ")} WIB)` : ""}. Mesin
          berhenti menulis klaim baru, bukan menghapus klaim yang sudah ada.
        </p>
        <button
          type="button"
          className="btn btn-ghost min-h-11 w-full sm:w-auto"
          onClick={() => void bukaLagi()}
          disabled={sibuk}
        >
          {sibuk ? "Membuka…" : "Buka lagi penulisan klaim"}
        </button>
        {galat && <ErrorState message={galat} />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        ref={pemicuRef}
        type="button"
        className="btn btn-ghost min-h-11 w-full sm:w-auto"
        onClick={() => setTerbuka(true)}
      >
        Hentikan penulisan klaim baru
      </button>
      {galat && <ErrorState message={galat} />}

      {terbuka && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="halt-klaim-judul"
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elev)] p-4"
        >
          <h3 id="halt-klaim-judul" className="text-sm font-semibold">
            Hentikan penulisan klaim baru?
          </h3>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Mesin berhenti menulis klaim baru sampai dibuka lagi. Klaim yang sudah ada tidak
            dihapus, dan sebabnya ikut tercatat supaya jelas ini keputusan, bukan kerusakan.
          </p>
          <label className="mt-3 block">
            <span className="text-muted text-xs">Sebab (wajib)</span>
            <input
              ref={inputRef}
              type="text"
              className="input mt-1 w-full"
              value={alasan}
              placeholder="mis. hasilnya lagi tidak aku percaya"
              onChange={(e) => setAlasan(e.target.value)}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary min-h-11"
              onClick={() => void kirim()}
              disabled={sibuk || alasan.trim() === ""}
            >
              {sibuk ? "Menghentikan…" : "Ya, hentikan"}
            </button>
            <button
              type="button"
              className="btn btn-ghost min-h-11"
              onClick={tutup}
              disabled={sibuk}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClaimRecord() {
  const { data: summary, error, isLoading } = useJournalSummary();
  const sesi = useMemo(() => (summary ? sesiTerakhir(summary) : null), [summary]);
  const { data: claims } = useJournalClaims(sesi, 20);
  const { data: state } = useJournalState();

  const verdict = summary?.verdict;
  const meta = verdict ? (VERDICT_META[verdict.status] ?? null) : null;
  const perSesi = useMemo(
    () =>
      [...(summary?.per_session ?? [])].sort((a, b) =>
        b.trade_date.localeCompare(a.trade_date),
      ),
    [summary],
  );
  const celah = state?.gaps ?? [];

  return (
    <Card
      title="Rekaman Klaim Mesin"
      subtitle="Ditulis sebelum hasilnya ada, diperiksa apa adanya"
      info="Tiap sesi bursa mesin menulis klaim untuk 3 sampai 5 nama kategori Teratas, dan menuliskan levelnya sebelum hasilnya diketahui. Rekaman ini yang mengikatnya: kalau aturannya tidak terbukti, mesin berhenti menulis klaim baru alih-alih diam-diam pindah aturan."
      right={
        meta ? (
          <span className={meta.badge} title={verdict?.reason}>
            {meta.label}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Rekaman: satu-satunya bagian yang boleh gagal tanpa menyembunyikan gerbang. */}
        {error ? (
          <ErrorState message={`Gagal memuat rekaman klaim: ${error.message}`} />
        ) : isLoading || !summary ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {summary.note && (
              <p className="text-warn text-xs leading-relaxed">{summary.note}</p>
            )}

            <p className="text-sm font-medium">{summary.record_line}</p>

            {summary.claims === 0 && !summary.note && (
              <p className="text-muted text-xs leading-relaxed">
                Buku ini masih kosong: belum ada klaim yang tertulis. Klaim pertama ditulis job
                terjadwal sesudah sesi bursa tutup, lalu hasilnya diperiksa setelah horizonnya
                berjalan (21 hari bursa).
              </p>
            )}

            {summary.claims > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Klaim tertulis" value={fmtNum(summary.claims)} />
                  <Stat label="Sudah terukur" value={fmtNum(summary.measured_claims)} />
                  <Stat label="Kena target" value={fmtNum(summary.hit_target)} tone="text-up" />
                  <Stat label="Kena stop" value={fmtNum(summary.hit_stop)} tone="text-down" />
                  <Stat
                    label="Rata-rata vs pasar"
                    value={abn(summary.mean_abnormal)}
                    tone={
                      summary.mean_abnormal === null
                        ? "text-muted"
                        : summary.mean_abnormal > 0
                          ? "text-up"
                          : "text-down"
                    }
                  />
                  <Stat label="Sesi terukur" value={fmtNum(summary.sessions)} />
                </div>

                <p className="text-muted text-xs tabular-nums">
                  {fmtNum(summary.open)} masih terbuka · {fmtNum(summary.expired)} kedaluwarsa
                  {summary.horizon_mismatch > 0
                    ? ` · ${fmtNum(summary.horizon_mismatch)} horizonnya tidak cocok`
                    : ""}
                  {" · "}
                  {fmtNum(summary.claim_sessions)} sesi menulis klaim, {fmtNum(summary.sessions)}{" "}
                  sesi sudah terukur. Rata-rata dihitung per sesi dulu, baru antar sesi.
                </p>

                <details>
                  <summary className="text-muted cursor-pointer text-xs">
                    Rincian per sesi{sesi ? ` (terbaru ${sesi})` : ""}
                  </summary>
                  <ul className="mt-2 space-y-0.5 text-xs tabular-nums">
                    {perSesi.slice(0, 5).map((s) => (
                      <li key={s.trade_date} className="flex flex-wrap gap-x-3">
                        <span className="text-muted">{s.trade_date}</span>
                        <span>{fmtNum(s.claims)} klaim</span>
                        <span className="text-muted ml-auto">{abn(s.mean_abnormal)}</span>
                      </li>
                    ))}
                  </ul>
                  {sesi && claims && claims.length > 0 && (
                    <ul className="mt-2">
                      {claims.map((row) => (
                        <BarisKlaim key={`${row.code}-${row.trade_date}`} row={row} />
                      ))}
                    </ul>
                  )}
                </details>
              </>
            )}
          </>
        )}

        {/* Gerbang dibaca terpisah dari rekaman: buku yang belum terbaca tidak boleh
            menyembunyikan keadaan gerbang, dan tombol halt harus tetap bisa dipakai. */}
        {state && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              {state.allowed ? (
                <ShieldCheck size={14} className="text-up shrink-0" aria-hidden />
              ) : (
                <ShieldAlert
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--warn)" }}
                  aria-hidden
                />
              )}
              Gerbang klaim
            </p>
            <p
              className={`mt-1 text-xs leading-relaxed ${state.allowed ? "text-muted" : "text-warn"}`}
              role="status"
            >
              {state.allowed
                ? "Terbuka: sesudah sesi tutup, mesin menulis klaim baru seperti biasa."
                : state.message}
            </p>
            {state.note && (
              <p className="text-warn mt-1 text-xs leading-relaxed">{state.note}</p>
            )}
            <div className="mt-3">
              <GerbangKontrol state={state} />
            </div>
          </div>
        )}

        {celah.length > 0 && (
          <p className="text-muted text-xs leading-relaxed tabular-nums">
            {fmtNum(celah.length)} sesi terakhir tanpa klaim dan tanpa penolakan, jadi job-nya
            tidak menulis apa pun untuk sesi itu:{" "}
            {celah.slice(0, 5).map((g) => g.trade_date).join(" · ")}
            {celah.length > 5 ? ` dan ${fmtNum(celah.length - 5)} sesi lain` : ""}.
          </p>
        )}
      </div>
    </Card>
  );
}
