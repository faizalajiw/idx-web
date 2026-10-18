"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keadaan portofolio milik pemilik: empat angka yang dia ketik sendiri.
 *
 * Angka ini disimpan di browser ini saja (localStorage) dan tidak pernah dikirim
 * ke server sebagai catatan posisi nyata — backend hanya memakainya untuk
 * menghitung rencana posisi pada satu respons. Sumber kebenaran batasnya ada di
 * backend (`research/position.py`); konstanta di sini hanya untuk tampilan strip,
 * supaya kalimat "3 dari 6" dan "ruang sisa 46%" punya angka yang sama.
 */

export const MAX_OPEN_POSITIONS = 6;
export const MAX_EXPOSURE_PCT = 80;

export const PORTFOLIO_KEYS = {
  modal: "ml-modal",
  riskPct: "ml-risk-pct",
  openPositions: "ml-open-positions",
  exposurePct: "ml-exposure-pct",
} as const;

export type PortfolioField = keyof typeof PORTFOLIO_KEYS;

/** Isian disimpan sebagai teks apa adanya: angka yang belum selesai diketik jangan dibulatkan. */
export interface PortfolioState {
  modal: string;
  riskPct: string;
  openPositions: string;
  exposurePct: string;
}

export const EMPTY_PORTFOLIO: PortfolioState = {
  modal: "",
  riskPct: "",
  openPositions: "",
  exposurePct: "",
};

/** Angka dari isian; `null` bila kosong atau bukan angka. */
export function asNumber(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * Query untuk `/api/recommendations`: hanya nilai yang sah yang dikirim.
 *
 * Angka yang tidak sah sengaja tidak dikirim sama sekali, bukan dikirim lalu
 * ditolak 422 — pengguna melihat pesan di strip, papan tetap tampil.
 */
export function portfolioQuery(state: PortfolioState): string {
  const parts: string[] = [];
  const modal = asNumber(state.modal);
  if (modal !== null && modal > 0) parts.push(`modal=${modal}`);
  const risk = asNumber(state.riskPct);
  if (risk !== null && risk > 0) parts.push(`risk_pct=${risk}`);
  const open = asNumber(state.openPositions);
  if (open !== null && open >= 0) parts.push(`open_positions=${open}`);
  const exposure = asNumber(state.exposurePct);
  if (exposure !== null && exposure >= 0) parts.push(`exposure_pct=${exposure}`);
  return parts.length > 0 ? `&${parts.join("&")}` : "";
}

/**
 * Empat angka keadaan + penulisnya. Storage dibaca di `useEffect`, bukan saat
 * render: komponen client tetap dipra-render di server, dan render pertama harus
 * sama di kedua sisi (pola yang sama dengan `components/ThemeToggle.tsx`).
 */
export function usePortfolio(): {
  state: PortfolioState;
  setField: (field: PortfolioField, value: string) => void;
} {
  const [state, setState] = useState<PortfolioState>(EMPTY_PORTFOLIO);

  useEffect(() => {
    const next = { ...EMPTY_PORTFOLIO };
    let ada = false;
    for (const field of Object.keys(PORTFOLIO_KEYS) as PortfolioField[]) {
      try {
        const saved = localStorage.getItem(PORTFOLIO_KEYS[field]);
        if (saved !== null) {
          next[field] = saved;
          ada = true;
        }
      } catch {
        // Storage bisa ditolak (mode privat) — isian tetap jalan tanpa simpan.
      }
    }
    if (ada) setState(next);
  }, []);

  const setField = useCallback((field: PortfolioField, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
    try {
      localStorage.setItem(PORTFOLIO_KEYS[field], value);
    } catch {
      // Idem: gagal menyimpan bukan alasan memblokir isian.
    }
  }, []);

  return { state, setField };
}
