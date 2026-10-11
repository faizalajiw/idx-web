"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  BarChart3,
  Info,
  Minus,
  Radio,
  TrendingDown,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/Card";
import { LastUpdated } from "@/components/LastUpdated";
import { TickerLogo } from "@/components/TickerLogo";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { useSentiment } from "@/lib/hooks";
import type { SentimentItem } from "@/lib/types";

const pct1 = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);
const signedPct = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;
const signed = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`;

const MARKET_TONE: Record<string, { tone: string; Icon: LucideIcon; hint: string }> = {
  "RISK-ON": { tone: "text-up", Icon: TrendingUp, hint: "Pasar cenderung optimistis." },
  "RISK-OFF": { tone: "text-down", Icon: TrendingDown, hint: "Pasar cenderung defensif." },
  NETRAL: { tone: "text-muted", Icon: Minus, hint: "Pasar belum punya arah yang jelas." },
};
const FALLBACK_TONE = { tone: "text-accent", Icon: Radio, hint: "Data sentimen belum tersedia." };

/** Komponen skor pasar (rentang -1..+1, positif = mendukung risk-on). */
const COMPONENT_META: Record<string, { label: string; hint: string }> = {
  breadth: { label: "Lebar pasar", hint: "Berapa banyak saham yang naik dibanding yang turun." },
  index: { label: "Gerak IHSG", hint: "Arah dan besar pergerakan indeks hari ini." },
  foreign: { label: "Arus asing", hint: "Apakah investor asing cenderung membeli atau menjual." },
};

/** Nama tampilan untuk komponen bobot skor per emiten. */
const EMITEN_WEIGHT_LABEL: Record<string, string> = {
  foreign: "Arus asing (persentil)",
  imbalance: "Ketimpangan buku",
  absorption: "Absorpsi buku",
};

/** Label emiten dari backend bisa "AKUMULASI KUAT", "DISTRIBUSI", dst. */
function labelBadge(label: string): string {
  if (label.startsWith("AKUMULASI")) return "badge badge-buy";
  if (label.startsWith("DISTRIBUSI")) return "badge badge-sell";
  return "badge badge-hold";
}

type Side = "akumulasi" | "distribusi";

export default function SentimenPage() {
  const { data, isLoading, error } = useSentiment(15);
  const [expanded, setExpanded] = useState<string | null>(null);

  const market = data?.market;
  const tone = useMemo(() => {
    const key = (market?.label ?? "").toUpperCase();
    return MARKET_TONE[key] ?? FALLBACK_TONE;
  }, [market?.label]);

  const accumulation = data?.accumulation ?? [];
  const distribution = data?.distribution ?? [];
  const stats = data?.stats ?? {};
  const weightRows = Object.entries(data?.weights ?? {});

  const tiles = [
    { key: "analyzed", label: "Dianalisis", hint: "Emiten yang dinilai", value: stats.analyzed ?? 0, tone: "text-[var(--fg)]", Icon: BarChart3, c: "var(--accent)" },
    { key: "accumulation", label: "Akumulasi", hint: "Ditekan pembelian", value: stats.accumulation ?? 0, tone: "text-up", Icon: TrendingUp, c: "var(--up)" },
    { key: "distribution", label: "Distribusi", hint: "Ditekan penjualan", value: stats.distribution ?? 0, tone: "text-down", Icon: TrendingDown, c: "var(--down)" },
    { key: "neutral", label: "Netral", hint: "Tanpa sinyal kuat", value: stats.neutral ?? 0, tone: "text-muted", Icon: Minus, c: "var(--fg-muted)" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <PageTitle />
          <p className="text-muted mt-1 flex max-w-2xl flex-wrap items-center gap-2 text-sm">
            Suasana pasar hari ini dan emiten mana yang sedang ditekan akumulasi atau distribusi asing.
            <LastUpdated sessionDate={data?.as_of} updatedAt={data?.generated_at} />
          </p>
        </div>
        {market && (
          <span
            className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3.5 py-1.5 text-xs font-semibold ${tone.tone}`}
          >
            <tone.Icon size={15} aria-hidden />
            {market.label}
          </span>
        )}
      </header>

      {error ? (
        <ErrorState message={`Gagal memuat sentimen: ${error.message}`} />
      ) : (
        <>
          {/* Baris 1: suhu pasar (kiri) + ringkasan breadth (kanan) */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Card
              title="Suhu Pasar"
              subtitle={tone.hint}
              info="Gabungan breadth harga, gerak IHSG, dan breadth arus asing. 50 = netral; di atas 60 = risk-on; di bawah 40 = risk-off."
            >
              {market ? (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-center">
                    <ScoreGauge score={market.score} label={market.label} />
                  </div>
                  <ul className="space-y-3.5">
                    {Object.entries(COMPONENT_META).map(([key, meta]) => (
                      <ComponentBar
                        key={key}
                        label={meta.label}
                        hint={meta.hint}
                        value={market.components?.[key] ?? null}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <Skeleton className="h-72 w-full" />
              )}
            </Card>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {tiles.map((t) => (
                  <div key={t.key} className="stat-box p-4 pt-5" style={{ "--stat-c": t.c } as CSSProperties}>
                    <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
                      <t.Icon size={14} aria-hidden />
                      {t.label}
                    </div>
                    {isLoading ? (
                      <Skeleton className="mt-3 h-8 w-14" />
                    ) : (
                      <div className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${t.tone}`}>{t.value}</div>
                    )}
                    <div className="text-muted mt-1 text-[11px]">{t.hint}</div>
                  </div>
                ))}
              </div>

              <Card title="Breadth & Aliran" subtitle="Kondisi pasar pada sesi bursa terakhir.">
                {market ? (
                  <div className="flex flex-col gap-5">
                    <BreadthBar up={market.up} flat={market.flat} down={market.down} />
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                      <Stat label="IHSG" value={signedPct(market.index_percent, 2)} tone={toneOf(market.index_percent)} />
                      <Stat label="Porsi asing" value={pct1(toPct(market.foreign_breadth))} hint="Saham dengan arus asing positif" />
                      <Stat label="Asing / nilai" value={pct1(toPct(market.foreign_to_value))} hint="Transaksi asing terhadap total nilai" />
                    </dl>
                  </div>
                ) : (
                  <Skeleton className="h-28 w-full" />
                )}
              </Card>
            </div>
          </section>

          {/* Baris 2: akumulasi & distribusi berdampingan */}
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SideCard
              side="akumulasi"
              title="Akumulasi"
              subtitle="Arus asing peringkat atas & bid lebih tebal dari offer."
              Icon={TrendingUp}
              items={accumulation}
              isLoading={isLoading}
              expanded={expanded}
              onToggle={setExpanded}
              emptyMessage="Tidak ada emiten dengan sinyal akumulasi."
            />
            <SideCard
              side="distribusi"
              title="Distribusi"
              subtitle="Arus asing peringkat bawah & offer lebih tebal dari bid."
              Icon={TrendingDown}
              items={distribution}
              isLoading={isLoading}
              expanded={expanded}
              onToggle={setExpanded}
              emptyMessage="Tidak ada emiten dengan sinyal distribusi."
            />
          </section>

          {/* Baris 3: metodologi & catatan */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Bobot Skor Emiten" subtitle="Seberapa besar tiap faktor memengaruhi skor satu emiten.">
              {!data ? (
                <Skeleton className="h-32 w-full" />
              ) : weightRows.length === 0 ? (
                <EmptyState message="Belum ada data bobot." />
              ) : (
                <ul className="space-y-3">
                  {weightRows.map(([k, v]) => (
                    <li key={k} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted">{EMITEN_WEIGHT_LABEL[k] ?? k}</span>
                        <span className="font-semibold tabular-nums">{(v * 100).toFixed(0)}%</span>
                      </div>
                      <div className="bg-[var(--bg-elev)] h-1.5 overflow-hidden rounded-full">
                        <div className="bg-accent h-full rounded-full" style={{ width: `${v * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Catatan" subtitle="Cara membaca halaman ini.">
              <div className="space-y-3 text-sm">
                {!isLoading && data && !data.orderbook_available && (
                  <p className="text-muted flex items-start gap-2 rounded-xl border border-dashed border-[var(--border)] px-3.5 py-2.5 text-xs">
                    <Info size={14} className="mt-px shrink-0" aria-hidden />
                    Orderbook tidak tersedia pada sesi ini. Sinyal akumulasi dan distribusi memakai arus asing dan breadth
                    sebagai proksi.
                  </p>
                )}
                {data?.disclaimer ? (
                  <p className="text-muted text-xs leading-relaxed">{data.disclaimer}</p>
                ) : (
                  <p className="text-muted text-xs leading-relaxed">
                    Skor dihitung dari jejak transaksi yang sudah tersimpan — bukan berita atau opini. Dipakai sebagai
                    konteks, bukan sinyal beli/jual.
                  </p>
                )}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function PageTitle() {
  return (
    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
      <Waves size={26} className="text-accent" aria-hidden />
      <span>
        Sentimen <span className="gradient-text">Pasar</span>
      </span>
    </h1>
  );
}

function toPct(n: number | null | undefined) {
  return n == null ? null : n * 100;
}

function toneOf(n: number | null | undefined) {
  if (n == null) return "text-[var(--fg)]";
  return n > 0 ? "text-up" : n < 0 ? "text-down" : "text-[var(--fg)]";
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const value = (clamped / 100) * 251.3; // setengah keliling r=80
  const key = (label ?? "").toUpperCase();
  const color = key === "RISK-ON" ? "var(--up)" : key === "RISK-OFF" ? "var(--down)" : "var(--accent)";

  return (
    <div className="relative h-[146px] w-[240px] shrink-0">
      <svg viewBox="0 0 180 110" className="h-full w-full" role="img" aria-label={`Skor sentimen ${score.toFixed(0)} dari 100`}>
        <path
          d="M10 95 A80 80 0 0 1 170 95"
          fill="none"
          stroke="var(--bg-elev)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M10 95 A80 80 0 0 1 170 95"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray="251.3"
          strokeDashoffset={251.3 - value}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-4xl font-bold tracking-tight tabular-nums">{score.toFixed(0)}</div>
        <div className="text-muted text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

/** Bar komponen dari tengah: kanan = mendukung risk-on, kiri = risk-off. */
function ComponentBar({ label, hint, value }: { label: string; hint: string; value: number | null }) {
  const v = value == null ? null : Math.max(-1, Math.min(1, value));
  const pos = v != null && v >= 0;
  const width = v == null ? 0 : Math.abs(v) * 50;
  const toneCls = v == null ? "text-muted" : pos ? "text-up" : "text-down";

  return (
    <li className="min-w-0" title={hint}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted font-medium">{label}</span>
        <span className={`font-semibold tabular-nums ${toneCls}`}>{signed(v)}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)]" aria-hidden>
        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--border-strong)]" />
        <span
          className={`absolute inset-y-0 rounded-full ${pos ? "left-1/2 bg-up" : "right-1/2 bg-down"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

function BreadthBar({ up, flat, down }: { up: number; flat: number; down: number }) {
  const total = up + flat + down;
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg-elev)]"
        role="img"
        aria-label={`${up} saham naik, ${flat} stagnan, ${down} turun`}
      >
        <div className="bg-up h-full" style={{ width: `${share(up)}%` }} />
        <div className="h-full bg-[var(--border-strong)]" style={{ width: `${share(flat)}%` }} />
        <div className="bg-down h-full" style={{ width: `${share(down)}%` }} />
      </div>
      <div className="text-muted mt-2 flex justify-between text-xs tabular-nums">
        <span>Naik {up}</span>
        <span>Stagnan {flat}</span>
        <span>Turun {down}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone = "text-[var(--fg)]" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0" title={hint}>
      <dt className="text-muted text-[11px] font-medium">{label}</dt>
      <dd className={`mt-0.5 text-base font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function SideCard({
  side,
  title,
  subtitle,
  Icon,
  items,
  isLoading,
  expanded,
  onToggle,
  emptyMessage,
}: {
  side: Side;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  items: SentimentItem[];
  isLoading: boolean;
  expanded: string | null;
  onToggle: (key: string | null) => void;
  emptyMessage: string;
}) {
  const tone = side === "akumulasi" ? "text-up" : "text-down";
  return (
    <Card
      title={
        <>
          <Icon size={15} className={tone} aria-hidden /> {title}
        </>
      }
      subtitle={subtitle}
      right={!isLoading ? <span className="text-muted text-xs tabular-nums">{items.length} emiten</span> : undefined}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <SentimentList items={items} side={side} expanded={expanded} onToggle={onToggle} />
      )}
    </Card>
  );
}

function SentimentList({
  items,
  side,
  expanded,
  onToggle,
}: {
  items: SentimentItem[];
  side: Side;
  expanded: string | null;
  onToggle: (key: string | null) => void;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.score ?? 0)));
  return (
    <ul className="-mx-1 space-y-1">
      {items.map((it) => {
        const key = `${side}:${it.code}`;
        const open = expanded === key;
        const score = it.score ?? 0;
        const width = Math.max(4, (Math.abs(score) / max) * 100);
        const reasons = it.reasons ?? [];
        return (
          <li key={it.code} className="min-w-0">
            <button
              type="button"
              onClick={() => onToggle(open ? null : key)}
              aria-expanded={open}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                open ? "bg-[var(--bg-elev)]" : "hover:bg-[var(--bg-elev)]"
              }`}
            >
              <TickerLogo code={it.code} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{it.code}</span>
                  <span className={labelBadge(it.label)}>{it.label}</span>
                </div>
                <div className="text-muted mt-0.5 truncate text-xs">{it.name ?? "—"}</div>
              </div>
              <div className="hidden w-24 shrink-0 sm:block">
                <div className="bg-[var(--bg-elev)] h-1.5 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${score >= 0 ? "bg-up" : "bg-down"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <div className={`w-14 shrink-0 text-right text-sm font-bold tabular-nums ${score >= 0 ? "text-up" : "text-down"}`}>
                {signed(score)}
              </div>
            </button>
            {open && (
              <div className="bg-[var(--bg-elev)] mx-2 mb-1 space-y-2 rounded-xl px-4 py-3 text-xs">
                <div className="text-muted flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Persentil asing <b className="text-[var(--fg)]">{pct1((it.foreign_rank ?? 0) * 100)}</b>
                  </span>
                  <span>
                    Imbalance OB <b className="text-[var(--fg)]">{signed(it.ob_imbalance)}</b>
                  </span>
                  <span>
                    Serapan OB <b className="text-[var(--fg)]">{signed(it.ob_absorption)}</b>
                  </span>
                </div>
                {reasons.length > 0 && (
                  <ul className="text-muted list-inside list-disc space-y-0.5">
                    {reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
