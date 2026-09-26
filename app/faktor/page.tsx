"use client";

import { useFactorsOverview, useRegimeHistory } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { fmtNum } from "@/lib/format";
import { Check } from "lucide-react";

const f4 = (v: number | null) => (v === null ? "-" : v.toFixed(4));
const f2 = (v: number | null) => (v === null ? "-" : v.toFixed(2));
const p1 = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);

const FACTOR_LABEL: Record<string, string> = {
  vol_21d: "Volatilitas 21h",
  turnover_21d: "Likuiditas 21h",
  dist_52w_high: "Jarak puncak 52w",
  mom_5d: "Momentum 5h",
  mom_10d: "Momentum 10h",
  mom_21d: "Momentum 21h",
  mom_63d: "Momentum 63h",
  mom_12_1: "Momentum 12-1",
  rev_1d: "Reversal 1h",
  amihud_21d: "Illiquidity Amihud",
  rel_volume: "Volume relatif",
  vol_rank_63d: "Rank volume 63h",
  foreign_net_pct: "Foreign net %",
  foreign_streak: "Foreign streak",
  ob_imbalance: "Ketimpangan buku",
  ob_absorption: "Absorption",
};

/** Fallback registry bila API belum menyertakan `definitions`. */
const FACTOR_FALLBACK: Record<string, string> = {
  mom_5d: "Return 5 hari bursa (momentum jangka pendek)",
  mom_10d: "Return 10 hari bursa",
  mom_21d: "Return 1 bulan bursa (~21 hari)",
  mom_63d: "Return 3 bulan bursa (~63 hari)",
  mom_12_1: "Momentum klasik 12-1: return ~252h dikurangi bulan terakhir",
  rev_1d: "Reversal 1 hari (kebalikan return kemarin)",
  vol_21d: "Volatilitas 21 hari (std return harian)",
  amihud_21d: "Illiquidity Amihud 21 hari: |ret| per rupiah volume",
  turnover_21d: "Rata-rata value transaksi 21 hari (log)",
  rel_volume: "Volume hari ini relatif rata-rata 21 hari",
  dist_52w_high: "Jarak dari puncak 52 minggu (<= 0)",
  vol_rank_63d: "Percentile volume hari ini dalam 63 hari terakhir",
  foreign_net_pct: "Foreign net / value transaksi (hari yang sama)",
  foreign_streak: "Hari berturut-turut foreign net positif (negatif = jual)",
  ob_imbalance: "Ketimpangan buku intraday: (bid_vol-offer_vol)/(total) rata-rata",
  ob_absorption: "Buku vs arah harga: imbalance tertanda saat tick bergerak (negatif = absorption)",
};

const REGIME_BADGE: Record<string, string> = {
  TRENDING_UP: "badge badge-buy",
  TRENDING_DOWN: "badge badge-sell",
  TRANSITION: "badge badge-warn",
  RANGING: "badge badge-hold",
};

