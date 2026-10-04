"use client";

import { useState } from "react";
import Link from "next/link";
import { Radar, TrendingUp, TrendingDown } from "lucide-react";
import { useSmartMoneyRadar } from "@/lib/hooks";
import { fmtCompact, fmtDateStr, fmtNum } from "@/lib/format";
import { Card } from "@/components/Card";
import { InfoHint } from "@/components/InfoHint";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { TickerLogo } from "@/components/TickerLogo";
import { SmartMoneyTrackRecordCard } from "@/components/SmartMoneyTrackRecordCard";
import { SmartMoneyPatternsBoardCard } from "@/components/SmartMoneyPatternsBoard";
import type { SmartMoneyRadarRow } from "@/lib/types";

/** Opsi jendela agregasi (hari bursa). */
const WINDOWS = [
  { days: 2, label: "2 sesi" },
  { days: 5, label: "5 sesi" },
  { days: 10, label: "10 sesi" },
  { days: 21, label: "1 bulan" },
];

function RadarTable({
  rows,
  side,
  days,
}: {
  rows: SmartMoneyRadarRow[];
  side: "akumulasi" | "distribusi";
  days: number;
}) {
  const isAcc = side === "akumulasi";
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.net_sum_idr ?? 0)), 1);
  return (
    <div>
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.code}>
            <Link
              href={`/radar/${r.code}`}
              className="card card-hover flex items-center gap-2.5 p-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <span className="text-muted w-5 shrink-0 text-center text-xs tabular-nums">
                {i + 1}
              </span>
              <TickerLogo code={r.code} size={26} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{r.code}</span>
                  {r.name && (
                    <span className="text-muted hidden truncate text-[11px] sm:inline">
                      {r.name}
                    </span>
                  )}
                </span>
                {/* bar relatif terhadap nilai terbesar di daftar */}
                <span className="relative mt-1 block h-1 overflow-hidden rounded-full bg-white/5">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${isAcc ? "bg-up" : "bg-down"}`}
                    style={{ width: `${(Math.abs(r.net_sum_idr ?? 0) / maxAbs) * 100}%` }}
                  />
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className={`text-sm font-bold tabular-nums ${isAcc ? "text-up" : "text-down"}`}>
                  {isAcc ? "+" : "−"}Rp {fmtCompact(Math.abs(r.net_sum_idr ?? 0))}
                </span>
                <span className="text-muted flex items-center gap-1 text-[11px] tabular-nums">
                  {fmtNum(r.netval_pct, 1)}% transaksi
                  {(r.streak ?? 0) >= 3 && (
                    <span
                      className={`rounded bg-white/10 px-1 font-semibold ${
                        isAcc ? "text-up" : "text-down"
                      }`}
                      title={`${r.streak} sesi berturut-turut`}
                    >
                      {r.streak}×
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <EmptyState message={`Tidak ada emiten ${side} di jendela ${days} sesi.`} />}
    </div>
  );
}

export default function RadarPage() {
  const [days, setDays] = useState(10);
  const { data, error, isLoading } = useSmartMoneyRadar(days);
  const acc = data?.accumulation ?? [];
  const dist = data?.distribution ?? [];
  const hasAny = acc.length > 0 || dist.length > 0;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Radar size={28} className="text-accent" aria-hidden />
            Radar <span className="gradient-text">Smart Money</span>
          </h1>
          <p className="text-muted mt-0.5 text-sm">
            Emiten dengan jejak aliran dana asing terkuat di seluruh pasar
            {data ? (
              <LastUpdated sessionDate={data.date} />
            ) : null}
          </p>
        </div>

        {/* pemilih jendela */}
        <div
          className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-1"
          role="group"
          aria-label="Jendela agregasi"
        >
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                days === w.days
                  ? "bg-[var(--accent)] text-white"
                  : "text-muted hover:bg-white/[0.06]"
              }`}
              aria-pressed={days === w.days}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-muted flex items-start gap-1.5 rounded-lg border border-[var(--border)] bg-white/[0.02] p-3 text-xs leading-relaxed">
        <InfoHint text="Smart money di sini = investor asing (IDX menggabungkan semua firma asing; tidak ada breakdown per firma di data gratis). Verdict dari porsi nilai transaksi yang dibelani asing, bukan skor. Lantai likuiditas: nilai transaksi jendela >= Rp 500 juta, supaya emiten yang nyaris tak diperdagangkan tidak naik ke papan. Ini alat riset, bukan rekomendasi jual/beli." />
        <span className="flex-1">
          <strong className="text-[var(--fg)]">Cara baca:</strong> hijau = asing net
          <em> beli</em> (akumulasi), merah = net <em>jual</em> (distribusi). Angka di
          kanan = total net dalam {days} sesi terakhir; "% transaksi" = porsi dari
          total nilai transaksi. Badge <span className="font-semibold">N×</span> =
          N sesi berturut-turut searah. Klik emiten untuk detail jejaknya.
        </span>
      </div>

      {error ? (
        <ErrorState message={`Gagal memuat radar: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : !hasAny ? (
        <EmptyState message="Belum ada data aliran asing yang cukup (data EOD diisi lewat `idx serve`)." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title={
              <>
                <TrendingUp size={16} className="text-up" /> Akumulasi
              </>
            }
            subtitle={`Asing net buy terbesar · ${days} sesi`}
            right={
              <span className="rounded-full bg-up/15 px-2 py-0.5 text-xs font-bold text-up">
                {acc.length}
              </span>
            }
          >
            <RadarTable rows={acc} side="akumulasi" days={days} />
          </Card>
          <Card
            title={
              <>
                <TrendingDown size={16} className="text-down" /> Distribusi
              </>
            }
            subtitle={`Asing net sell terbesar · ${days} sesi`}
            right={
              <span className="rounded-full bg-down/15 px-2 py-0.5 text-xs font-bold text-down">
                {dist.length}
              </span>
            }
          >
            <RadarTable rows={dist} side="distribusi" days={days} />
          </Card>
        </div>
      )}

      <p className="text-muted text-xs leading-relaxed">
        Data dari EOD IDX (delayed ~5–15 menit, diperbarui tiap hari bursa). Nilai
        rupiah = volume saham asing × close. Dipindai dari{" "}
        {fmtNum(data?.scanned)} emiten yang punya data.
      </p>

      <SmartMoneyPatternsBoardCard />

      <SmartMoneyTrackRecordCard />
    </main>
  );
}
