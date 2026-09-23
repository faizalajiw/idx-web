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
