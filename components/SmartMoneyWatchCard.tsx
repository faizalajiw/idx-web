"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bell, Layers, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useSmartMoneyWatchlist } from "@/lib/hooks";
import { fmtNum } from "@/lib/format";
import { Card } from "./Card";
import { TickerLogo } from "./TickerLogo";
import { InfoHint } from "./InfoHint";
import { EmptyState, ErrorState, Skeleton } from "./States";
import type { SmartMoneyWatchRow } from "@/lib/types";

const FILTERS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "aktif", label: "Ada aliran", icon: Activity },
  { key: "akumulasi", label: "Ditimbun", icon: TrendingUp },
  { key: "distribusi", label: "Dibuang", icon: TrendingDown },
  { key: "semua", label: "Semua", icon: Layers },
];

function sideStyle(side: string | null, insufficient: boolean) {
  if (insufficient || side === "netral" || !side)
    return { Icon: Minus, cls: "text-muted", chip: "bg-white/5 text-muted" };
  if (side === "akumulasi")
    return { Icon: TrendingUp, cls: "text-up", chip: "bg-up/15 text-up" };
  return { Icon: TrendingDown, cls: "text-down", chip: "bg-down/15 text-down" };
}

const SIDE_WORD: Record<string, string> = {
  akumulasi: "ditimbun",
  distribusi: "dibuang",
  netral: "seimbang",
};

/**
 * Kartu "Jejak Smart Money — Watchlist" untuk halaman Pantau.
 *
 * Memberi tahu bahwa watchlist dipantau otomatis: begitu verdict salah satu
 * emiten berubah (pemain besar masuk/keluar/balik arah), Telegram berbunyi.
 * Daftar di bawah = kondisi SEKARANG — baseline-nya, bukan rekomendasi.
 */
export function SmartMoneyWatchCard() {
  const { data, error, isLoading } = useSmartMoneyWatchlist();
  const [filter, setFilter] = useState("aktif");

  const rows = data?.rows ?? [];
  const counts: Record<string, number> = useMemo(() => {
    let acc = 0, dist = 0, neu = 0;
    for (const r of rows) {
      if (r.insufficient || r.side === "netral" || !r.side) neu += 1;
      else if (r.side === "akumulasi") acc += 1;
      else dist += 1;
    }
    return { aktif: acc + dist, akumulasi: acc, distribusi: dist, semua: rows.length };
  }, [rows]);

  const shown = useMemo(() => {
    if (filter === "semua") return rows;
    if (filter === "akumulasi") return rows.filter((r) => !r.insufficient && r.side === "akumulasi");
    if (filter === "distribusi") return rows.filter((r) => !r.insufficient && r.side === "distribusi");
    return rows.filter((r) => !r.insufficient && (r.side === "akumulasi" || r.side === "distribusi"));
  }, [rows, filter]);

  if (error) return <ErrorState message={`Gagal memuat jejak smart money: ${error.message}`} />;

  return (
    <Card
      title={
        <>
          <Bell size={16} aria-hidden /> Jejak Smart Money — Watchlist
          <InfoHint text="Alert otomatis untuk SEMUA emiten di watchlist kamu: begitu verdict jejak asingnya berubah (mulai ditimbun / mulai dibuang / balik arah), kamu dapat pesan Telegram — sekali per perubahan, tidak tiap hari. Daftar di bawah = kondisi sekarang (baseline). Tidak perlu pasang aturan satu-satu. Bukan rekomendasi." />
        </>
      }
      subtitle={
        data
          ? `Terpantau ${data.n} emiten · alert saat verdict berubah`
          : "Memuat…"
      }
      right={
        data && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              data.telegram_enabled ? "bg-up/15 text-up" : "bg-white/10 text-muted"
            }`}
            title={
              data.telegram_enabled
                ? "Telegram tersambung — alert akan dikirim"
                : "Telegram belum diatur — alert hanya bisa dilihat di dashboard"
            }
          >
            <Bell size={11} aria-hidden />
            {data.telegram_enabled ? "Telegram aktif" : "Telegram belum diatur"}
          </span>
        )
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState message="Watchlist masih kosong — tambahkan emiten di atas." />
      ) : (
        <div className="space-y-3">
          {/* tab filter: jumlah per kategori langsung terlihat */}
          <div
            role="tablist"
            aria-label="Filter watchlist"
            className="flex flex-wrap gap-1 border-b border-[var(--border)]"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const FilterIcon = f.icon;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`group -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    active
                      ? "border-[var(--accent)] text-[var(--fg)]"
                      : "border-transparent text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                  }`}
                >
                  <FilterIcon
                    size={15}
                    aria-hidden
                    className={active ? "text-[var(--accent)]" : "opacity-70 group-hover:opacity-100"}
                  />
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                      active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-white/5 text-muted"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {shown.length === 0 ? (
              <EmptyState message="Tidak ada emiten dengan aliran bermakna saat ini." />
            ) : (
              shown.map((r) => <WatchRow key={r.code} row={r} />)
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function WatchRow({ row }: { row: SmartMoneyWatchRow }) {
  const { Icon, cls, chip } = sideStyle(row.side, row.insufficient);
  const streak = row.streak ?? 0;
  return (
    <Link
      href={`/radar/${row.code}`}
      className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.05]"
    >
      <Icon size={15} className={`shrink-0 ${cls}`} aria-hidden />
      <TickerLogo code={row.code} size={22} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{row.code}</span>
        {row.name && (
          <span className="text-muted block truncate text-[11px]">{row.name}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {streak >= 3 && (
          <span className={`rounded px-1 text-[10px] font-semibold ${chip}`} title={`${streak} sesi berturut-turut`}>
            {streak}×
          </span>
        )}
        <span className={`text-xs font-semibold tabular-nums ${cls}`}>
          {row.insufficient || !row.side
            ? "—"
            : `${fmtNum(row.netval_pct, 1)}%`}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip}`}>
          {row.insufficient ? "belum cukup" : (SIDE_WORD[row.side ?? ""] ?? "—")}
        </span>
      </span>
    </Link>
  );
}
