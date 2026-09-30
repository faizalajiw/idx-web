"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useWatchlist } from "@/lib/hooks";
import { ForeignFlowCard } from "@/components/ForeignFlowCard";
import { FlowTimelineCard } from "@/components/FlowTimelineCard";
import { BrokerFlowCard } from "@/components/BrokerFlowCard";
import { EmptyState } from "@/components/States";

/** Pemilih emiten: input kode + saran cepat dari watchlist. */
function StockPicker({ value }: { value: string | null }) {
  const { data: watchlist } = useWatchlist();
  const [draft, setDraft] = useState(value ?? "");

  // Draft mengikuti URL saat emiten berganti dari luar (mis. chip / link).
  useEffect(() => setDraft(value ?? ""), [value]);

  const suggestions = useMemo(() => {
    const base = (watchlist ?? []).map((w) => w.code);
    // Emiten aktif tetap ditawarkan walau tidak ada di watchlist.
    const pool = value && !base.includes(value) ? [value, ...base] : base;
    const q = draft.trim().toUpperCase();
    if (!q) return pool.slice(0, 8);
    return pool.filter((c) => c.includes(q)).slice(0, 8);
  }, [watchlist, draft, value]);

  return (
    <div className="space-y-2">
      <form
        className="flex items-center gap-2"
        action={`/flow/${draft.trim().toUpperCase()}`}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          const code = draft.trim().toUpperCase();
          if (code) window.location.href = `/flow/${code}`;
        }}
      >
        <div className="relative flex-1">
          <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="Kode emiten, mis. BBRI"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elev)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
            aria-label="Kode emiten"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Lihat
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted text-[11px]">Cepat:</span>
          {suggestions.map((c) => (
            <Link
              key={c}
              href={`/flow/${c}`}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                c === value
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] text-muted hover:bg-white/[0.06]"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Isi halaman Aliran Dana Emiten: arah asing harian, timeline skor akumulasi,
 * dan komposisi kategori broker — semua untuk satu emiten. `code` null =
 * tampil pemilih dengan empty state (deep-link /flow).
 */
export function FlowWorkspace({ code }: { code: string | null }) {
  return (
    <div className="space-y-4">
      <StockPicker value={code} />
      {code ? (
        <>
          <ForeignFlowCard code={code} />
          <FlowTimelineCard code={code} />
          <BrokerFlowCard compact />
        </>
      ) : (
        <EmptyState message="Masukkan kode emiten di atas untuk melihat arus asing, timeline aliran dana, dan komposisi broker-nya." />
      )}
    </div>
  );
}
