"use client";

import { useSentiment } from "@/lib/hooks";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import type { SentimentItem, SentimentMarket } from "@/lib/types";
import { LastUpdated } from "@/components/LastUpdated";
import { Waves, TrendingUp, TrendingDown, Activity } from "lucide-react";

const pct1 = (v: number | null) =>
  v === null ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const share = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(0)}%`);
const signed = (v: number | null, digits = 2) => (v === null ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`);

const tone = (v: number | null) =>
  v === null ? "text-muted" : v >= 0 ? "text-up" : "text-down";

function ScoreBar({ score }: { score: number }) {
  const width = Math.min(Math.abs(score), 1) * 50;
  const positive = score >= 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--border)]" />
      <div
        className={`absolute top-0 h-full ${positive ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
        style={{ width: `${width}%`, left: positive ? "50%" : undefined, right: positive ? undefined : "50%" }}
      />
    </div>
  );
}

const LABEL_BADGE: Record<string, string> = {
  "AKUMULASI KUAT": "badge badge-buy",
  "AKUMULASI": "badge badge-buy",
  "DISTRIBUSI KUAT": "badge badge-sell",
  "DISTRIBUSI": "badge badge-sell",
  "NETRAL": "badge badge-hold",
};

function SentimentList({ items, title }: { items: SentimentItem[]; title: string }) {
  if (items.length === 0) return <EmptyState message={`Tidak ada emiten dengan sinyal ${title.toLowerCase()}.`} />;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.code} className="border-b border-[var(--border)] pb-2.5 last:border-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold">{i.code}</span>
              <span className="text-muted ml-2 truncate text-xs">{i.name ?? "-"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`text-xs tabular-nums ${tone(i.percent)}`}>{pct1(i.percent)}</span>
              <span className={LABEL_BADGE[i.label] ?? "badge badge-hold"}>{i.label}</span>
            </div>
          </div>
          <div className="mt-1.5">
            <ScoreBar score={i.score} />
          </div>
          <div className="text-muted mt-1 flex flex-wrap gap-x-3 text-[11px] tabular-nums">
            <span>skor {signed(i.score)}</span>
            <span>arus asing {share(i.foreign_rank)} persentil</span>
            {i.ob_imbalance !== null && <span>buku {signed(i.ob_imbalance)}</span>}
            {i.ob_absorption !== null && <span>absorption {signed(i.ob_absorption)}</span>}
          </div>
          {i.reasons.length > 0 && (
            <ul className="text-muted mt-1 list-inside list-disc text-[11px] leading-snug">
              {i.reasons.slice(0, 2).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function MarketGauge({ market }: { market: SentimentMarket }) {
  const badge =
    market.label === "RISK-ON"
      ? "badge badge-buy"
      : market.label === "RISK-OFF"
        ? "badge badge-sell"
        : "badge badge-hold";
  const comps: [string, number | undefined][] = [
    ["Breadth harga", market.components.breadth],
    ["IHSG", market.components.index],
    ["Breadth asing", market.components.foreign],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold tabular-nums">{market.score.toFixed(0)}</div>
        <div>
          <span className={badge}>{market.label}</span>
          <p className="text-muted mt-1 text-xs">
            {market.up} naik · {market.down} turun · {market.flat} stagnan
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {comps.map(([label, v]) => (
          <div key={label}>
            <div className="flex justify-between text-xs">
              <span>{label}</span>
              <span className="text-muted tabular-nums">{signed(v ?? null)}</span>
            </div>
            <div className="mt-1">
              <ScoreBar score={v ?? 0} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted text-[11px] leading-snug">
        Skor 50 = netral; di atas 60 risk-on, di bawah 40 risk-off. Komponen =
        breadth harga, pergerakan IHSG
        {market.index_percent !== null ? ` (${pct1(market.index_percent)})` : ""}, dan
        porsi emiten yang dibeli asing
        {market.foreign_breadth !== null ? ` (${share(market.foreign_breadth)})` : ""}.
      </p>
    </div>
  );
}

export default function SentimenPage() {
  const { data, error, isLoading } = useSentiment();

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <ErrorState message="Gagal memuat sentimen. Pastikan backend & database hidup." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Sentimen <span className="gradient-text">Aliran &amp; Buku</span>
        </h1>
        <p className="text-muted mt-0.5 flex items-center gap-2 text-sm">
          Siapa yang sedang mengakumulasi dan siapa yang sedang mendistribusi —
          dibaca dari arus asing dan ketimpangan buku intraday, bukan dari berita.
          <LastUpdated sessionDate={data?.as_of} updatedAt={data?.generated_at} />
        </p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card
              className="lg:col-span-1"
              title={
                <>
                  <Waves size={15} aria-hidden /> Gauge Pasar
                </>
              }
              subtitle={data.as_of ? `Data per ${data.as_of}` : undefined}
              info="Ukuran 'suasana hati' pasar secara keseluruhan: apakah mayoritas sedang mengumpulkan saham (optimis) atau melepas (pesimis). Jarum ke kanan = lebih optimis."
            >
              <MarketGauge market={data.market} />
            </Card>

            <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
              {[
                { label: "Dianalisis", value: data.stats.analyzed ?? 0, cls: "" },
                { label: "Akumulasi", value: data.stats.accumulation ?? 0, cls: "text-up" },
                { label: "Distribusi", value: data.stats.distribution ?? 0, cls: "text-down" },
                { label: "Netral", value: data.stats.neutral ?? 0, cls: "text-muted" },
              ].map((s) => (
                <div key={s.label} className="card flex flex-col justify-center p-3">
                  <p className="text-muted text-[11px] uppercase tracking-wide">{s.label}</p>
                  <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.cls}`}>{s.value}</p>
                </div>
              ))}
              {!data.orderbook_available && (
                <div className="card col-span-2 p-3 text-xs text-[var(--fg-muted)] lg:col-span-4">
                  <Activity size={13} className="mr-1 inline align-[-2px]" aria-hidden />
                  Capture order-book intraday belum tersedia — skor di bawah murni
                  dari peringkat arus asing pasar. Jalankan <code>idx serve</code> saat
                  jam bursa agar komponen buku ikut aktif.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card
              title={
                <>
                  <TrendingUp size={15} aria-hidden /> Akumulasi
                </>
              }
              subtitle="Arus asing peringkat atas dan/atau bid lebih tebal dari offer"
              info="Saham yang sedang 'dikumpulkan' — tanda permintaan beli lebih kuat dari tekanan jual. Bisa jadi pertanda minat naik, tapi bukan jaminan harga langsung naik."
            >
              <SentimentList items={data.accumulation} title="akumulasi" />
            </Card>
            <Card
              title={
                <>
                  <TrendingDown size={15} aria-hidden /> Distribusi
                </>
              }
              subtitle="Arus asing peringkat bawah dan/atau offer lebih tebal dari bid"
              info="Saham yang sedang 'dilepas' — tekanan jual lebih kuat dari permintaan beli. Bisa jadi pertanda minat turun, tapi tetap perhatikan konteks lain sebelum menyimpulkan."
            >
              <SentimentList items={data.distribution} title="distribusi" />
            </Card>
          </div>
        </>
      )}

      <p className="text-muted text-[11px] leading-snug">
        {data?.disclaimer ??
          "Sentimen dihitung dari data yang sudah tersimpan — dipakai sebagai konteks, bukan sinyal beli/jual."}
      </p>
    </main>
  );
}
