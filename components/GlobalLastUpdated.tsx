"use client";

import { useMarketOverview } from "@/lib/hooks";
import { LastUpdated } from "./LastUpdated";

/**
 * Indikator kesegaran data global: kapan market overview terakhir ter-fetch.
 * Ditampilkan di Topbar supaya user selalu tahu data ini fresh atau tidak.
 */
export function GlobalLastUpdated() {
  const { data, isLoading, error } = useMarketOverview();

  if (isLoading) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] sm:inline-flex">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]/60" />
        Memuat data…
      </span>
    );
  }

  if (error || !data) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] sm:inline-flex">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/70" />
        Data belum diperbarui
      </span>
    );
  }

  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.02] px-2.5 py-1 text-[10px] text-[var(--muted)] sm:inline-flex">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]/70" />
      <LastUpdated dep={data} />
    </span>
  );
}
