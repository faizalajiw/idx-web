"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useStockDecision, useWatchlist } from "@/lib/hooks";
import { fmtCompact, fmtPct } from "@/lib/format";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

// ---------------------------------------------------------------- pemilih

function StockPicker({ value }: { value: string | null }) {
  const { data: watchlist } = useWatchlist();
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => setDraft(value ?? ""), [value]);

  const suggestions = useMemo(() => {
    const base = (watchlist ?? []).map((w) => w.code);
    const pool = value && !base.includes(value) ? [value, ...base] : base;
    const q = draft.trim().toUpperCase();
    if (!q) return pool.slice(0, 8);
    return pool.filter((c) => c.includes(q)).slice(0, 8);
  }, [watchlist, draft, value]);

  return (
    <div className="space-y-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const code = draft.trim().toUpperCase();
          if (code) window.location.href = `/keputusan/${code}`;
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
          Analisis
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted text-[11px]">Cepat:</span>
          {suggestions.map((c) => (
            <Link
              key={c}
              href={`/keputusan/${c}`}
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

// ------------------------------------------------------------- util warna

function verdictTone(verdict: string | undefined): string {
  switch (verdict) {
    case "STRONG HOLD":
      return "var(--up)";
    case "HOLD":
      return "var(--accent)";
    case "TRIM":
      return "#f59e0b";
    case "EXIT":
      return "var(--down)";
    default:
      return "var(--fg)";
  }
}

const pct1 = (v: number | null | undefined) =>
  v === null || v === undefined ? "-" : `${(v * 100).toFixed(1)}%`;

// ----------------------------------------------------------------- badge

function VerdictBadge({ verdict, score }: { verdict?: string; score?: number }) {
  if (!verdict) return <span className="text-muted text-sm">Tidak ada verdict</span>;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-2xl font-bold" style={{ color: verdictTone(verdict) }}>
        {verdict}
      </span>
      <span className="text-muted tabular-nums">
        skor {score ?? "-"}/100
      </span>
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// --------------------------------------------------------- strip konteks

function ContextStrip({ d }: { d: NonNullable<import("@/lib/types").StockDecision> }) {
  const regime = d.regime?.regime ?? "-";
  const regimeDown = d.regime?.dir_hint === "down";
  const sent = d.sentiment;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-lg border border-[var(--border)] p-2.5">
        <p className="text-muted text-[11px]">Regime IHSG</p>
        <p
          className="mt-0.5 text-sm font-semibold"
          style={{ color: regimeDown ? "var(--down)" : regime.startsWith("TRENDING") ? "var(--up)" : undefined }}
        >
          {regime}
        </p>
        {d.regime?.adx != null && (
          <p className="text-muted text-[10px] tabular-nums">ADX {Number(d.regime.adx).toFixed(0)} · as-of {d.regime.as_of ?? "-"}</p>
        )}
      </div>
      <div className="rounded-lg border border-[var(--border)] p-2.5">
        <p className="text-muted text-[11px]">Sentimen aliran</p>
        <p
          className="mt-0.5 text-sm font-semibold"
          style={{ color: (sent?.score ?? 0) > 0 ? "var(--up)" : (sent?.score ?? 0) < 0 ? "var(--down)" : undefined }}
        >
          {sent ? sent.label : "Tidak ada dasar"}
        </p>
        {sent && <p className="text-muted text-[10px] tabular-nums">skor {sent.score.toFixed(2)}</p>}
      </div>
      <div className="rounded-lg border border-[var(--border)] p-2.5">
        <p className="text-muted text-[11px]">Flip asing terakhir</p>
        <p className="mt-0.5 text-sm font-semibold">
          {d.last_flip ? (
            <span style={{ color: d.last_flip.to === "net_buy" ? "var(--up)" : "var(--down)" }}>
              {d.last_flip.to === "net_buy" ? "→ Net Buy" : "→ Net Sell"}
            </span>
          ) : (
            "Belum ada"
          )}
        </p>
        {d.last_flip && <p className="text-muted text-[10px]">{d.last_flip.date}</p>}
      </div>
      <div className="rounded-lg border border-[var(--border)] p-2.5">
        <p className="text-muted text-[11px]">Gauge pasar</p>
        <p className="mt-0.5 text-sm font-semibold">
          {d.market_gauge ? `${Number(d.market_gauge.score).toFixed(0)}/100` : "-"}
        </p>
        {d.market_gauge?.band && <p className="text-muted text-[10px]">{d.market_gauge.band}</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------- jejak asing mini

function ForeignMini({ rows }: { rows: { date: string; net: number | null; flip: boolean | null }[] }) {
  const vals = rows.filter((r) => r.net !== null);
  if (vals.length === 0) return <EmptyState message="Belum ada jejak asing." />;
  const maxAbs = Math.max(...vals.map((r) => Math.abs(r.net!)), 1);
  return (
    <div className="space-y-1">
      {vals.map((r) => (
        <div key={r.date} className="flex items-center gap-2 text-[11px]">
          <span className="text-muted w-14 shrink-0 tabular-nums">{r.date.slice(5)}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <span
              className="absolute top-0 h-full rounded-full"
              style={{
                width: `${(Math.abs(r.net!) / maxAbs) * 50}%`,
                left: r.net! >= 0 ? "50%" : undefined,
                right: r.net! < 0 ? "50%" : undefined,
                backgroundColor: r.flip ? "#f59e0b" : r.net! >= 0 ? "var(--up)" : "var(--down)",
              }}
            />
            <span className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
          </div>
          <span className={`w-14 shrink-0 text-right tabular-nums ${r.net! >= 0 ? "text-up" : "text-down"}`}>
            Rp {fmtCompact(r.net!)}
          </span>
        </div>
      ))}
      <p className="text-muted text-[10px]">Amber = hari flip (pergantian arah asing).</p>
    </div>
  );
}

// -------------------------------------------------------------- level stop

function InvalidationLevels({ inv }: { inv: NonNullable<import("@/lib/types").StockDecision["invalidation"]> }) {
  const rows = [
    { label: "Close sekarang", level: inv.close, note: "harga terakhir" },
    { label: "SMA50", level: inv.ma50_level, note: "tren menengah patah kalau ditutup di bawahnya" },
    { label: "Mean 60-hari", level: inv.mean60_level, note: " tengah band wajar; jauh di atasnya = overextended" },
    { label: "Bollinger bawah", level: inv.bb_lower != null ? Math.round(inv.bb_lower) : null, note: "tekanan jual kalau ditembus" },
  ].filter((r) => r.level != null);
  return (
    <div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3 text-[11px]">
            <span className="font-medium">{r.label}</span>
            <span className="text-muted flex-1 truncate text-right">{r.note}</span>
            <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
              Rp {Number(r.level).toLocaleString("id-ID")}
            </span>
          </li>
        ))}
      </ul>
      {inv.rsi != null && (
        <p className="text-muted mt-1.5 text-[11px]">
          RSI {inv.rsi.toFixed(0)} — {inv.rsi >= 65 ? "mendekati overbought" : inv.rsi <= 35 ? "mendekati oversold" : "netral"}
        </p>
      )}
    </div>
  );
}

// -------------------------------------------------------------- workspace

export function DecisionWorkspace({ code }: { code: string | null }) {
  const { data, error, isLoading } = useStockDecision(code);
  const hc = data?.hold_check;

  return (
    <div className="space-y-4">
      <StockPicker value={code} />

      {code ? (
        error ? (
          <ErrorState message={`Gagal memuat keputusan: ${error.message}`} />
        ) : isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* --- verdict dasar --- */}
            <Card
              title={`Ruang Keputusan — ${code}`}
              subtitle="Verdict gabungan teknikal + valuasi + lapisan IC/broker"
              info="Satu verdict dari Hold Check (satu sumber kebenaran skor). Konteks di bawah (regime, sentimen, base rate) tidak mengubah verdict — mereka membantu lo menilai seberapa besar percaya diri terhadap verdict itu. Alat bantu riset, bukan rekomendasi beli/jual."
            >
              {!hc ? (
                <EmptyState message="Emiten tidak ditemukan / histori tidak cukup untuk verdict." />
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <VerdictBadge verdict={hc.verdict} score={hc.score} />
                    <p className="text-muted text-[11px] tabular-nums">
                      dasar {hc.base_score} · faktor {hc.factor_adj >= 0 ? "+" : ""}
                      {hc.factor_adj} · broker{" "}
                      {hc.broker_adj >= 0 ? "+" : ""}
                      {hc.broker_adj}
                    </p>
                  </div>
                  <MiniBar value={hc.score} color={verdictTone(hc.verdict)} />
                  <ul className="space-y-1">
                    {hc.reasons.map((r, i) => (
                      <li key={i} className="text-muted flex gap-2 text-[11px] leading-snug">
                        <span>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* --- konteks pasar & aliran --- */}
            <ContextStrip d={data} />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card
                title="Jejak Asing 10 Sesi"
                subtitle="Arah aliran asing agregat per hari"
                info="Net flow asing (rupiah) 10 sesi terakhir. Berturut-turut satu arah = tekanan yang jelas; bolak-balik = asing ragu."
              >
                <ForeignMini rows={data.foreign_10} />
              </Card>

              <Card
                title="Level Pembatalan"
                subtitle="Kalau harga tutup di bawah level ini, tesis lo patah"
                info="Level teknikal sederhana dari data harga emiten ini. Bukan garis sakti — tapi lebih baik punya level yang jelas daripada menahan posisi tanpa batas."
              >
                {data.invalidation ? (
                  <InvalidationLevels inv={data.invalidation} />
                ) : (
                  <EmptyState message="Histori harga belum cukup untuk menghitung level." />
                )}
              </Card>
            </div>

            {/* --- base rate event --- */}
            {data.events.length > 0 && (
              <Card
                title="Base Rate Event"
                subtitle="Apa yang biasanya terjadi setelah event serupa (semua emiten)"
                info="Event study: hitungan riwayat emiten ini vs baseline pasar untuk event yang sama. Median return forward & abnormal (vs pasar). Sampel kecil = baca sekilas saja."
              >
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="text-left">Event</th>
                        <th className="text-right">Emiten</th>
                        <th className="text-right">Median fwd</th>
                        <th className="text-right">Median abn.</th>
                        <th className="text-right">Pasar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events.map((e) => (
                        <tr key={e.event}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-medium">{e.event}</span>
                              <span className="text-muted max-w-[260px] truncate text-[10px]">{e.description}</span>
                            </div>
                          </td>
                          <td className="text-right tabular-nums">
                            {e.my_count}×{" "}
                            {e.my_last_date && (
                              <span className="text-muted text-[10px]">({e.my_last_date})</span>
                            )}
                          </td>
                          <td className={`text-right tabular-nums ${(e.my_median_fwd ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                            {e.my_median_fwd === null ? "-" : fmtPct(e.my_median_fwd * 100)}
                          </td>
                          <td className={`text-right tabular-nums ${(e.my_median_abnormal ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                            {e.my_median_abnormal === null ? "-" : fmtPct(e.my_median_abnormal * 100)}
                          </td>
                          <td className="text-muted text-right tabular-nums">
                            {e.market_count} · {pct1(e.market_hit_rate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <p className="text-muted text-[10px] leading-snug">
              Dihitung {data.generated_at} · bukan rekomendasi beli/jual — verdict
              adalah ringkasan data yang tersedia, keputusan akhir tetap milik lo.
            </p>
          </>
        )
      ) : (
        <EmptyState message="Masukkan kode emiten untuk melihat verdict gabungan, konteks aliran, dan level pembatalannya." />
      )}
    </div>
  );
}
