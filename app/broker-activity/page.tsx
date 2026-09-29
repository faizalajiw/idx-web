"use client";

import { useBrokerActivity } from "@/lib/hooks";
import { BrokerFlowCard } from "@/components/BrokerFlowCard";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { LastUpdated } from "@/components/LastUpdated";
import { fmtCompact, fmtPct, fmtNum, trendClass } from "@/lib/format";
import type {
  BrokerActivityDriver,
  BrokerActivityFactor,
  BrokerActivityRow,
} from "@/lib/types";
import { Check, Info } from "lucide-react";

const f4 = (v: number | null) => (v === null ? "-" : v.toFixed(4));
const f2 = (v: number | null) => (v === null ? "-" : v.toFixed(2));
const p0 = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(0)}%`);

/** Bar skor 0–100. Skala relatif: 50 = median pasar, bukan "netral = aman". */
function ScoreBar({ score }: { score: number }) {
  const above = score >= 50;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums">
        {score.toFixed(0)}
      </span>
      <div className="h-1.5 w-full min-w-[52px] overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${above ? "bg-[var(--accent)]" : "bg-white/30"}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function DriverChip({ d }: { d: BrokerActivityDriver }) {
  // Tanda kontribusi = arah dorongan ke skor (bukan arah harga).
  return (
    <span className="badge badge-hold gap-1 whitespace-nowrap">
      <span className={d.contribution >= 0 ? "text-up" : "text-down"}>
        {d.contribution >= 0 ? "▲" : "▼"}
      </span>
      {d.label}
      {d.percentile !== null && (
        <span className="text-muted tabular-nums">{p0(d.percentile)}</span>
      )}
    </span>
  );
}

function RankingTable() {
  const { data, error, isLoading } = useBrokerActivity(25);

  if (error) return <ErrorState message={`Gagal memuat Aktivitas Broker: ${error.message}`} />;
  if (isLoading || !data) return <Skeleton className="h-72 w-full" />;

  if (!data.validated)
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-[rgba(255,193,7,0.3)] bg-[rgba(255,193,7,0.07)] p-3 text-sm">
          <p className="font-medium">Skor belum tervalidasi — sengaja tidak ditampilkan.</p>
          <p className="text-muted mt-1">{data.reason}</p>
        </div>
        <p className="text-muted text-xs leading-snug">
          Menu ini hanya menghitung skor dari faktor yang sudah lulus uji statistik
          (Information Coefficient). Menampilkan ranking sebelum ada faktor yang
          lolos berarti menyajikan angka tanpa dasar — jadi lebih baik kosong.
        </p>
      </div>
    );

  if (data.rows.length === 0) return <EmptyState message="Tidak ada emiten dengan data aliran yang cukup." />;

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">#</th>
            <th className="text-left">Emiten</th>
            <th className="text-left">Skor akumulasi</th>
            <th className="text-right">Harga</th>
            <th className="text-right">%</th>
            <th className="text-left">Sinyal utama</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r: BrokerActivityRow, i: number) => (
            <tr key={r.code}>
              <td className="text-muted tabular-nums">{i + 1}</td>
              <td>
                <div className="flex flex-col">
                  <span className="font-semibold">{r.code}</span>
                  {r.name && (
                    <span className="text-muted max-w-[190px] truncate text-[10px]">
                      {r.name}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <ScoreBar score={r.score} />
              </td>
              <td className="text-right tabular-nums">{fmtNum(r.close, 2)}</td>
              <td className={`text-right tabular-nums ${trendClass(r.percent)}`}>
                {fmtPct(r.percent)}
              </td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {r.drivers.length === 0 ? (
                    <span className="text-muted text-xs">—</span>
                  ) : (
                    r.drivers.map((d) => <DriverChip key={d.factor} d={d} />)
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted mt-3 text-[11px] leading-snug">
        Skala skor 0–100 bersifat <em>relatif</em>: 50 = median pasar, dan angka
        ini memeringkatkan emiten terhadap emiten lain pada hari yang sama —
        bukan perkiraan persentase kenaikan harga. Data harga{" "}
        {data.as_of ?? "-"}.
      </p>
    </div>
  );
}

function FactorGate() {
  const { data, error, isLoading } = useBrokerActivity(25);
  if (error) return <ErrorState message="Gagal memuat uji faktor." />;
  if (isLoading || !data) return <Skeleton className="h-56 w-full" />;
  if (data.factors.length === 0)
    return (
      <EmptyState message="Belum ada faktor aliran yang diuji — jalankan `idx ic` di backend dulu." />
    );

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Faktor</th>
            <th className="text-right">Mean IC</th>
            <th className="text-right">ICIR</th>
            <th className="text-right">t-stat</th>
            <th className="text-right">Hari</th>
            <th className="text-center">Arah historis</th>
            <th className="text-center">Lulus</th>
            <th className="text-right">Bobot</th>
          </tr>
        </thead>
        <tbody>
          {data.factors.map((f: BrokerActivityFactor) => (
            <tr key={f.factor}>
              <td>
                <div className="flex flex-col">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted text-[10px]">{f.factor}</span>
                </div>
              </td>
              <td
                className={`text-right tabular-nums ${
                  f.mean_ic !== null && Math.abs(f.mean_ic) >= 0.05 ? "text-up" : ""
                }`}
              >
                {f4(f.mean_ic)}
              </td>
              <td className="text-right tabular-nums">{f2(f.icir)}</td>
              <td className="text-right tabular-nums">{f2(f.t_stat)}</td>
              <td className="text-muted text-right tabular-nums">{f.n_days ?? "-"}</td>
              <td className="text-center text-xs">
                {f.direction > 0 ? (
                  <span className="text-up">naik</span>
                ) : f.direction < 0 ? (
                  <span className="text-down">turun</span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="text-center">
                {f.eligible ? (
                  <span className="badge badge-buy">
                    <Check size={13} />
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="text-right tabular-nums">
                {f.weight > 0 ? `${(f.weight * 100).toFixed(0)}%` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted mt-3 text-[11px] leading-snug">
        &ldquo;Arah historis&rdquo; = tanda mean IC: apakah nilai faktor yang
        tinggi cenderung diikuti return positif atau negatif. Kolom ini diisi
        otomatis dari data, bukan diasumsikan. Faktor tanpa centang tidak
        menyumbang skor sama sekali.
      </p>
    </div>
  );
}

function MarketStructure() {
  const { data, error, isLoading } = useBrokerActivity(25);
  if (error) return <ErrorState message="Gagal memuat struktur broker." />;
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;

  const m = data.market;
  if (m.n_brokers === 0)
    return (
      <EmptyState message="Belum ada data broker pasar. Isi lewat `idx serve` (job 16:30 WIB) atau `python -m scripts.backfill_broker_eod`." />
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Broker aktif" value={String(m.n_brokers)} />
        <Metric label="CR1 (top 1)" value={p0(m.cr1)} />
        <Metric label="CR3 (top 3)" value={p0(m.cr3)} />
        <Metric label="CR5 (top 5)" value={p0(m.cr5)} />
        <Metric label="HHI" value={m.hhi === null ? "-" : m.hhi.toFixed(3)} />
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">Broker</th>
              <th className="text-right">Porsi</th>
              <th className="text-right">Nilai</th>
              <th className="text-right">Volume</th>
              <th className="text-right">Frekuensi</th>
            </tr>
          </thead>
          <tbody>
            {m.top.map((b, i) => (
              <tr key={b.broker_code}>
                <td className="text-muted tabular-nums">{i + 1}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-semibold">{b.broker_code}</span>
                    {b.broker_name && (
                      <span className="text-muted max-w-[200px] truncate text-[10px]">
                        {b.broker_name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right tabular-nums">{p0(b.share)}</td>
                <td className="text-right tabular-nums">Rp {fmtCompact(b.value)}</td>
                <td className="text-right tabular-nums">{fmtCompact(b.volume)}</td>
                <td className="text-muted text-right tabular-nums">
                  {b.frequency !== null ? `${fmtNum(b.frequency)}x` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted text-[11px] leading-snug">
        Total nilai transaksi pasar {m.date ?? "-"}: Rp {fmtCompact(m.total_value)}.
        HHI mengukur pemusatan: makin tinggi = makin sedikit firma yang menguasai
        transaksi (indikasi dominasi pemain besar); makin rendah = makin tersebar
        (ciri partisipasi ritel).
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] px-3 py-2">
      <p className="text-muted text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function BrokerActivityPage() {
  const { data } = useBrokerActivity(25);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Aktivitas <span className="gradient-text">Broker</span>
        </h1>
        <p className="text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          Emiten dengan jejak aliran dana terkuat hari ini, diperingkatkan oleh
          skor yang bobotnya berasal dari uji statistik — bukan feeling.
          <LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />
        </p>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${data.validated ? "badge-buy" : "badge-warn"}`}>
            {data.validated
              ? `Tervalidasi — ${data.eligible_count} faktor lolos uji`
              : "Belum tervalidasi"}
          </span>
          {data.horizon !== null && (
            <span className="badge badge-hold tabular-nums">
              Horizon {data.horizon} hari bursa
            </span>
          )}
          {data.ic_run_date && (
            <span className="badge badge-hold tabular-nums">
              Kalibrasi IC {data.ic_run_date}
            </span>
          )}
        </div>
      )}

      <div className="rounded-md border border-[var(--border)] bg-white/[0.03] p-3">
        <p className="flex items-start gap-2 text-xs leading-snug">
          <Info size={14} className="text-muted mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Yang diukur:</strong> IDX tidak mempublikasikan pembelian/
            penjualan per broker untuk tiap saham di data gratis — yang tersedia
            adalah aliran asing per emiten (notasi rupiah) dan ketimpangan buku
            order intraday. Dua sinyal itu dipakai sebagai <em>proksi</em> jejak
            akumulasi/distribusi, lalu hanya faktor yang lulus uji IC
            (|IC| ≥ 0,05 &amp; |ICIR| ≥ 0,5) yang diberi bobot. Struktur broker
            level pasar (di bawah) memakai data firma asli.
          </span>
        </p>
      </div>

      <Card
        title="Peringkat Skor Akumulasi"
        subtitle="Kombinasi faktor aliran terkuat — hanya faktor yang lulus uji IC"
        info="Skor 0-100 dari kombinasi faktor aliran yang sudah terbukti secara statistik memprediksi return di data IDX. Skor tinggi = jejak aliran dana yang historisnya diikuti kenaikan harga. Skala relatif terhadap pasar hari itu."
        right={<LastUpdated sessionDate={data?.as_of} updatedAt={data?.ic_run_date} dep={data} />}
      >
        <RankingTable />
      </Card>

      <Card
        title="Uji Statistik Faktor (IC)"
        subtitle="Faktor mana yang layak dipakai — ambang |IC| ≥ 0,05 dan |ICIR| ≥ 0,5"
        info="IC (Information Coefficient) mengukur seberapa akurat sebuah faktor aliran memprediksi arah harga ke depan. Faktor yang gagal ambang tetap ditampilkan sebagai transparansi, tapi tidak diberi bobot."
      >
        <FactorGate />
      </Card>

      <BrokerFlowCard />

      <Card
        title="Struktur Broker Pasar"
        subtitle="Konsentrasi transaksi per firma — data broker asli (EOD, seluruh pasar)"
        info="Seberapa terpusat transaksi pasar di sedikit firma broker. Data ini asli dari IDX (bukan proksi) dan berlaku untuk seluruh pasar, bukan satu saham."
        right={<LastUpdated sessionDate={data?.market.date} updatedAt={data?.market.captured_at} dep={data} />}
      >
        <MarketStructure />
      </Card>

      <p className="text-muted text-[11px] leading-snug">
        Metodologi: nilai tiap faktor di emiten diubah jadi percentile
        cross-sectional, diarahkan sesuai tanda IC-nya, lalu dijumlah berbobot
        |IC| (jumlah bobot = 1). Faktor yang nilainya kosong diperlakukan netral,
        dan emiten dengan coverage &lt; 50% dibuang. Skor ini alat riset untuk
        menyaring kandidat — bukan rekomendasi jual/beli, dan tidak menjamin
        hasil masa depan.
      </p>
    </main>
  );
}
