"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useWatchlist } from "@/lib/hooks";
import { ForeignFlowCard } from "@/components/ForeignFlowCard";
import { FlowTimelineCard } from "@/components/FlowTimelineCard";
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
    <div className="card space-y-3 p-4">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        action={`/flow/${draft.trim().toUpperCase()}`}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          const code = draft.trim().toUpperCase();
          if (code) window.location.href = `/flow/${code}`;
        }}
      >
        <div className="group relative flex-1">
          <Search className="text-muted absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="Cari kode emiten, mis. BBRI"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] pl-10 pr-3 text-sm font-medium tracking-wide outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
            aria-label="Kode emiten"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Lihat
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted text-[11px] font-medium">Cepat:</span>
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
 * Isi halaman Aliran Dana Emiten: arah asing harian dan timeline skor
 * akumulasi — keduanya untuk satu emiten. `code` null = tampil pemilih
 * dengan empty state (deep-link /flow).
 */
export function FlowWorkspace({ code }: { code: string | null }) {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <StockPicker value={code} />
      {code ? (
        <>
          <ForeignFlowCard code={code} />
          <FlowTimelineCard code={code} />
        </>
      ) : (
        <EmptyState message="Masukkan kode emiten di atas untuk melihat arus asing dan timeline aliran dana." />
      )}
    </main>
  );
}
