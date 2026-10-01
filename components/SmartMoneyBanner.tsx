"use client";

import Link from "next/link";
import {
  Banknote,
  GitCommitHorizontal,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useStockSmartMoney } from "@/lib/hooks";
import { fmtDateStr, fmtNum, fmtPct } from "@/lib/format";
import { Card } from "./Card";
import { InfoHint } from "./InfoHint";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { TickerLogo } from "./TickerLogo";

/** Tone warna berdasarkan arah verdict. */
function sideTone(side: string): { text: string; chip: string; icon: React.ReactNode } {
  if (side === "akumulasi")
    return {
      text: "text-up",
      chip: "bg-up/15 text-up",
      icon: <TrendingUp size={16} className="text-up" />,
    };
  if (side === "distribusi")
    return {
      text: "text-down",
      chip: "bg-down/15 text-down",
      icon: <TrendingDown size={16} className="text-down" />,
    };
  return {
    text: "text-muted",
    chip: "bg-white/10 text-muted",
    icon: <Minus size={16} className="text-muted" />,
  };
}

const SIDE_LABEL: Record<string, string> = {
  akumulasi: "SEDANG DITIMBUN",
  distribusi: "SEDANG DIBUANG",
  netral: "ARUS SEIMBANG",
};

/**
 * Banner "Jejak Smart Money" untuk satu emiten — satu verdict yang bisa
 * dipahami orang awam di satu layar, lalu angka detail di bawahnya.
 *
 * Susunan (verdict dulu, angka belakangan):
 *  1. Kepala: arah besar + kekuatan + streak
 *  2. Narasi plain-language (kalimat dari backend)
 *  3. Pola klasik yang terdeteksi (chip)
 *  4. Level: rentang konsolidasi + invalidasi
 *  5. Konteks sektor: "1 dari N emiten sektor X"
 */
export function SmartMoneyBanner({ code }: { code: string }) {
  const { data, error, isLoading } = useStockSmartMoney(code);

  if (error) {
    return <ErrorState message={`Gagal memuat jejak smart money: ${error.message}`} />;
  }
  if (isLoading || !data) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (!data.has_data || !data.verdict) {
    return (
      <EmptyState message="Data aliran asing belum cukup untuk menilai jejak smart money emiten ini." />
    );
  }

  const v = data.verdict;
  const tone = sideTone(v.side);
  const strength = v.strength === "besar" ? "aliran besar" : v.strength === "menengah" ? "aliran bermakna" : null;

  return (
    <Card
      title={
        <>
          <Banknote size={16} aria-hidden /> Jejak Smart Money
          <InfoHint text="Jejak investor asing (proksi 'pemain besar' — IDX tidak mempublikasikan transaksi per firma di data gratis). Arah dari porsi nilai transaksi yang dibelani asing di 10 sesi terakhir, bukan skor. Ini alat riset, bukan rekomendasi." />
        </>
      }
      subtitle={data.date ? `Sesi ${fmtDateStr(data.date) ?? data.date}` : undefined}
      className="border-[var(--border)]"
    >
      {/* 1) kepala verdict */}
      <div className="flex items-center gap-3">
        <TickerLogo code={data.code} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tracking-tight">{data.code}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tone.chip}`}
            >
              {tone.icon}
              {SIDE_LABEL[v.side] ?? v.side}
            </span>
            {strength && (
              <span className="text-muted rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium">
                {strength}
              </span>
            )}
          </div>
          {data.name && (
            <p className="text-muted truncate text-xs">{data.name}</p>
          )}
        </div>
        {(v.streak ?? 0) >= 3 && (
          <div className="text-right shrink-0">
            <p className={`flex items-center gap-1 text-sm font-bold tabular-nums ${tone.text}`}>
              <GitCommitHorizontal size={14} aria-hidden />
              {v.streak}× berturut
            </p>
            <p className="text-muted text-[10px]">sesi searah</p>
          </div>
        )}
      </div>

      {/* 2) narasi */}
      {data.narrative.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {data.narrative.map((line, i) => (
            <p key={i} className={`text-sm leading-relaxed ${i === 0 ? "font-medium text-[var(--fg)]" : "text-muted"}`}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* 3) pola klasik */}
      {data.patterns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.patterns.map((p) => {
            const buy = p.direction === "buy-side";
            return (
              <span
                key={p.id}
                title={p.note ?? undefined}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                  buy ? "bg-up/10 text-up" : "bg-down/10 text-down"
                }`}
              >
                {buy ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
                {p.label}
              </span>
            );
          })}
        </div>
      )}

      {/* 4) level */}
      {data.range && (
        <div className="text-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[var(--border)] bg-white/[0.02] p-2.5 text-xs">
          <ShieldAlert size={14} className="shrink-0" aria-hidden />
          <span>
            Rentang {data.range.lookback} sesi:{" "}
            <strong className="text-[var(--fg)] tabular-nums">{fmtNum(data.range.low)}</strong>–
            <strong className="text-[var(--fg)] tabular-nums">{fmtNum(data.range.high)}</strong>
            <span className="text-muted"> (lebar {fmtPct(data.range.range_pct)})</span>
          </span>
          <span>
            Tembus <strong className="text-up tabular-nums">{fmtNum(data.range.resistance)}</strong> = konfirmasi ·
            jebol <strong className="text-down tabular-nums">{fmtNum(data.range.support)}</strong> = batal
          </span>
        </div>
      )}

      {/* 5) konteks sektor */}
      {data.sector?.position && (
        <p className="text-muted mt-2.5 flex items-start gap-1.5 text-xs leading-snug">
          <InfoHint text="Berapa emiten di sektor yang sama yang juga searah — membedakan 'saham ini istimewa' dari 'seluruh sektor sedang begitu'. Sektor dari pemetaan kurasi; jika emiten tidak terpetakan, konteks tidak ditampilkan." />
          <span className="flex-1">
            <strong className="text-[var(--fg)]">Konteks {data.sector.sector}:</strong>{" "}
            {data.sector.position}
          </span>
        </p>
      )}

      {/* link ke detail */}
      <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-2.5">
        <Link
          href={`/stock/${data.code}`}
          className="text-accent hover:underline text-xs font-medium"
        >
          Detail teknikal →
        </Link>
        <Link
          href={`/flow/${data.code}`}
          className="text-accent hover:underline text-xs font-medium"
        >
          Arus asing harian →
        </Link>
      </div>
    </Card>
  );
}