function FactorRegistry() {
  const { data } = useFactorsOverview();
  const defs = data?.definitions ?? FACTOR_FALLBACK;
  const entries = Object.entries(defs);
  return (
    <div className="space-y-2">
      <p className="text-muted text-sm">
        {entries.length} faktor dihitung engine IC tiap rekalibrasi —
        termasuk faktor order-book dari snapshot intraday.
      </p>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
        {entries.map(([key, desc]) => (
          <li key={key} className="flex flex-col border-b border-[var(--border)] pb-1.5">
            <span className="text-sm font-medium">{FACTOR_LABEL[key] ?? key}</span>
            <span className="text-muted text-xs">{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeightsCard() {
  const { data, error, isLoading } = useFactorsOverview();
  if (error) return <ErrorState message="Gagal memuat bobot faktor." />;
  if (isLoading || !data) return <Skeleton className="h-24 w-full" />;
  if (!data.latest_run)
    return (
      <EmptyState message="Belum ada run IC tersimpan. Jalankan `idx ic` — bobot composite memakai default indikatif." />
    );

  const total = Object.values(data.weights).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3">
      <p className="text-muted text-sm">
        Bobot aktif (run {data.latest_run}, horizon 10 hari bursa, proporsional |IC|):
      </p>
      <div className="space-y-2">
        {Object.entries(data.weights).map(([factor, w]) => (
          <div key={factor}>
            <div className="flex justify-between text-xs">
              <span className="font-medium">{FACTOR_LABEL[factor] ?? factor}</span>
              <span className="text-muted tabular-nums">
                {(w * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${total > 0 ? (w / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted text-[11px]">
        Bobot di atas 0 hanya untuk faktor yang lolos ambang ketat (|IC| ≥ 0,05
        dan |ICIR| ≥ 0,5). Bila tidak ada yang lolos, composite memakai bobot
        default indikatif — keputusan tetap didominasi sinyal teknikal.
      </p>
    </div>
  );
}

function FactorsTable({ horizon }: { horizon: 5 | 10 }) {
  const { data, error, isLoading } = useFactorsOverview();
  if (error) return <ErrorState message="Gagal memuat faktor." />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  if (!data.latest_run) return <EmptyState />;

  const rows = data.factors.filter((f) => f.horizon === horizon);
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Faktor</th>
            <th className="text-right">Mean IC</th>
            <th className="text-right">ICIR</th>
            <th className="text-right">t-stat (NW)</th>
            <th className="text-right">Hit rate</th>
            <th className="text-right">Hari</th>
            <th className="text-center">Layak</th>
            <th className="text-right">Bobot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.factor}>
              <td className="font-medium">{FACTOR_LABEL[f.factor] ?? f.factor}</td>
              <td
                className={`text-right tabular-nums ${
                  f.mean_ic !== null && Math.abs(f.mean_ic) >= 0.05 ? "text-up" : ""
                }`}
              >
                {f4(f.mean_ic)}
              </td>
              <td className="text-right tabular-nums">{f2(f.icir)}</td>
              <td className="text-right tabular-nums">{f2(f.t_stat)}</td>
              <td className="text-muted text-right tabular-nums">{p1(f.hit_rate)}</td>
              <td className="text-muted text-right tabular-nums">{f.n_days ?? "-"}</td>
              <td className="text-center">
                {f.eligible ? (
                  <span className="badge badge-buy"><Check size={13} /></span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="text-right tabular-nums">
                {f.weight && f.weight > 0 ? `${(f.weight * 100).toFixed(0)}%` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalibrationHistory() {
  const { data, error, isLoading } = useFactorsOverview();
  if (error || isLoading || !data) return null;
  if (!data.latest_run || data.history.length === 0) return <EmptyState />;
  return (
    <div className="flex flex-wrap gap-2">
      {data.history.map((h) => (
        <span key={h.run_date} className="badge badge-hold tabular-nums">
          {h.run_date}: {h.rows} baris · {h.eligible} layak
        </span>
      ))}
    </div>
  );
}

function RegimeSummary() {
  const { data, error, isLoading } = useRegimeHistory(90);
  if (error || isLoading || !data) return null;
  const s = data.summary;
  if (!s || s.days === 0)
    return (
      <p className="text-muted text-sm">
        Histori regime belum tersedia — job harian 16:20 WIB akan mengisinya
        (atau buka halaman ini lagi untuk memicu backfill).
      </p>
    );
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">
        {s.days} hari bursa ({s.first} → {s.last}) · rata-rata ADX{" "}
        {s.avg_adx} · {s.transitions} transisi regime.
      </p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(s.share).map(([rg, pct]) => (
          <span key={rg} className={`${REGIME_BADGE[rg] ?? "badge badge-hold"} tabular-nums`}>
            {rg.replace("TRENDING_", "TREND ").replace("_", " ")}: {pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FaktorPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Faktor &amp; <span className="gradient-text">Kalibrasi</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Hasil IC analysis bulanan: faktor mana yang benar-benar predictive di
          data IDX, dan bobot yang dipakai composite Hold Check.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Bobot Composite Aktif" subtitle="Dari run IC terbaru — otomatis dipakai Hold Check">
          <WeightsCard />
        </Card>
        <Card title="Regime IHSG Historis" subtitle="Distribusi regime + transisi (backfill otomatis)">
          <RegimeSummary />
        </Card>
      </div>

      <Card title="IC per Faktor — Horizon 5 hari" subtitle="Spearman rank IC faktor vs forward return, fill T+1">
        <FactorsTable horizon={5} />
      </Card>
      <Card title="IC per Faktor — Horizon 10 hari" subtitle="Horizon acuan bobot composite">
        <FactorsTable horizon={10} />
      </Card>

      <Card title="Riwayat Rekalibrasi" subtitle="Setiap run menyimpan snapshot lengkap — idempoten per tanggal">
        <CalibrationHistory />
      </Card>

      <Card title="Registry Faktor" subtitle="Semua faktor yang dihitung — definisi persis seperti di kode">
        <FactorRegistry />
      </Card>

      <p className="text-muted text-[11px] leading-snug">
        Metodologi: IC = korelasi rank (Spearman) antara nilai faktor di hari T
        dan return T+1 → T+1+k; t-stat memakai Newey-West lag 5 karena window
        return tumpang tindih. Ambang kelayakan |IC| ≥ 0,05 dan |ICIR| ≥ 0,5
        adalah rule-of-thumb kuantitatif, bukan jaminan hasil masa depan.
      </p>
    </main>
  );
}
