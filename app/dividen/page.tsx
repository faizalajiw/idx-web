"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useCorpActions,
  useDividendOverview,
  useDividendStocks,
} from "@/lib/hooks";
import { fmtNum, fmtPct, trendClass } from "@/lib/format";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { DividendYearChart } from "@/components/DividendYearChart";
import { DividendDetailPanel } from "@/components/DividendDetailPanel";

type SortKey = "yield" | "cash" | "recent";

const SORT_LABELS: { id: SortKey; label: string }[] = [
  { id: "yield", label: "Yield TTM" },
  { id: "cash", label: "Total/lembar" },
  { id: "recent", label: "Terbaru" },
];

const ACTION_LABELS: Record<string, string> = {
  dividend: "Dividen",
  split: "Split",
  reverse_split: "Reverse Split",
  bonus: "Bonus",
  rights: "Rights",
};

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone ?? ""}`}>{value}</p>
      {hint && <p className="text-muted mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

function YieldTable({ rows }: { rows: { code: string; name: string | null; close: number | null; ttm_cash: number; ttm_events: number; yield_pct: number | null }[] }) {
  if (rows.length === 0) return <EmptyState message="Belum ada emiten yang membayar dividen dalam 12 bulan terakhir." />;
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="data-table">
        <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
          <tr>
            <th className="text-left">Kode</th>
            <th className="text-right">Harga</th>
            <th className="text-right">Dividen TTM</th>
            <th className="text-right">Bayar</th>
            <th className="text-right">Yield</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td>
                <Link href={`/stock/${r.code}`} className="font-semibold hover:underline">
                  {r.code}
                </Link>
                {r.name && (
                  <span className="text-muted ml-2 hidden text-xs xl:inline">
                    {r.name.length > 20 ? `${r.name.slice(0, 20)}…` : r.name}
                  </span>
                )}
              </td>
              <td className="text-right tabular-nums">{fmtNum(r.close)}</td>
              <td className="text-right tabular-nums">Rp {fmtNum(r.ttm_cash, 2)}</td>
              <td className="text-muted text-right tabular-nums">{r.ttm_events}×</td>
              <td className={`text-right font-semibold tabular-nums ${trendClass(r.yield_pct)}`}>
                {fmtPct(r.yield_pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentTable({
  rows,
}: {
  rows: { code: string; name: string | null; ex_date: string | null; cash_amount: number | null; close: number | null }[];
}) {
  if (rows.length === 0) return <EmptyState message="Tidak ada pembayaran dividen dalam 90 hari terakhir." />;
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="data-table">
        <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
          <tr>
            <th className="text-left">Ex-date</th>
            <th className="text-left">Kode</th>
            <th className="text-right">Per lembar</th>
            <th className="text-right">Yield</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct =
              r.cash_amount && r.close && r.close > 0
                ? (r.cash_amount / r.close) * 100
                : null;
            return (
              <tr key={`${r.ex_date}-${r.code}`}>
                <td className="tabular-nums">{r.ex_date}</td>
                <td>
                  <Link href={`/stock/${r.code}`} className="font-semibold hover:underline">
                    {r.code}
                  </Link>
                </td>
                <td className="text-right tabular-nums">Rp {fmtNum(r.cash_amount, 2)}</td>
                <td className="text-muted text-right tabular-nums">{pct === null ? "-" : `${pct.toFixed(2)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllPayers() {
  const [sort, setSort] = useState<SortKey>("yield");
  const [minYield, setMinYield] = useState(0);
  const [limit, setLimit] = useState(100);
  const { data, error, isLoading } = useDividendStocks(minYield, sort, limit);

  return (
    <Card
      title="Semua Emiten Pembagi Dividen"
      subtitle="Yield = dividen tunai 12 bulan terakhir ÷ harga terakhir. Cek kolom “bayar” — yield tinggi dari 1× bayar biasanya dividen spesial."
      right={
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Urutkan"
          >
            {SORT_LABELS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="text-muted flex items-center gap-1.5 text-xs">
            Min yield
            <input
              type="number"
              min={0}
              step={0.5}
              value={minYield}
              onChange={(e) => setMinYield(Math.max(0, Number(e.target.value) || 0))}
              className="input w-16"
            />
            %
          </label>
          <select
            className="input"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Jumlah baris"
          >
            {[50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} baris
              </option>
            ))}
          </select>
        </div>
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat daftar dividen: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-72" />
      ) : data.length === 0 ? (
        <EmptyState message="Tidak ada emiten yang lolos filter yield." />
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="data-table">
            <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
              <tr>
                <th className="text-left">Kode</th>
                <th className="text-right">Harga</th>
                <th className="text-right">Dividen TTM</th>
                <th className="text-right">Yield TTM</th>
                <th className="text-right">Total/lembar</th>
                <th className="text-right">Bayar</th>
                <th className="text-right">Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.code}>
                  <td>
                    <Link href={`/stock/${r.code}`} className="font-semibold hover:underline">
                      {r.code}
                    </Link>
                    {r.name && (
                      <span className="text-muted ml-2 hidden text-xs xl:inline">
                        {r.name.length > 22 ? `${r.name.slice(0, 22)}…` : r.name}
                      </span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">{fmtNum(r.close)}</td>
                  <td className="text-right tabular-nums">Rp {fmtNum(r.ttm_cash, 2)}</td>
                  <td className={`text-right font-semibold tabular-nums ${trendClass(r.yield_pct)}`}>
                    {fmtPct(r.yield_pct)}
                  </td>
                  <td className="text-muted text-right tabular-nums">
                    Rp {fmtNum(r.total_cash_per_share, 2)}
                  </td>
                  <td className="text-muted text-right tabular-nums">
                    {r.ttm_events}/{r.total_events}
                  </td>
                  <td className="text-muted text-right tabular-nums">{r.last_ex_date ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CorpActions() {
  const { data, error, isLoading } = useCorpActions("split", 40);
  return (
    <Card
      title="Aksi Korporasi Terbaru"
      subtitle="Split & reverse split 40 terakhir — ini yang menjelaskan lompatan harga di chart"
    >
      {error ? (
        <ErrorState message={`Gagal memuat aksi korporasi: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-48" />
      ) : data.length === 0 ? (
        <EmptyState message="Belum ada aksi korporasi tercatat." />
      ) : (
        <div className="max-h-[320px] overflow-auto">
          <table className="data-table">
            <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
              <tr>
                <th className="text-left">Ex-date</th>
                <th className="text-left">Kode</th>
                <th className="text-left">Jenis</th>
                <th className="text-right">Rasio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={`${a.code}-${a.ex_date}-${a.action_type}`}>
                  <td className="tabular-nums">{a.ex_date}</td>
                  <td>
                    <Link href={`/stock/${a.code}`} className="font-semibold hover:underline">
                      {a.code}
                    </Link>
                  </td>
                  <td className="text-muted">{ACTION_LABELS[a.action_type] ?? a.action_type}</td>
                  <td className="text-right tabular-nums">
                    {a.ratio ? `${a.ratio}:1` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function DividenPage() {
  const { data, error, isLoading } = useDividendOverview();
  const totals = data?.totals;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dividen & <span className="gradient-text">Aksi Korporasi</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          {data ? `${data.totals.events.toLocaleString("id-ID")} pembayaran dividen · per ${data.as_of}` : "Memuat data dividen…"}
        </p>
      </div>

      <div className="card p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
        <span className="font-semibold text-[var(--fg)]">Cara baca: </span>
        Yield = dividen tunai 12 bulan terakhir dibagi harga terakhir. Ini{" "}
        <span className="font-semibold text-[var(--fg)]">bukan</span> jadwal dividen ke
        depan — sumber gratis yang kita pakai hanya memuat aksi korporasi yang{" "}
        <span className="text-down font-medium">sudah terjadi</span>, jadi tidak ada
        tanggal cum/ex-date mendatang. Karena itu juga tidak ada angka “total dividen
        seluruh emiten”: nilai dividen disimpan <em>per lembar</em>, dan menjumlahkannya
        antar emiten tidak ada artinya.
      </div>

      {error ? (
        <ErrorState message={`Gagal memuat data dividen: ${error.message}`} />
      ) : isLoading || !data || !totals ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Pembayaran (12 bln)"
              value={totals.ttm_events.toLocaleString("id-ID")}
              hint={`${totals.ttm_codes} emiten`}
            />
            <Stat
              label="Emiten pembagi"
              value={totals.ttm_codes.toLocaleString("id-ID")}
              hint={`${totals.codes} emiten sepanjang data`}
            />
            <Stat
              label="Rata-rata yield TTM"
              value={fmtPct(totals.avg_ttm_yield)}
              hint={`median ${fmtPct(totals.median_ttm_yield)}`}
            />
            <Stat
              label="Yield tertinggi"
              value={fmtPct(totals.max_ttm_yield)}
              hint="hati-hati dividen spesial 1×"
              tone="text-up"
            />
          </div>

          <Card
            title="Aktivitas Dividen per Tahun"
            subtitle={`${totals.splits} aksi korporasi (split) tercatat · rentang ${totals.first_ex_date} → ${totals.last_ex_date}`}
          >
            <DividendYearChart years={data.by_year} />
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Yield Tertinggi (12 bulan)" subtitle="25 emiten dengan yield trailing tertinggi">
              <YieldTable rows={data.top_yield} />
            </Card>
            <Card
              title="Baru Dibayar"
              subtitle={`Ex-date dalam ${data.recent_days} hari terakhir`}
            >
              <RecentTable rows={data.recent} />
            </Card>
          </div>

          <AllPayers />

          <DividendDetailPanel />

          <CorpActions />

          <p className="text-muted text-xs leading-relaxed">{data.disclaimer}</p>
        </>
      )}
    </main>
  );
}
