"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { fmtDateTime, fmtDateStr, fmtTimeStr } from "@/lib/format";

/**
 * Badge "update terakhir". Prioritas tampil (Opsi C):
 *   1. `sessionDate` (tanggal sesi bursa, mis. field `date`/`as_of`) +
 *      `updatedAt` (jam capture/generate backend, mis. `captured_at`/`generated_at`).
 *   2. Bila keduanya kosong, fallback ke jam browser saat data SWR diterima
 *      (pakai `dep`) — dilabeli "dimuat" agar tak dikira waktu bursa.
 */
export function LastUpdated({
  dep,
  sessionDate,
  updatedAt,
}: {
  dep?: unknown;
  sessionDate?: string | null;
  updatedAt?: string | null;
}) {
  const [at, setAt] = useState<Date | null>(null);
  const prev = useRef<unknown>(undefined);

  useEffect(() => {
    if (dep !== undefined && dep !== prev.current) {
      prev.current = dep;
      setAt(new Date());
    }
  }, [dep]);

  const sesi = fmtDateStr(sessionDate);
  const jam = fmtTimeStr(updatedAt);

  // Ada timestamp server → tampilkan tanggal bursa + jam refresh backend.
  if (sesi || jam) {
    return (
      <span
        className="text-muted inline-flex items-center gap-1 text-[11px] tabular-nums"
        title="Tanggal sesi bursa data ini, dan jam terakhir backend memperbaruinya (bukan jam browser)"
      >
        <RefreshCw size={11} aria-hidden />
        {sesi && `Sesi bursa ${sesi}`}
        {sesi && jam && " · "}
        {jam && `diperbarui ${jam}`}
      </span>
    );
  }

  // Fallback: tak ada timestamp server → jam browser saat data dimuat.
  if (!at) return null;
  return (
    <span
      className="text-muted inline-flex items-center gap-1 text-[11px] tabular-nums"
      title="Waktu data terakhir dimuat di layar (jam browser, bukan waktu bursa)"
    >
      <RefreshCw size={11} aria-hidden />
      Dimuat {fmtDateTime(at)}
    </span>
  );
}
