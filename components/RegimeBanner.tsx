"use client";

import { useMarketRegime } from "@/lib/hooks";

/** Warna & ikon per regime. */
const REGIME_STYLE: Record<string, { badge: string; icon: string; label: string }> = {
  TRENDING_UP: { badge: "badge badge-buy", icon: "📈", label: "Trending Up" },
  TRENDING_DOWN: { badge: "badge badge-sell", icon: "📉", label: "Trending Down" },
  TRANSITION: { badge: "badge badge-warn", icon: "🔀", label: "Transisi" },
  RANGING: { badge: "badge badge-hold", icon: "↔️", label: "Ranging" },
};

const VOL_STYLE: Record<string, { label: string; color: string }> = {
  VOLATILE: { label: "Volatil", color: "#fbbf24" },
  NORMAL: { label: "Normal", color: "var(--muted)" },
  QUIET: { label: "Tenang", color: "var(--up)" },
};

/** Saran taktis satu kalimat per regime — konteks baca sinyal, bukan sinyal. */
function hint(regime: string | null): string | null {
  switch (regime) {
    case "TRENDING_UP":
      return "Sinyal BUY lebih layak diikuti; hindari kontra-tren.";
    case "TRENDING_DOWN":
      return "Sinyal BUY rawan gagal; prioritaskan proteksi modal.";
    case "TRANSITION":
      return "Kekuatan tren sedang — tunggu konfirmasi sebelum menambah posisi.";
    case "RANGING":
      return "Breakout rentan gagal; strategi band (beli lemah, jual kuat) lebih cocok.";
    default:
      return null;
  }
}

/**
 * Banner konteks regime IHSG. Self-fetch via SWR (dedup antar halaman —
 * sekali fetch, dipakai semua halaman yang memasang banner ini).
 */
export function RegimeBanner() {
  const { data, error, isLoading } = useMarketRegime();

  if (error || (!isLoading && !data?.regime)) return null; // senyap bila tak tersedia
  if (isLoading) {
    return <div className="card h-10 animate-pulse bg-white/[0.04]" aria-hidden />;
  }

  const style = REGIME_STYLE[data!.regime ?? ""] ?? REGIME_STYLE.RANGING;
  const vol = data!.vol_state ? VOL_STYLE[data!.vol_state] : null;

  return (
    <div
      className="card flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
      title="ADX(14) + DI dari IHSG; volatilitas = realized vol 20 hari ter-annualisasi (~240 hari bursa)"
    >
      <span className="text-muted text-xs font-semibold tracking-widest uppercase">
        Regime IHSG
      </span>
      <span className={style.badge}>
        <span aria-hidden>{style.icon}</span> {style.label}
        {data!.adx !== null && ` · ADX ${data!.adx}`}
      </span>
      {data!.plus_di !== null && data!.minus_di !== null && (
        <span className="text-muted text-xs tabular-nums">
          DI +{data!.plus_di} / −{data!.minus_di}
        </span>
      )}
      {vol && data!.realized_vol_annual !== null && (
        <span className="text-xs tabular-nums" style={{ color: vol.color }}>
          Vol {vol.label} {data!.realized_vol_annual}%
        </span>
      )}
      <span className="text-muted hidden text-xs md:inline">
        {hint(data!.regime)}
      </span>
      <span className="text-muted ml-auto text-[10px]">{data!.as_of}</span>
    </div>
  );
}
