"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/lib/hooks";
import { fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import type { WatchlistRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

type SortKey =
  | "code"
  | "close"
  | "change"
  | "percent"
  | "volume"
  | "foreign_net"
  | "hist_days";
type SortDir = "asc" | "desc";

const NUMERIC_KEYS: SortKey[] = [
  "close",
  "change",
  "percent",
  "volume",
  "foreign_net",
  "hist_days",
];

const COLUMNS: { key: SortKey; label: string; right: boolean }[] = [
  { key: "code", label: "Kode", right: false },
  { key: "close", label: "Close", right: true },
  { key: "change", label: "Change", right: true },
  { key: "percent", label: "%", right: true },
  { key: "volume", label: "Volume", right: true },
  { key: "foreign_net", label: "Foreign Net", right: true },
  { key: "hist_days", label: "Hari", right: true },
];

function cell(r: WatchlistRow, key: SortKey): React.ReactNode {
  switch (key) {
    case "close":
      return fmtNum(r.close);
    case "change":
      return (
        <span className={`${(r.change ?? 0) >= 0 ? "text-up" : "text-down"}`}>
          {fmtNum(r.change)}
        </span>
      );
    case "percent":
      return (
        <span className={`${(r.percent ?? 0) >= 0 ? "text-up" : "text-down"}`}>
          {fmtPct(r.percent)}
        </span>
      );
    case "volume":
      return fmtCompact(r.volume);
    case "foreign_net":
      return (
        <span className={`${(r.foreign_net ?? 0) >= 0 ? "text-up" : "text-down"}`}>
          {fmtCompact(r.foreign_net)}
        </span>
      );
    case "hist_days":
      return <span className="text-muted">{r.hist_days}</span>;
    default:
      return r.code;
  }
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

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toUpperCase();
    const filtered = q ? data.filter((r) => r.code.includes(q)) : data;
    const dir = sortDir === "asc" ? 1 : -1;
    const isNumeric = NUMERIC_KEYS.includes(sortKey);
    return [...filtered].sort((a, b) => {
      if (isNumeric) {
        const key = sortKey as Exclude<SortKey, "code">;
        const av: number | null = a[key];
        const bv: number | null = b[key];
        return ((av ?? -Infinity) - (bv ?? -Infinity)) * dir;
      }
      return a.code.localeCompare(b.code) * dir;
    });
  }, [data, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numeric columns default to descending so the biggest values lead.
      setSortDir(key === "code" ? "asc" : "desc");
    }
  }

  const filtering = filter.trim().length > 0;

  return (
    <Card
      title="Watchlist"
      subtitle="Snapshot terakhir per emiten"
      right={
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter kode…"
          className="w-36 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-sm outline-none placeholder:text-[var(--fg-muted)] focus:border-[var(--accent)] sm:w-44"
        />
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat watchlist: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          message={filtering ? `Tidak ada emiten yang cocok dengan "${filter.trim()}".` : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted border-b border-[var(--border)] text-left text-xs">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`cursor-pointer py-2 pr-3 font-medium select-none hover:text-[var(--fg)] ${col.right ? "text-right" : ""} ${col.key === "hist_days" ? "pr-0" : ""}`}
                  >
                    {col.label}
                    <span className="ml-0.5 inline-block w-3">
                      {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSel = selected === r.code;
                return (
                  <tr
                    key={r.code}
                    onClick={() => onSelect?.(r.code)}
                    className={`border-b border-[var(--border)]/50 transition-colors ${
                      onSelect ? "cursor-pointer hover:bg-white/[0.03]" : ""
                    } ${isSel ? "bg-[var(--accent)]/10" : ""}`}
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`py-2 pr-3 text-right tabular-nums ${col.right ? "" : ""} ${col.key === "hist_days" ? "pr-0" : ""}`}
                      >
                        {col.key === "code" ? (
                          <Link
                            href={`/stock/${r.code}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold hover:underline"
                          >
                            {r.code}
                          </Link>
                        ) : (
                          cell(r, col.key)
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
