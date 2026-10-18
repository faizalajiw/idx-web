"use client";

import { AlertTriangle, CheckCircle2, Clock, HelpCircle, type LucideIcon } from "lucide-react";
import { useFreshness } from "@/lib/hooks";
import { fmtDateStr } from "@/lib/format";
import type { Freshness, FreshnessStatus } from "@/lib/types";

/**
 * Badge kesegaran data (spec D1): tiga status, satu pertanyaan — "angka di layar
 * ini masih bisa dipercaya?".
 *
 * Sumbernya `/api/freshness` (bagian panel saham), atau objek `freshness` yang
 * sudah ikut di payload halaman (mis. `/api/recommendations`) supaya angka di
 * badge tidak mungkin berbeda dari angka yang ditahan backend.
 *
 * `basis="indeks"` dipakai bagian bersumber indeks (banner & kartu rezim): yang
 * dibaca `index_status` — penanda terpisah yang, menurut spec D1, tidak pernah
 * mengubah status halaman.
 */
const META: Record<FreshnessStatus, { badge: string; label: string; icon: LucideIcon }> = {
  segar: { badge: "badge badge-buy", label: "Segar", icon: CheckCircle2 },
  basi: { badge: "badge badge-warn", label: "Basi", icon: AlertTriangle },
  "tak diketahui": { badge: "badge badge-hold", label: "Tak diketahui", icon: HelpCircle },
};

const BASIS_LABEL: Record<string, string> = {
  panel: "panel saham",
  indeks: "indeks",
};

const tgl = (s: string | null | undefined): string => fmtDateStr(s) ?? "—";

export function FreshnessBadge({
  basis = "panel",
  freshness,
}: {
  basis?: "panel" | "indeks";
  freshness?: Freshness | null;
}) {
  const { data } = useFreshness();
  const f = freshness ?? data ?? null;

  if (!f) {
    return (
      <span className="badge badge-hold" role="status">
        <Clock size={12} className="mr-1" aria-hidden />
        Kesegaran memuat…
      </span>
    );
  }

  const status = basis === "indeks" ? f.index_status : f.status;
  const meta = META[status] ?? META["tak diketahui"];
  const Icon = meta.icon;
  const sesi = basis === "indeks" ? f.index_latest : f.panel_latest;
  const judul = [
    f.reason,
    sesi ? `Sesi terakhir ${tgl(sesi)}${f.expected ? ` · diharapkan ${tgl(f.expected)}` : ""}` : null,
    `Diperiksa ${tgl(f.checked_at.slice(0, 10))}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className={`${meta.badge} gap-1`} role="status" title={judul}>
      <Icon size={12} aria-hidden />
      {meta.label} ({BASIS_LABEL[basis]})
    </span>
  );
}
