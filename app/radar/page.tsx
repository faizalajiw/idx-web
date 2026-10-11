"use client";

import { useState } from "react";
import Link from "next/link";
import { Radar, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useSmartMoneyRadar } from "@/lib/hooks";
import { fmtCompact, fmtNum } from "@/lib/format";
import { InfoHint } from "@/components/InfoHint";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { TickerLogo } from "@/components/TickerLogo";
import { SmartMoneyTrackRecordCard } from "@/components/SmartMoneyTrackRecordCard";
import { SmartMoneyPatternsBoardCard } from "@/components/SmartMoneyPatternsBoard";
import type { SmartMoneyRadarRow } from "@/lib/types";

/** Jendela waktu agregasi (hari bursa). */
const WINDOWS = [
  { days: 1, label: "Hari ini" },
  { days: 5, label: "1 minggu" },
  { days: 10, label: "2 minggu" },
  { days: 21, label: "1 bulan" },
];

type Side = "akumulasi" | "distribusi";

const SIDES: { key: Side; label: string; hint: string; icon: typeof TrendingUp }[] = [
  { key: "akumulasi", label: "Asing sedang borong", hint: "Dana asing net beli", icon: TrendingUp },
  { key: "distribusi", label: "Asing sedang lepas", hint: "Dana asing net jual", icon: TrendingDown },
];

function RadarList({ rows, side, days }: { rows: SmartMoneyRadarRow[]; side: Side; days: number }) {
  const isAcc = side === "akumulasi";
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.net_sum_idr ?? 0)), 1);

  if (rows.length === 0) {
    return (
      <EmptyState
        message={`Belum ada emiten yang ${isAcc ? "diborong" : "dilepas"} asing dalam ${
          WINDOWS.find((w) => w.days === days)?.label.toLowerCase() ?? `${days} sesi`
        } terakhir.`}
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {rows.map((r, i) => {
        const value = Math.abs(r.net_sum_idr ?? 0);
        return (
          <li key={r.code}>
            <Link
              href={`/radar/${r.code}`}
              className="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-white/[0.03] sm:px-3"
            >
              <span className="text-muted w-5 shrink-0 text-center text-xs tabular-nums">{i + 1}</span>
              <TickerLogo code={r.code} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-bold">{r.code}</span>
                  {r.name && (
                    <span className="text-muted hidden truncate text-xs sm:inline">{r.name}</span>
                  )}
                </span>
                <span className="relative mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/5">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${isAcc ? "bg-up" : "bg-down"}`}
                    style={{ width: `${(value / maxAbs) * 100}%` }}
                  />
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className={`text-sm font-bold tabular-nums ${isAcc ? "text-up" : "text-down"}`}>
                  {isAcc ? "+" : "−"}Rp {fmtCompact(value)}
                </span>
                <span className="text-muted flex items-center gap-1.5 text-[11px] tabular-nums">
                  {fmtNum(r.netval_pct, 1)}% dari transaksi
                  {(r.streak ?? 0) >= 3 && (
                    <span
                      className={`rounded bg-white/10 px-1 font-semibold ${isAcc ? "text-up" : "text-down"}`}
                      title={`${r.streak} sesi berturut-turut`}
                    >
                      {r.streak} hari berturut
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight size={16} className="text-muted shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function RadarPage() {
  const [days, setDays] = useState(10);
  const [side, setSide] = useState<Side>("akumulasi");
  const { data, error, isLoading } = useSmartMoneyRadar(days);
  const acc = data?.accumulation ?? [];
  const dist = data?.distribution ?? [];
  const hasAny = acc.length > 0 || dist.length > 0;
  const rows = side === "akumulasi" ? acc : dist;

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Radar size={26} className="text-accent" aria-hidden />
          Radar <span className="gradient-text">Smart Money</span>
        </h1>
        <p className="text-muted text-sm">
          Saham yang sedang paling banyak diborong atau dilepas investor asing.
          {data && <LastUpdated sessionDate={data.date} />}
        </p>
      </header>

      {/* Panduan singkat */}
      <div className="text-muted flex items-start gap-2 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3.5 text-sm leading-relaxed">
        <span className="flex-1">
          Tap emiten untuk melihat detail jejaknya. Angka di kanan adalah total
          uang asing yang masuk (hijau) atau keluar (merah) dalam periode yang
          kamu pilih.
        </span>
        <InfoHint text="Smart money di sini = investor asing (IDX menggabungkan semua firma asing; tidak ada breakdown per firma di data gratis). Verdict dari porsi nilai transaksi yang dibeli/dijual asing, bukan skor. Lantai likuiditas: nilai transaksi periode >= Rp 500 juta. Ini alat riset, bukan rekomendasi jual/beli." />
      </div>

      {/* Pemilih periode */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Periode">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            type="button"
            onClick={() => setDays(w.days)}
            aria-pressed={days === w.days}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              days === w.days
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-muted hover:text-[var(--fg)]"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      {error ? (
        <ErrorState message={`Gagal memuat radar: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-80" />
      ) : !hasAny ? (
        <EmptyState message="Belum ada data aliran asing yang cukup. Data EOD perlu diisi lewat `idx serve`." />
      ) : (
        <section className="card overflow-hidden p-0">
          {/* Tab sisi: akumulasi vs distribusi */}
          <div role="tablist" aria-label="Arah aliran asing" className="grid grid-cols-2 border-b border-[var(--border)]">
            {SIDES.map((s) => {
              const active = side === s.key;
              const count = s.key === "akumulasi" ? acc.length : dist.length;
              const Icon = s.icon;
              const tone = s.key === "akumulasi" ? "text-up" : "text-down";
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSide(s.key)}
                  className={`flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-b-2 border-[var(--accent)] text-[var(--fg)]"
                      : "border-b-2 border-transparent text-muted hover:text-[var(--fg)]"
                  }`}
                >
                  <Icon size={16} className={tone} aria-hidden />
                  <span>{s.label}</span>
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                      active ? `${tone} bg-white/10` : "bg-white/5 text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-muted px-4 pt-3 text-xs">
            {SIDES.find((s) => s.key === side)?.hint} · {WINDOWS.find((w) => w.days === days)?.label.toLowerCase()} terakhir
          </p>
          <div className="px-1 pb-2 sm:px-2">
            <RadarList rows={rows} side={side} days={days} />
          </div>
        </section>
      )}

      <div className="min-w-0">
        <SmartMoneyPatternsBoardCard className="h-full" />
      </div>

      <div className="min-w-0 lg:col-span-2">
        <SmartMoneyTrackRecordCard />
      </div>
      </div>

      <p className="text-muted text-xs leading-relaxed">
        Data EOD IDX (delayed ~5–15 menit, diperbarui tiap hari bursa). Nilai rupiah = volume saham asing × harga penutupan
        {data ? ` · dipindai dari ${fmtNum(data.scanned)} emiten` : ""}.
      </p>
    </main>
  );
}
