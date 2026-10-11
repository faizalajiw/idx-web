"use client";

import {
  Landmark,
  Wallet,
  ShieldCheck,
  Flame,
  Mountain,
  Gem,
  Building2,
  Signal,
  TowerControl,
  HardHat,
  Truck,
  ShoppingBasket,
  ShoppingBag,
  Sprout,
  HeartPulse,
  Clapperboard,
  Car,
  FlaskConical,
  Zap,
  Cpu,
  Store,
  Briefcase,
  Network,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useSectorRotation } from "@/lib/hooks";
import type { SectorRotationRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";

const PHASE_STYLE: Record<string, { badge: string; label: string }> = {
  AKUMULASI: { badge: "badge badge-buy", label: "Akumulasi" },
  MEMBAIK: { badge: "badge badge-hold", label: "Membaik" },
  MEMUDAR: { badge: "badge badge-warn", label: "Memudar" },
  TERPURUK: { badge: "badge badge-sell", label: "Terpuruk" },
  STABIL: { badge: "badge badge-hold opacity-60", label: "Stabil" },
};

/** Ikon + warna per sektor (vocabulary dari BUCKETS di sector_map.py). */
const SECTOR_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  Perbankan: { icon: Landmark, color: "#38bdf8" },
  "Keuangan Non-Bank": { icon: Wallet, color: "#22d3ee" },
  Asuransi: { icon: ShieldCheck, color: "#2dd4bf" },
  Energi: { icon: Flame, color: "#fb923c" },
  Batubara: { icon: Mountain, color: "#a3a3a3" },
  "Logam & Mineral": { icon: Gem, color: "#c084fc" },
  Properti: { icon: Building2, color: "#f472b6" },
  "Telkom & Internet": { icon: Signal, color: "#60a5fa" },
  Infrastruktur: { icon: TowerControl, color: "#818cf8" },
  Konstruksi: { icon: HardHat, color: "#facc15" },
  "Transportasi & Logistik": { icon: Truck, color: "#34d399" },
  "Konsumer Primer": { icon: ShoppingBasket, color: "#4ade80" },
  "Konsumer Sekunder": { icon: ShoppingBag, color: "#a3e635" },
  Agriculture: { icon: Sprout, color: "#65a30d" },
  Kesehatan: { icon: HeartPulse, color: "#f87171" },
  "Media & Hiburan": { icon: Clapperboard, color: "#e879f9" },
  Otomotif: { icon: Car, color: "#fbbf24" },
  "Industri Dasar & Kimia": { icon: FlaskConical, color: "#fcd34d" },
  Utilitas: { icon: Zap, color: "#fde047" },
  Teknologi: { icon: Cpu, color: "#22d3ee" },
  Retail: { icon: Store, color: "#fb7185" },
  "Jasa & Industri": { icon: Briefcase, color: "#94a3b8" },
  Konglomerat: { icon: Network, color: "#c4b5fd" },
};

function sectorVisual(sector: string): { icon: LucideIcon; color: string } {
  return SECTOR_ICON[sector] ?? { icon: Layers, color: "var(--fg-muted)" };
}

const p0 = (v: number) => `${(v * 100).toFixed(0)}%`;

function deltaCell(v: number | null): string {
  if (v === null) return "-";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}

function deltaClass(v: number | null): string {
  if (v === null || v === 0) return "text-muted";
  return v > 0 ? "text-up" : "text-down";
}

/** Sparkline median skor sektor — SVG polos, tanpa Recharts per baris. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 28;
  // Sertakan 50 supaya garis netralnya selalu terlihat di skala.
  const min = Math.min(...values, 50);
  const max = Math.max(...values, 50);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / span) * h;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className="overflow-visible">
      <line
        x1={0}
        x2={w}
        y1={y(50)}
        y2={y(50)}
        stroke="var(--chart-ref-soft)"
        strokeDasharray="2 2"
      />
      <polyline
        points={points}
        fill="none"
        stroke={last >= 50 ? "var(--chart-up)" : "var(--chart-down)"}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Satu sektor sebagai card — menggantikan satu baris tabel. */
