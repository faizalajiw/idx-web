"use client";

import {
  TrendingUp,
  TrendingDown,
  Shuffle,
  MoveHorizontal,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Card } from "./Card";
import { LastUpdated } from "./LastUpdated";
import { useMarketRegime, useRegimeHistory } from "@/lib/hooks";

/** Ikon & warna per regime. */
const REGIME: Record<
  string,
  { icon: LucideIcon; label: string; desc: string; badge: string; color: string }
> = {
  TRENDING_UP: {
    icon: TrendingUp,
    label: "Tren Naik",
    desc: "IHSG lagi naik cukup konsisten — kondisi biasanya lebih ramah buat beli/bertahan.",
    badge: "badge badge-buy",
    color: "var(--up)",
  },
  TRENDING_DOWN: {
    icon: TrendingDown,
    label: "Tren Turun",
    desc: "IHSG lagi turun cukup konsisten — hati-hati, sinyal beli rawan gagal. Prioritaskan melindungi modal.",
    badge: "badge badge-sell",
    color: "var(--down)",
  },
  TRANSITION: {
    icon: Shuffle,
    label: "Transisi",
    desc: "Pasar sedang bingung / ganti arah — tunggu konfirmasi dulu sebelum menambah posisi.",
    badge: "badge badge-warn",
    color: "#fbbf24",
  },
  RANGING: {
    icon: MoveHorizontal,
    label: "Menyamping",
    desc: "Harga cenderung naik-turun di rentang sempit — strategi beli di rendah, jual di tinggi lebih cocok.",
    badge: "badge badge-hold",
    color: "var(--fg-muted)",
  },
};

/** Label & warna volatilitas, plus arti buat user awam. */
const VOL: Record<
  string,
  { label: string; short: string; color: string; desc: string }
> = {
  QUIET: {
    label: "Tenang",
    short: "Perubahan harga kecil-kecil",
    color: "var(--up)",
    desc: "Harga stabil, jarang melonjak atau anjlok drastis.",
  },
  NORMAL: {
    label: "Normal",
    short: "Perubahan harga wajar",
    color: "var(--muted)",
    desc: "Volatilitas pasar dalam kondisi standar/sewajarnya.",
  },
  VOLATILE: {
    label: "Sangat Bergejolak",
    short: "Perubahan harga besar & cepat",
    color: "var(--warn)",
    desc: "Harga sering melonjak/anjlok — risikonya lebih tinggi, gerak pasar sulit ditebak.",
  },
};

const REGIME_COLOR: Record<string, string> = {
  TRENDING_UP: "var(--up)",
  TRENDING_DOWN: "var(--down)",
  TRANSITION: "#fbbf24",
  RANGING: "var(--fg-muted)",
};

/** ADX: kekuatan tren. 0-25 lemah, 25-50 sedang, 50+ kuat. */
function trendTag(adx: number | null): { label: string; color: string } | null {
  if (adx == null) return null;
  if (adx < 20) return { label: "Tren lemah (belum jelas arahnya)", color: "var(--muted)" };
  if (adx < 40) return { label: "Tren sedang", color: "var(--up)" };
  return { label: "Tren kuat", color: "var(--up)" };
}

/**
 * Kartu "Suasana Pasar" — gabungan regime (banner) + timeline dalam satu
 * blok, ditulis dengan bahasa awam. Khusus dashboard.
 */
export function MarketRegimeCard() {
  const { data, error, isLoading } = useMarketRegime();
  const hist = useRegimeHistory(60);

  if (error || (!isLoading && (!data || !data.regime))) {
    return (
      <Card
        title="Suasana Pasar"
        subtitle="Status tren & volatilitas IHSG"
        right={<LastUpdated sessionDate={data?.as_of} updatedAt={data?.generated_at} />}
      >
        <p className="text-muted text-sm">Data regime belum tersedia.</p>
      </Card>
    );
  }
  if (isLoading || !data) {
    return <div className="card h-24 animate-pulse bg-white/[0.04]" aria-hidden />;
  }

  const style = REGIME[data.regime ?? ""] ?? REGIME.RANGING;
  const RegimeIcon = style.icon;
  const vol = data.vol_state ? VOL[data.vol_state] : null;
  const trend = trendTag(data.adx);

  return (
    <Card
      title="Suasana Pasar"
      subtitle="Ringkasan tren & volatilitas IHSG (regime)"
      info="'Suasana pasar' (regime) = kondisi umum IHSG dari data historis: sedang naik, turun, atau menyamping. Timeline di bawah menunjukkan suasana tiap hari bursa 60 hari terakhir — warnanya mengikuti regime harian. Volatilitas = seberapa besar & cepat pergerakan harga."
      right={<LastUpdated sessionDate={data.as_of} updatedAt={data.generated_at} />}
    >
      <div className="flex flex-col gap-4">
        {/* Regime utama */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`badge text-sm ${style.badge}`}>
            <RegimeIcon size={14} className="mr-1" aria-hidden />
            {style.label}
          </span>
          {data.adx != null && trend && (
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: trend.color }}
              title={`ADX ${data.adx}`}
            >
              {trend.label} · ADX {data.adx}
            </span>
          )}
          <span className="text-muted text-xs tabular-nums">
            DI +{data.plus_di ?? "-"} / −{data.minus_di ?? "-"}
          </span>
        </div>

        <p className="text-muted -mt-1 text-sm leading-relaxed">{style.desc}</p>

        {/* Volatilitas (diperjelas) */}
        {vol && (
          <div className="rounded-lg border border-[var(--border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Activity size={14} aria-hidden style={{ color: vol.color }} />
              <span className="text-xs font-semibold tracking-widest uppercase">
                Volatilitas
              </span>
              <span
                className="badge tabular-nums"
                style={{
                  color: vol.color,
                  borderColor: vol.color,
                  background: "transparent",
                }}
              >
                {vol.label}
              </span>
              {data.realized_vol_annual != null && (
                <span className="text-xs tabular-nums" style={{ color: vol.color }}>
                  {data.realized_vol_annual}% / tahun
                </span>
              )}
            </div>
            <p className="text-muted mt-1.5 text-xs leading-relaxed">{vol.desc}</p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--fg-muted)]">
            60 hari bursa terakhir — {data.as_of ? `sampai ${data.as_of}` : ""}
          </p>
          {hist.isLoading || !hist.data ? (
            <div className="h-8 animate-pulse rounded bg-white/[0.04]" />
          ) : (
            <div className="flex gap-[2px] overflow-hidden" role="img" aria-label="Timeline regime IHSG">
              {hist.data.recent.slice(-60).map((d) => {
                const color = REGIME_COLOR[d.regime ?? ""] ?? "var(--border)";
                const hot = (d.realized_vol ?? 0) >= 30;
                return (
                  <div
                    key={d.date}
                    title={`${d.date} · ${d.regime ?? "-"} · ADX ${d.adx ?? "-"} · vol ${d.realized_vol ?? "-"}%`}
                    className="h-8 flex-1 rounded-sm transition-transform hover:scale-y-125"
                    style={{
                      background: color,
                      opacity: hot ? 1 : 0.55,
                      outline: hot ? "1px solid rgba(251,191,36,.7)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
