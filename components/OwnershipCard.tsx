"use client";

import { Crown, Landmark, Users } from "lucide-react";
import { useStockOwnership } from "@/lib/hooks";
import { fmtDateStr, fmtNum, fmtPct } from "@/lib/format";
import { Card } from "./Card";
import { InfoHint } from "./InfoHint";
import { EmptyState, ErrorState, Skeleton } from "./States";
import type { OwnershipChange } from "@/lib/types";

// Label ramah untuk kategori pemegang saham IDX.
const CATEGORY_LABEL: Record<string, string> = {
  publik: "masyarakat",
  besar: ">5%",
  manajemen: "manajemen",
  treasury: "treasury",
  lain: "lain",
};

function categoryOf(cat: string | null): string {
  const c = (cat ?? "").trim();
  if (c === "Masyarakat Warkat" || c === "Masyarakat Non Warkat") return "publik";
  if (c === "Saham Treasury") return "treasury";
  if (c === "Direksi" || c === "Komisaris") return "manajemen";
  if (c.startsWith("Lebih dari") || c.includes("5%")) return "besar";
  return "lain";
}

const CHANGE_WORD: Record<string, string> = {
  tambah: "menambah",
  kurang: "mengurangi",
  baru: "masuk (baru)",
  keluar: "keluar",
};

/**
 * Kartu "Pemilik & Aksi Pemilik" untuk detail emiten (gratis, keterbukaan IDX).
 *
 * Menjawab "siapa pemain besar di emiten ini": pengendali, free float publik,
 * daftar pemilik terbesar, dan — bila sudah ada ≥2 snapshot — siapa yang
 * menambah/mengurangi porsi. Ini jalur gratis pengganti broker-tape per saham
 * (yang tidak tersedia di IDX).
 */
export function OwnershipCard({ code }: { code: string }) {
  const { data, error, isLoading } = useStockOwnership(code);

  if (error) return <ErrorState message={`Gagal memuat kepemilikan: ${error.message}`} />;
  if (isLoading || !data) return <Skeleton className="h-44 w-full" />;

  if (!data.has_data) {
    return (
      <Card
        title={
          <>
            <Users size={16} aria-hidden /> Pemilik & Aksi Pemilik
          </>
        }
      >
        <EmptyState message="Komposisi pemegang saham belum ada di basis data. Jalankan `idx ownership` untuk mengambilnya dari keterbukaan IDX." />
      </Card>
    );
  }

  const controller = data.controller.length > 0 ? data.controller.join(", ") : null;
  const holders = data.holders.filter((h) => h.pct !== null).slice(0, 10);

  return (
    <Card
      title={
        <>
          <Users size={16} aria-hidden /> Pemilik & Aksi Pemilik
          <InfoHint text="Komposisi pemegang saham dari keterbukaan IDX (gratis). Free float = porsi publik (masyarakat Warkat + Non Warkat) — makin kecil, makin sedikit saham yang benar-benar beredar. 'Aksi pemilik' = perubahan porsi vs snapshot sebelumnya (jalankan `idx ownership` berkala). Data bulanan, bukan harian." />
        </>
      }
      subtitle={data.as_of ? `Snapshot ${fmtDateStr(data.as_of) ?? data.as_of}` : undefined}
      right={
        data.free_float_pct !== null && (
          <div className="text-right">
            <p className="text-accent text-lg font-bold tabular-nums">
              {fmtNum(data.free_float_pct, 1)}%
            </p>
            <p className="text-muted text-[10px]">free float publik</p>
          </div>
        )
      }
    >
      {controller && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/[0.02] px-2.5 py-2 text-xs">
          <Crown size={13} className="text-accent shrink-0" aria-hidden />
          <span className="text-muted">
            Pengendali: <strong className="text-[var(--fg)]">{controller}</strong>
          </span>
        </p>
      )}

      {/* daftar pemilik terbesar */}
      <ul className="space-y-1">
        {holders.map((h) => {
          const cat = categoryOf(h.category);
          return (
            <li
              key={h.holder_name}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 odd:bg-white/[0.02]"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {h.is_controller && (
                  <Crown size={11} className="text-accent mr-1 inline" aria-hidden />
                )}
                {h.holder_name}
              </span>
              <span className="text-muted shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px]">
                {CATEGORY_LABEL[cat] ?? cat}
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
                {fmtNum(h.pct, 2)}%
              </span>
            </li>
          );
        })}
      </ul>

      {/* aksi pemilik */}
      <div className="mt-3 border-t border-[var(--border)] pt-2.5">
        <p className="text-muted mb-1.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase">
          <Landmark size={12} aria-hidden /> Aksi pemilik
        </p>
        {data.prev_date === null ? (
          <p className="text-muted text-xs leading-snug">
            Snapshot pertama tersimpan. Perubahan porsi (siapa menambah/mengurangi)
            muncul setelah snapshot berikutnya — jalankan{" "}
            <code className="text-[var(--fg)]">idx ownership</code> berkala.
          </p>
        ) : data.changes.length === 0 ? (
          <p className="text-muted text-xs">Tidak ada perubahan porsi berarti sejak {data.prev_date}.</p>
        ) : (
          <ul className="space-y-1">
            {data.changes.slice(0, 8).map((c) => (
              <ChangeRow key={c.holder_name} change={c} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ChangeRow({ change }: { change: OwnershipChange }) {
  const up = change.action === "tambah" || change.action === "baru";
  const cls = up ? "text-up" : "text-down";
  const d = change.delta_pct;
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate">{change.holder_name}</span>
      <span className={`shrink-0 font-medium ${cls}`}>{CHANGE_WORD[change.action] ?? change.action}</span>
      <span className={`w-16 shrink-0 text-right font-semibold tabular-nums ${cls}`}>
        {d !== null
          ? fmtPct(d)
          : change.curr_pct !== null
            ? `${fmtNum(change.curr_pct, 2)}%`
            : "—"}
      </span>
    </li>
  );
}
