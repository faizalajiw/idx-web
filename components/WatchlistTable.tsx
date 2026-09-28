"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { WatchlistRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { TickerLogo } from "./TickerLogo";
import { LastUpdated } from "./LastUpdated";

const CODE_RE = /^[A-Z]{4}$/; // IDX tickers: four letters

type MoveFilter = "up" | "down";

function MoveTally({
  data,
  active,
  onToggle,
}: {
  data: WatchlistRow[];
  active: MoveFilter | null;
  onToggle: (f: MoveFilter) => void;
}) {
  let naik = 0;
  let turun = 0;
  for (const r of data) {
    if ((r.percent ?? 0) >= 0) naik++;
    else turun++;
  }
  const items: { label: string; key: MoveFilter; value: number; dot: string; text: string }[] = [
    { label: "Naik", key: "up", value: naik, dot: "bg-[var(--up)]", text: "text-up" },
    { label: "Turun", key: "down", value: turun, dot: "bg-[var(--down)]", text: "text-down" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            aria-pressed={isActive}
            title={isActive ? `Tampilkan semua` : `Filter ${it.label} saja`}
            className={`flex items-center gap-1.5 rounded-full border bg-white/[0.02] px-2.5 py-1 transition-colors ${
              isActive ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--fg)]/40"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${it.dot}`} />
            <span className="text-muted text-[10px] font-medium uppercase tracking-wide">{it.label}</span>
            <span className={`text-xs font-semibold tabular-nums ${it.text}`}>{it.value}</span>
          </button>
        );
      })}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted text-[10px] uppercase tracking-wide">{label}</span>
      <span className={`text-xs tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>{value}</span>
    </div>
  );
}

function WatchRow({
  r,
  onSelect,
  selected,
  onRemove,
  busy,
}: {
  r: WatchlistRow;
  onSelect?: (code: string) => void;
  selected?: string | null;
  onRemove: (code: string) => void;
  busy: boolean;
}) {
  const up = (r.percent ?? 0) >= 0;
  return (
    <div
      onClick={() => onSelect?.(r.code)}
      className={`flex cursor-pointer flex-col gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-left transition-colors hover:bg-white/[0.04] ${
        selected === r.code ? "ring-1 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`} />
        <Link
          href={`/stock/${r.code}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 text-sm font-semibold hover:underline"
        >
          <TickerLogo code={r.code} size={22} />
          {r.code}
        </Link>
        <span className="ml-auto text-sm font-semibold tabular-nums">{fmtNum(r.close)}</span>
        <span className={`text-xs tabular-nums ${up ? "text-up" : "text-down"}`}>{fmtPct(r.percent)}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(r.code);
          }}
          disabled={busy}
          title={`Hapus ${r.code} dari watchlist`}
          aria-label={`Hapus ${r.code} dari watchlist`}
          className="text-muted ml-1 shrink-0 rounded px-1.5 py-0.5 transition-colors hover:text-down disabled:cursor-not-allowed disabled:opacity-40"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-2">
        <Metric label="Change" value={fmtNum(r.change)} tone={(r.change ?? 0) >= 0 ? "up" : "down"} />
        <Metric label="Volume" value={fmtCompact(r.volume)} />
        <Metric label="Foreign Net" value={fmtCompact(r.foreign_net)} tone={(r.foreign_net ?? 0) >= 0 ? "up" : "down"} />
        <Metric label="Hari" value={r.hist_days} />
      </div>
    </div>
  );
}

export function WatchlistTable({
  codes,
  onSelect,
  selected,
}: {
  codes?: string;
  onSelect?: (code: string) => void;
  selected?: string | null;
}) {
  const { data, error, isLoading } = useWatchlist(codes);
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const [filter, setFilter] = useState("");
  const [moveFilter, setMoveFilter] = useState<MoveFilter | null>(null);
  const [newCode, setNewCode] = useState("");
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleMove(f: MoveFilter) {
    setMoveFilter((cur) => (cur === f ? null : f));
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toUpperCase();
    let filtered = q ? data.filter((r) => r.code.includes(q)) : data;
    if (moveFilter === "up") filtered = filtered.filter((r) => (r.percent ?? 0) >= 0);
    else if (moveFilter === "down") filtered = filtered.filter((r) => (r.percent ?? 0) < 0);
    return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
  }, [data, filter, moveFilter]);


  const inputCode = newCode.trim().toUpperCase();
  const inputValid = CODE_RE.test(inputCode);
  const inputExists = !!data?.some((r) => r.code === inputCode);
  const inputMessage = !inputCode
    ? "Contoh: BBCA"
    : !inputValid
      ? "Kode harus 4 huruf, mis. BBCA"
      : inputExists
        ? `${inputCode} sudah ada di watchlist`
        : null;

  async function handleAdd() {
    if (!inputValid || busy) return;
    setBusy(true);
    setMutateError(null);
    try {
      await addToWatchlist([inputCode]);
      setNewCode("");
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : "Gagal menambah emiten");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(code: string) {
    if (busy) return;
    setBusy(true);
    setMutateError(null);
    try {
      await removeFromWatchlist(code);
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : "Gagal menghapus emiten");
    } finally {
      setBusy(false);
    }
  }

  const filtering = filter.trim().length > 0;

  return (
    <Card
      title="Watchlist"
      subtitle="Snapshot terakhir per emiten · klik untuk chart"
      info="Daftar saham yang kamu pantau. Tambahkan kode saham favoritmu di sini agar harga dan sinyalnya mudah dicek sekali lihat. Klik kartu untuk melihat grafik detailnya."
      right={
        <div className="flex items-center gap-2">
          <LastUpdated dep={data} />
          {data && data.length > 0 ? <MoveTally data={data} active={moveFilter} onToggle={toggleMove} /> : null}
        </div>
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat watchlist: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      ) : (
        <>
          {/* Add / remove form */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
                placeholder="Tambah kode…"
                maxLength={4}
                aria-invalid={!!newCode && !inputValid}
                className="input w-28 uppercase placeholder:normal-case"
              />
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={!inputValid || busy || inputExists}
                className="btn btn-primary"
              >
                + Tambah
              </button>
            </div>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter kode…"
              className="input w-28 uppercase placeholder:normal-case"
            />
            {inputMessage && newCode && (
              <span className="text-muted text-xs">{inputMessage}</span>
            )}
            {mutateError && <ErrorState message={mutateError} />}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              message={
                filtering
                  ? `Tidak ada emiten yang cocok dengan "${filter.trim()}".`
                  : moveFilter
                    ? `Tidak ada emiten yang ${moveFilter === "up" ? "naik" : "turun"}.`
                    : undefined
              }
            />
          ) : (
            <div className="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1">
              {rows.map((r) => (
                <WatchRow
                  key={r.code}
                  r={r}
                  onSelect={onSelect}
                  selected={selected}
                  onRemove={(c) => void handleRemove(c)}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