function SectorCard({ s }: { s: SectorRotationRow }) {
  const style = (s.phase && PHASE_STYLE[s.phase]) || null;
  const { icon: Icon, color } = sectorVisual(s.sector);

  return (
    <div className="card flex flex-col gap-3 p-4 transition-colors hover:border-[var(--accent)]/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{s.sector}</p>
            <p className="text-muted text-xs">{s.n_names} emiten</p>
          </div>
        </div>
        {style ? (
          <span className={`${style.badge} shrink-0`}>{style.label}</span>
        ) : (
          <span className="text-muted shrink-0 text-xs">—</span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-muted text-[11px]">Median skor</p>
          <p className="text-xl font-bold tabular-nums leading-none">{s.median_score.toFixed(1)}</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-muted text-[11px]">Δ 5 sesi</p>
            <p className={`font-semibold tabular-nums ${deltaClass(s.delta_5d)}`}>{deltaCell(s.delta_5d)}</p>
          </div>
          <div>
            <p className="text-muted text-[11px]">Δ 21 sesi</p>
            <p className={`font-semibold tabular-nums ${deltaClass(s.delta_21d)}`}>{deltaCell(s.delta_21d)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <div className="shrink-0">
          <p className="text-muted text-[11px]">Breadth</p>
          <p className="font-semibold tabular-nums">{p0(s.breadth)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <Sparkline values={s.history} />
        </div>
      </div>
    </div>
  );
}

function RotationGrid() {
  const { data, error, isLoading } = useSectorRotation(60, 3);

  if (error) return <ErrorState message={`Gagal memuat rotasi sektor: ${error.message}`} />;
  if (isLoading || !data) return <Skeleton className="h-72 w-full" />;

  if (!data.validated)
    return (
      <div className="space-y-2">
        <p className="text-muted text-sm">
          {data.reason ?? "Rotasi sektor belum bisa dihitung."}
        </p>
        <p className="text-muted text-[11px] leading-snug">
          Rotasi ini diturunkan dari skor aktivitas broker, dan skor itu hanya
          memakai faktor aliran yang sudah lolos uji IC. Selama belum ada yang
          lolos, tidak ada yang bisa dirotasi — jadi tabel ini sengaja kosong.
        </p>
      </div>
    );

  if (data.sectors.length === 0)
    return (
      <EmptyState
        message={`Belum ada sektor dengan minimal ${data.min_names} emiten berskor.`}
      />
    );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.sectors.map((s: SectorRotationRow) => (
          <SectorCard key={s.sector} s={s} />
        ))}
      </div>

      <p className="text-muted text-[11px] leading-snug">
        Urut dari sektor yang paling sedang menguat (Δ 5 sesi). Median dipakai
        agar satu emiten ekstrem tidak mewakili seluruh sektor. Breadth = porsi
        emiten sektor itu yang skornya ≥ 60 (benar-benar diakumulasi). Sektor
        dengan kurang dari {data.min_names} emiten berskor tidak ditampilkan
        {data.unmapped_names > 0 &&
          `; ${data.unmapped_names} emiten berskor belum punya sektor sebenarnya dan tidak diikutkan`}
        . Δ = perubahan median, bukan levelnya — sektor kuat yang mulai turun
        berbeda artinya dari yang sedang naik.
      </p>
    </div>
  );
}

/**
 * Rotasi sektor berbasis skor aktivitas broker.
 *
 * Rotasi sektor berbasis skor aktivitas broker, mengukur JEJAK ALIRAN
 * (proksi akumulasi/distribusi). Sektor bisa saja harganya belum bergerak
 * padahal alirannya sudah berbalik — itu justru yang dicari di sini.
 */
export function SectorRotationTable() {
  const { data } = useSectorRotation(60, 3);

  return (
    <Card
      title="Rotasi Sektor — Aktivitas Broker"
      subtitle="Median skor aliran per sektor + arah perubahannya"
      info="Sektor mana yang aliran dananya sedang berbalik naik (akumulasi) atau turun (distribusi). Dihitung dari jejak aliran broker (proksi arus asing + buku intraday), dibobot oleh uji IC."
      right={<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />}
    >
      <RotationGrid />
    </Card>
  );
}
