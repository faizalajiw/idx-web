const idFmt = new Intl.NumberFormat("id-ID");
const idFmt2 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return (digits > 0 ? idFmt2 : idFmt).format(v);
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

// Compact IDR value: 1.2 T / 3.4 M (miliar) / 5.6 Jt.
export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)} Jt`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)} Rb`;
  return idFmt.format(v);
}

export function trendClass(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return "text-neutral";
  return v > 0 ? "text-up" : "text-down";
}

// Jam lokal HH:MM:SS (WIB di mesin user) — dipakai badge "update terakhir".
export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Tanggal + jam lokal (dd Mmm yyyy HH:MM:SS) — dipakai badge "update terakhir".
export function fmtDateTime(d: Date): string {
  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${date} ${fmtTime(d)}`;
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// "2026-09-26" -> "26 Sep 2026". Parsing manual agar tanggal bursa (WIB) tak geser timezone.
export function fmtDateStr(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const [, y, mo, d] = m;
  return `${d} ${MONTHS_ID[+mo - 1] ?? mo} ${y}`;
}

// Timestamp server (ISO/naive) -> "HH:MM:SS" lokal; null bila tak valid.
export function fmtTimeStr(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return fmtTime(d);
}
