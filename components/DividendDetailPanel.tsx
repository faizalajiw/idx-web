"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useStockDividends, useWatchlist } from "@/lib/hooks";
import { fmtNum, fmtPct, trendClass } from "@/lib/format";
import type { DividendAnnual, SplitAction } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const CODE_RE = /^[A-Z]{4,5}$/;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function AnnualTable({
  annual,
  splits,
}: {
  annual: DividendAnnual[];
  splits: SplitAction[];
}) {
  const splitYears = new Set(
    splits.map((s) => s.ex_date?.slice(0, 4)).filter((y): y is string => !!y),
  );
  const touchesSplit = annual.some((a) => splitYears.has(String(a.year)));

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Tahun</th>
            <th className="text-right">Dividen/lembar</th>
            <th className="text-right">Bayar</th>
          </tr>
        </thead>
        <tbody>
          {annual.map((a) => (
            <tr key={a.year}>
              <td className="font-semibold">
                {a.year}
                {splitYears.has(String(a.year)) && (
                  <span className="badge badge-warn ml-2" title="Ada aksi korporasi (split) tahun ini">
                    split
                  </span>
                )}
              </td>
              <td className="text-right tabular-nums">Rp {fmtNum(a.cash, 2)}</td>
              <td className="text-muted text-right tabular-nums">{a.events}×</td>
            </tr>
          ))}
        </tbody>
      </table>
      {touchesSplit && (
        <p className="text-muted mt-2 text-xs leading-relaxed">
          Angka per lembar <span className="font-semibold">tidak disesuaikan</span> dengan
          split, jadi tahun yang bertanda “split” tidak bisa dibandingkan langsung
          dengan tahun sesudahnya.
        </p>
      )}
    </>
  );
}

export function DividendDetailPanel({ initialCode }: { initialCode?: string }) {
  const { data: watchlist } = useWatchlist();
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(initialCode ?? null);

  const active = picked ?? watchlist?.[0]?.code ?? null;
  const { data, error, isLoading } = useStockDividends(active);

  const input = typed.trim().toUpperCase();
  const inputValid = CODE_RE.test(input);

  return (
    <Card
      title="Riwayat Dividen per Emiten"
      subtitle="Dividen tunai per lembar, plus aksi korporasi yang pernah dilakukan"
      right={
        <div className="flex items-center gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValid) setPicked(input);
            }}
            placeholder="Kode…"
            maxLength={5}
            className="input w-24 uppercase placeholder:normal-case"
            aria-label="Kode emiten"
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!inputValid}
            onClick={() => setPicked(input)}
          >
            Lihat
          </button>
        </div>
      }
    >
      {/* quick picks */}
      {watchlist && watchlist.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {watchlist.slice(0, 12).map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => setPicked(r.code)}
              className={`chip ${active === r.code ? "chip-active" : ""}`}
            >
              {r.code}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <EmptyState message="Masukkan kode emiten, atau tambahkan dulu ke watchlist." />
      ) : error ? (
        <ErrorState
          message={
            error instanceof ApiError && error.status === 404
              ? `${active} tidak ada di database harga.`
              : `Gagal memuat dividen ${active}: ${error.message}`
          }
        />
      ) : isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href={`/stock/${data.code}`} className="text-lg font-bold hover:underline">
              {data.code}
            </Link>
            <span className="text-muted text-sm">{data.name ?? "-"}</span>
            <span className="text-muted ml-auto text-xs tabular-nums">
              Harga {fmtNum(data.close)} · {data.as_of ?? "-"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat
              label="Yield TTM"
              value={fmtPct(data.yield_pct)}
              tone={trendClass(data.yield_pct)}
            />
            <Stat label="Dividen TTM" value={`Rp ${fmtNum(data.ttm_cash, 2)}`} />
            <Stat label="Bayar (12 bln)" value={`${data.ttm_events}×`} />
            <Stat label="Total sejak awal" value={`Rp ${fmtNum(data.total_cash, 2)}`} />
          </div>

          {data.total_events === 0 ? (
            <EmptyState message={`${data.code} belum pernah membagikan dividen tunai menurut data ini.`} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Per tahun
                  </p>
                  <AnnualTable annual={data.annual} splits={data.splits} />
                </div>
                <div>
                  <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Pembayaran terakhir
                  </p>
                  <div className="max-h-56 overflow-auto">
                    <table className="data-table">
                      <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
                        <tr>
                          <th className="text-left">Ex-date</th>
                          <th className="text-right">Per lembar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.history.slice(0, 40).map((h) => (
                          <tr key={`${h.ex_date}-${h.cash_amount}`}>
                            <td className="tabular-nums">{h.ex_date}</td>
                            <td className="text-right tabular-nums">
                              Rp {fmtNum(h.cash_amount, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted mt-1 text-xs tabular-nums">
                    {data.total_events} pembayaran ·{" "}
                    {data.first_ex_date ? `sejak ${data.first_ex_date}` : ""}
                    {data.growth_pct !== null && (
                      <>
                        {" "}
                        · YoY{" "}
                        <span className={trendClass(data.growth_pct)}>
                          {fmtPct(data.growth_pct)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {data.splits.length > 0 && (
                <div>
                  <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Aksi korporasi ({data.splits.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.splits.map((s) => (
                      <span key={`${s.ex_date}-${s.action_type}`} className="chip">
                        {s.ex_date} ·{" "}
                        {s.action_type === "reverse_split" ? "reverse split" : "split"}{" "}
                        {s.ratio ? `${s.ratio}:1` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
