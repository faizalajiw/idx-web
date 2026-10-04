"use client";

import Link from "next/link";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useSmartMoneyPatternsBoard } from "@/lib/hooks";
import { fmtCompact, fmtDateStr, fmtNum } from "@/lib/format";
import { Card } from "./Card";
import { InfoHint } from "./InfoHint";
import { EmptyState, ErrorState, Skeleton } from "./States";
import type { SmartMoneyPatternsBoardGroup } from "@/lib/types";

const CONFIDENCE_CLS: Record<string, string> = {
  tinggi: "bg-white/10 text-[var(--fg)]",
  sedang: "bg-white/5 text-muted",
  lemah: "bg-white/5 text-muted",
};

/**
 * Papan "pola terkuat hari ini" di /radar — pola yang menyala di sesi terakhir,
 * dikelompokkan per pola dan diurutkan berdasar kekuatan bukti.
 *
 * Kenapa per pola, bukan per emiten: angka historisnya (berapa persen arahnya
 * benar, di horizon berapa, sekuat apa) memang milik POLA, bukan milik emiten.
 * Daftar rata per emiten akan menuliskan statistik yang sama puluhan kali dan
 * justru menyembunyikan pesannya. Yang membedakan antar emiten adalah ukuran
 * aliran dan streak-nya.
 *
 * Gunanya: pola dengan catatan terkuat (mis. inisiasi volume) hanya menyala
 * sesekali, jadi tanpa papan ini ia nyaris tak pernah terlihat.
 */
export function SmartMoneyPatternsBoardCard({ className = "" }: { className?: string }) {
  const { data, error, isLoading } = useSmartMoneyPatternsBoard();

  if (error) return <ErrorState message={`Gagal memuat papan pola: ${error.message}`} />;

  return (
    <Card
      className={className}
      title={
        <>
          <Activity size={16} aria-hidden /> Pola Terkuat Hari Ini
          <InfoHint text="Pola klasik yang menyala di sesi terakhir, diurutkan dari bukti terkuat. Tiap kelompok membawa rekam jejaknya: persentase (berapa kali arah harga benar-benar sesuai pola, dari kejadian serupa di 120 sesi terakhir), horizon tempat catatannya terbaik, dan kata keyakinan. Emiten di dalam kelompok urut besar |net asing|; emiten yang nyaris tak diperdagangkan disaring keluar. Ini jejak, bukan rekomendasi." />
        </>
      }
      subtitle={
        data
          ? `${data.groups.length} pola menyala · ${fmtNum(data.scanned)} emiten dipindai`
          : undefined
      }
      right={
        data?.date ? (
          <span className="text-muted text-[10px]">Sesi {fmtDateStr(data.date) ?? data.date}</span>
        ) : undefined
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : data.groups.length === 0 ? (
        <EmptyState message="Tidak ada pola klasik yang menyala di sesi terakhir." />
      ) : (
        <div className="space-y-3">
          {data.groups.map((g) => (
            <PatternGroup key={g.pattern} group={g} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PatternGroup({ group }: { group: SmartMoneyPatternsBoardGroup }) {
  const buy = group.direction === "buy-side";
  const rate = group.aligned_hit_rate;
  const hidden = group.fired - group.count;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white/[0.02] p-2.5">
      {/* kepala kelompok: label + rekam jejak pola */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`inline-flex items-center gap-1 text-sm font-semibold ${buy ? "text-up" : "text-down"}`}>
          {buy ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
          {group.label}
        </span>
        {group.horizon_days && (
          <span className="text-muted rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
            cerita {group.horizon_days} hari
          </span>
        )}
        {rate !== null && (
          <span className={`text-[11px] font-medium tabular-nums ${rate >= 0.5 ? "text-[var(--fg)]" : "text-muted"}`}>
            {Math.round(rate * 100)}% sesuai arah · n={group.n_resolved_horizon ?? 0}
          </span>
        )}
        {group.confidence && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              CONFIDENCE_CLS[group.confidence] ?? "bg-white/5 text-muted"
            }`}
            title={`|t| terbaik lintas horizon — seberapa yakin catatan ini bukan kebetulan${
              group.edge_pct !== null ? `; besar efek ${group.edge_pct.toFixed(2)}%` : ""
            }`}
          >
            keyakinan {group.confidence}
          </span>
        )}
        <span className="text-muted ml-auto text-[10px] tabular-nums">
          {group.count} emiten
          {hidden > 0 ? ` (dari ${group.fired} yang menyala)` : ""}
        </span>
      </div>

      {/* emiten yang memicu pola */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {group.emitters.map((e) => (
          <Link
            key={e.code}
            href={`/stock/${e.code}`}
            title={`${e.name ?? e.code} — net asing ${fmtCompact(e.net_sum_idr)}${
              e.streak && e.streak >= 3 ? `, ${e.streak} sesi searah` : ""
            }`}
            className="hover:bg-white/[0.06] flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] transition-colors"
          >
            <span className="font-semibold">{e.code}</span>
            <span className={`tabular-nums ${buy ? "text-up" : "text-down"}`}>
              {fmtCompact(e.net_sum_idr)}
            </span>
            {e.streak !== null && e.streak >= 3 && (
              <span className="text-muted">· {e.streak}×</span>
            )}
          </Link>
        ))}
      </div>

      {hidden > 0 && (
        <p className="text-muted mt-1.5 text-[10px] leading-snug">
          {hidden} emiten lain juga memicu pola ini tapi disaring (nilai transaksi di
          bawah lantai likuiditas) — papannya sengaja tidak menempelkan nama yang nyaris
          tak diperdagangkan.
        </p>
      )}
    </div>
  );
}
