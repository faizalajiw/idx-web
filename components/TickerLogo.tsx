"use client";

import { useEffect, useState } from "react";

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

type ManifestEntry = { code: string; status: string; file: string | null };

// Manifest di-fetch sekali per sesi browser, lalu dibagi ke semua instance.
let logoMapPromise: Promise<Map<string, string>> | null = null;

function loadLogoMap(): Promise<Map<string, string>> {
  if (!logoMapPromise) {
    logoMapPromise = fetch("/logos/manifest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: ManifestEntry[] }) => {
        const map = new Map<string, string>();
        for (const e of data.entries ?? []) {
          if (e.status === "ok" && e.file) map.set(e.code, `/logos/${e.file}`);
        }
        return map;
      })
      .catch(() => new Map<string, string>());
  }
  return logoMapPromise;
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
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadLogoMap().then((map) => {
      if (active) setSrc(map.get(upper) ?? null);
    });
    return () => {
      active = false;
    };
  }, [upper]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo lokal kecil dari public/
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full bg-white object-contain ${className}`}
        style={{ width: size, height: size }}
        onError={() => setSrc(null)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: hashColor(upper),
        fontSize: size * 0.4,
        lineHeight: 1,
      }}
    >
      {upper.slice(0, 2)}
    </span>
  );
}
