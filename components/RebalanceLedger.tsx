"use client";

import { useState } from "react";
import type { RebalanceEvent } from "@/lib/types";
import { fmtCompact, fmtNum } from "@/lib/format";
import { EmptyState } from "./States";

function SideBadge({ side }: { side: string }) {
  const buy = side === "buy";
  return (
    <span className={buy ? "badge badge-buy" : "badge badge-sell"}>
      {buy ? "BELI" : "JUAL"}
    </span>
  );
}

/**
 * Trade ledger: pick a rebalance on the left, inspect the fills it made and the
 * book it left behind. Events arrive newest-first from the API.
 */
export function RebalanceLedger({
  events,
  truncated,
  total,
}: {
  events: RebalanceEvent[];
  truncated: boolean;
  total: number;
}) {
  const [selected, setSelected] = useState(0);

  if (events.length === 0) {
    return (
      <EmptyState message="Tidak ada rebalance di periode ini — strategi tidak pernah menyesuaikan posisi." />
    );
  }

  // Guard against a stale index when a fresh (shorter) result arrives.
  const index = Math.min(selected, events.length - 1);
  const active = events[index];
  const holdingsValue = active.holdings.reduce((sum, h) => sum + h.value, 0);

  return (
    <div className="space-y-3">
      {truncated && (
        <p className="text-muted text-xs leading-relaxed">
          Menampilkan{" "}
          <span className="font-medium text-[var(--fg)]">{events.length}</span>{" "}
          rebalance terbaru dari total {total}. Angka agregat (turnover &amp;
          biaya) di kartu lain tetap lengkap.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------------------------------------------------- event picker */}
        <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1 lg:col-span-1">
          {events.map((event, i) => {
            const isActive = i === index;
            return (
              <button
                key={event.date}
                type="button"
                onClick={() => setSelected(i)}
                aria-current={isActive ? "true" : undefined}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                  isActive
                    ? "border-[var(--accent)] bg-white/[0.04]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold tabular-nums">{event.date}</span>
                  <span className="text-muted tabular-nums">
                    {event.trades.length} trade
                  </span>
                </div>
                <div className="text-muted mt-0.5 flex items-baseline justify-between gap-2 tabular-nums">
                  <span>Turnover {fmtCompact(event.turnover)}</span>
                  <span>Fee {fmtCompact(event.fees)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------- detail */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
              Trade · {active.date}
            </p>
            {active.trades.length === 0 ? (
              <p className="text-muted text-sm">
                Tidak ada trade — bobot posisi sudah sesuai target.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Kode</th>
                      <th className="text-center">Aksi</th>
                      <th className="text-right">Lembar</th>
                      <th className="text-right">Harga</th>
                      <th className="text-right">Nilai</th>
                      <th className="text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.trades.map((t, i) => (
                      <tr key={`${t.code}-${t.side}-${i}`}>
                        <td className="font-semibold">{t.code}</td>
                        <td className="text-center">
                          <SideBadge side={t.side} />
                        </td>
                        <td className="text-right tabular-nums">{fmtNum(t.shares, 2)}</td>
                        <td className="text-right tabular-nums">{fmtNum(t.price, 2)}</td>
                        <td className="text-right tabular-nums">{fmtCompact(t.notional)}</td>
                        <td className="text-muted text-right tabular-nums">
                          {fmtCompact(t.fee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
              Posisi setelah rebalance
            </p>
            {active.holdings.length === 0 ? (
              <p className="text-muted text-sm">Seluruh posisi dilikuidasi — buku 100% kas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Kode</th>
                      <th className="text-right">Lembar</th>
                      <th className="text-right">Harga</th>
                      <th className="text-right">Nilai</th>
                      <th className="text-right">Bobot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.holdings.map((h) => {
                      const bookValue = holdingsValue + active.cash;
                      const weight = bookValue > 0 ? (h.value / bookValue) * 100 : 0;
                      return (
                        <tr key={h.code}>
                          <td>
                            <span className="font-semibold">{h.code}</span>
                          </td>
                          <td className="text-right tabular-nums">{fmtNum(h.shares, 2)}</td>
                          <td className="text-right tabular-nums">{fmtNum(h.price, 2)}</td>
                          <td className="text-right font-semibold tabular-nums">
                            {fmtCompact(h.value)}
                          </td>
                          <td className="text-muted text-right tabular-nums">
                            {weight.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-muted mt-2 text-xs tabular-nums">
              Kas {fmtCompact(active.cash)} · nilai buku{" "}
              {fmtCompact(holdingsValue + active.cash)} · turnover sesi ini{" "}
              {fmtCompact(active.turnover)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
