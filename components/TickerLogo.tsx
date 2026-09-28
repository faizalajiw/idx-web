"use client";

import { useState } from "react";
import { domainFor } from "@/lib/tickerDomains";

/**
 * Logo emiten IDX. Strategi (semua gratis, tanpa API key):
 *   1. File statis lokal  → /logos/{CODE}.png (kalau kamu drop file sendiri)
 *   2. Clearbit Logo API  → logo.clearbit.com/{domain} untuk kode yang punya
 *      domain di lib/tickerDomains.ts
 *   3. Monogram fallback  → lingkaran warna dari hash kode + inisial
 *
 * Kalau sumber 1/2 gagal load (404/timeout), otomatis turun ke monogram —
 * jadi tidak pernah ada gambar rusak.
 */

// Palet warna monogram (nyambung ke tema flat terminal).
const PALETTE = [
  "#2962ff",
  "#26a69a",
  "#f5a623",
  "#ef5350",
  "#9c27b0",
  "#00897b",
  "#5c6bc0",
  "#ec407a",
  "#7cb342",
  "#fb8c00",
];

function hashColor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function TickerLogo({
  code,
  size = 24,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const upper = code.toUpperCase();
  const domain = domainFor(upper);

  // Urutan sumber gambar yang dicoba; naik ke tahap berikutnya saat error.
  const sources = [
    `/logos/${upper}.png`,
    domain ? `https://logo.clearbit.com/${domain}?size=64` : null,
  ].filter(Boolean) as string[];

  const [srcIdx, setSrcIdx] = useState(0);
  const failed = srcIdx >= sources.length;

  const style = { width: size, height: size } as const;

  if (failed || sources.length === 0) {
    const initials = upper.slice(0, 2);
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
        style={{
          ...style,
          background: hashColor(upper),
          fontSize: size * 0.4,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[srcIdx]}
      alt={`${upper} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setSrcIdx((i) => i + 1)}
      className={`shrink-0 rounded-full bg-white object-contain ${className}`}
      style={style}
    />
  );
}
