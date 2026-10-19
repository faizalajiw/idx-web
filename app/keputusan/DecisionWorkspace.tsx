"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Gauge, Scale, History, Info, Search, Shield, TrendingUp } from "lucide-react";
import { useRecommendations, useStockDecision } from "@/lib/hooks";
import { fmtCompact, fmtPct } from "@/lib/format";
import type { StockDecision } from "@/lib/types";
import { PositionPlanPanel } from "@/components/PositionPlanPanel";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

type Decision = NonNullable<StockDecision>;

// ------------------------------------------------------- terjemahan bahasa awam

const VERDICT_VIEW: Record<string, { title: string; hint: string; tone: string }> = {
  "STRONG HOLD": {
    title: "Kuat, layak dipertahankan",
    hint: "Sinyal teknikal dan aliran dana mendukung. Tetap pantau.",
    tone: "var(--up)",
  },
  HOLD: {
    title: "Tahan, pantau saja",
    hint: "Belum ada alasan kuat untuk menambah atau menjual.",
    tone: "var(--accent)",
  },
  TRIM: {
    title: "Kurangi sebagian",
    hint: "Sinyal mulai melemah. Pertimbangkan mengurangi sebagian posisi.",
    tone: "#f59e0b",
  },
  EXIT: {
    title: "Pertimbangkan keluar",
    hint: "Sinyal lemah dan tekanan jual dominan. Hati-hati menahan posisi.",
    tone: "var(--down)",
  },
};

const EVENT_VIEW: Record<string, string> = {
  jump_down: "Harga anjlok tiba-tiba",
  jump_up: "Harga melonjak tiba-tiba",
  ma_cross_up: "Harga tembus rata-rata 50 hari ke atas",
  ma_cross_down: "Harga tembus rata-rata 50 hari ke bawah",
  near_high: "Harga mendekati puncak terbaru",
  near_low: "Harga mendekati titik terendah terbaru",
  vol_spike: "Volume perdagangan melonjak",
};

const TABS = [
  { key: "aliran", label: "Aliran Asing", icon: TrendingUp },
  { key: "level", label: "Level Batas", icon: Shield },
  { key: "riwayat", label: "Riwayat Pola", icon: History },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ---------------------------------------------------------------- pemilih

function StockPicker({ value }: { value: string | null }) {
  const { data: recs } = useRecommendations(20, "A");
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => setDraft(value ?? ""), [value]);

  const suggestions = useMemo(() => {
    const base = (recs?.rows ?? []).map((r) => r.code);
    const pool = value && !base.includes(value) ? [value, ...base] : base;
    const q = draft.trim().toUpperCase();
    if (!q) return pool.slice(0, 8);
    return pool.filter((c) => c.includes(q)).slice(0, 8);
  }, [recs, draft, value]);

  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const code = draft.trim().toUpperCase();
          if (code) window.location.href = `/keputusan/${code}`;
        }}
      >
        <div className="group relative flex-1">
          <Search className="text-muted absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent-text)]" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            placeholder="Ketik kode saham, misalnya BBRI"
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] pl-10 pr-3 text-base font-medium tracking-wide outline-none transition-shadow focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30"
            aria-label="Kode saham"
          />
        </div>
        <button
          type="submit"
          className="h-12 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Lihat keputusan
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted text-xs font-medium">Teratas hari ini:</span>
          {suggestions.map((c) => (
            <Link
              key={c}
              href={`/keputusan/${c}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                c === value
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] text-muted hover:bg-white/[0.06] hover:text-[var(--fg)]"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------- panduan

function Guide() {
  const steps = [
    "Ketik kode saham yang ingin dicek, misalnya BBRI.",
    "Lihat kesimpulan utama: tahan, kurangi, atau keluar.",
    "Baca alasannya dalam bahasa sederhana, lalu cek tab detail bila perlu.",
  ];
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold">Cara membaca halaman ini</h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-sm leading-relaxed">
            <span className="bg-[var(--accent)]/15 text-[var(--accent-text)] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-muted">{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-muted mt-4 text-xs leading-relaxed">
        Halaman ini adalah alat bantu riset, bukan ajakan beli atau jual. Keputusan akhir tetap ada di tangan kamu.
      </p>
    </section>
  );
}

// --------------------------------------------------------- kesimpulan utama

function Verdict({ d }: { d: Decision }) {
  const [showAll, setShowAll] = useState(false);
  const hc = d.hold_check;
  if (!hc) {
    return (
      <section className="card p-5 sm:p-6">
        <EmptyState message="Data harga emiten ini belum cukup untuk membuat kesimpulan." />
      </section>
    );
  }
  const view = VERDICT_VIEW[hc.verdict] ?? { title: hc.verdict, hint: "", tone: "var(--fg)" };
  const reasons = hc.reasons ?? [];
  const shown = showAll ? reasons : reasons.slice(0, 3);
  const score = Math.max(0, Math.min(100, hc.score));

  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted text-xs font-medium uppercase tracking-wider">Kesimpulan untuk {d.code}</p>
        <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: view.tone }}>
          {view.title}
        </h2>
        <p className="text-muted text-sm leading-relaxed">{view.hint}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Skor keyakinan</span>
          <span className="font-semibold tabular-nums">
            {hc.score} <span className="text-muted font-normal">/ 100</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: view.tone }} />
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Alasan utama</p>
          <ul className="space-y-2">
            {shown.map((r, i) => (
              <li key={i} className="text-muted flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: view.tone }} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {reasons.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[var(--accent-text)] flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              {showAll ? "Sembunyikan" : `Lihat ${reasons.length - 3} alasan lainnya`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      )}

      <details className="group rounded-xl border border-[var(--border)] p-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
          Bagaimana skor ini dihitung?
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="text-muted mt-3 space-y-1.5 text-xs leading-relaxed">
          <li>Dasar dari sinyal teknikal (tren, RSI, MACD, posisi Bollinger): <b className="text-[var(--fg)] tabular-nums">{hc.base_score}</b></li>
          <li>Penyesuaian faktor tambahan: <b className="text-[var(--fg)] tabular-nums">{hc.factor_adj >= 0 ? "+" : ""}{hc.factor_adj}</b></li>
          <li>Penyesuaian pendapat broker: <b className="text-[var(--fg)] tabular-nums">{hc.broker_adj >= 0 ? "+" : ""}{hc.broker_adj}</b></li>
        </ul>
      </details>
    </section>
  );
}

// ------------------------------------------------------------- konteks cepat

function ContextTiles({ d }: { d: Decision }) {
  const regime = d.regime?.regime ?? null;
  const regimeDown = d.regime?.dir_hint === "down";
  const regimeUp = regime?.startsWith("TRENDING") && !regimeDown;
  const sent = d.sentiment;
  const sentScore = sent?.score ?? 0;

  const tiles = [
    {
      icon: TrendingUp,
      label: "Arah pasar (IHSG)",
      value: regime ? (regimeDown ? "Sedang turun" : regimeUp ? "Sedang naik" : "Mendatar") : "-",
      tone: regimeDown ? "var(--down)" : regimeUp ? "var(--up)" : undefined,
      note: d.regime?.adx != null ? `Kekuatan tren ${Number(d.regime.adx).toFixed(0)}` : "Belum ada data",
    },
    {
      icon: Shield,
      label: "Aliran dana",
      value: sent ? sent.label : "Belum ada data",
      tone: sentScore > 0 ? "var(--up)" : sentScore < 0 ? "var(--down)" : undefined,
      note: "Ringkasan arah dana emiten",
    },
    {
      icon: History,
      label: "Asing terakhir",
      value: d.last_flip ? (d.last_flip.to === "net_buy" ? "Mulai beli" : "Mulai jual") : "Belum ada",
      tone: d.last_flip ? (d.last_flip.to === "net_buy" ? "var(--up)" : "var(--down)") : undefined,
      note: d.last_flip ? `Sejak ${d.last_flip.date}` : "Tidak ada pergantian arah",
    },
    {
      icon: Gauge,
      label: "Suasana pasar",
      value: d.market_gauge ? `${Number(d.market_gauge.score).toFixed(0)} / 100` : "-",
      tone: undefined,
      note: d.market_gauge?.band ?? "Skala 0-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, tone, note }) => (
        <div key={label} className="card space-y-1.5 p-4">
          <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </div>
          <p className="break-words text-base font-semibold" style={{ color: tone }}>
            {value}
          </p>
          <p className="text-muted text-xs leading-snug">{note}</p>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ tab isi

function ForeignFlow({ rows }: { rows: Decision["foreign_10"] }) {
  const vals = rows.filter((r) => r.net !== null);
  if (vals.length === 0) return <EmptyState message="Belum ada data aliran asing." />;
  const maxAbs = Math.max(...vals.map((r) => Math.abs(r.net!)), 1);
  return (
    <div className="space-y-3">
      <p className="text-muted text-sm leading-relaxed">
        Hijau berarti asing net beli, merah berarti net jual, dan kuning berarti hari pergantian arah.
      </p>
      <div className="space-y-2">
        {vals.map((r) => {
          const positive = r.net! >= 0;
          return (
            <div key={r.date} className="flex items-center gap-3 text-xs">
              <span className="text-muted w-12 shrink-0 tabular-nums">{r.date.slice(5)}</span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                <span
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    width: `${(Math.abs(r.net!) / maxAbs) * 50}%`,
                    left: positive ? "50%" : undefined,
                    right: positive ? undefined : "50%",
                    backgroundColor: r.flip ? "#f59e0b" : positive ? "var(--up)" : "var(--down)",
                  }}
                />
                <span className="absolute left-1/2 top-0 h-full w-px bg-white/25" />
              </div>
              <span className={`w-20 shrink-0 text-right font-medium tabular-nums ${positive ? "text-up" : "text-down"}`}>
                Rp {fmtCompact(r.net!)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Levels({ inv, rsi }: { inv: NonNullable<Decision["invalidation"]>; rsi: number | null }) {
  const rows = [
    { label: "Harga sekarang", level: inv.close, note: "Harga penutupan terakhir" },
    { label: "Batas tren menengah", level: inv.ma50_level, note: "Jika ditutup di bawah ini, tren menengah patah" },
    { label: "Rata-rata 60 hari", level: inv.mean60_level, note: "Di atas level ini berarti harga sudah terlalu tinggi" },
    { label: "Batas bawah Bollinger", level: inv.bb_lower != null ? Math.round(inv.bb_lower) : null, note: "Jika ditembus, tekanan jual biasanya meningkat" },
  ].filter((r) => r.level != null);

  const rsiText =
    rsi == null
      ? null
      : rsi >= 65
        ? "Sudah mendekati area jenuh beli (overbought)."
        : rsi <= 35
          ? "Sudah mendekati area jenuh jual (oversold)."
          : "Berada di area netral.";

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm leading-relaxed">
        Level ini adalah titik acuan. Jika harga bergerak melewatinya, tesis untuk menahan saham bisa tidak berlaku lagi.
      </p>
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-muted text-xs leading-snug">{r.note}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">Rp {Number(r.level).toLocaleString("id-ID")}</p>
          </li>
        ))}
      </ul>
      {rsiText && <p className="text-muted text-xs">Momentum (RSI {inv.rsi?.toFixed(0) ?? "-"}): {rsiText}</p>}
    </div>
  );
}

function EventHistory({ events }: { events: Decision["events"] }) {
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm leading-relaxed">
        Ini menunjukkan apa yang biasanya terjadi pada saham ini setelah pola tertentu, dibandingkan dengan rata-rata pasar.
        Jumlah sampel kecil, jadi jadikan sebagai gambaran kasar saja.
      </p>
      <div className="space-y-3">
        {events.map((e) => {
          const fwd = e.my_median_fwd;
          const abn = e.my_median_abnormal;
          return (
            <div key={e.event} className="rounded-xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{EVENT_VIEW[e.event] ?? e.event}</p>
                <p className="text-muted text-xs tabular-nums">
                  Terjadi {e.my_count} kali{e.my_last_date ? `, terakhir ${e.my_last_date}` : ""}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Rata-rata hasil setelahnya</p>
                  <p className={`font-semibold tabular-nums ${(fwd ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                    {fwd === null ? "-" : fmtPct(fwd * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-muted text-xs">Dibanding pasar</p>
                  <p className={`font-semibold tabular-nums ${(abn ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                    {abn === null ? "-" : fmtPct(abn * 100)}
                  </p>
                </div>
              </div>
              {e.description && !EVENT_VIEW[e.event] && (
                <p className="text-muted mt-2 text-xs">{e.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailTabs({ d }: { d: Decision }) {
  const [tab, setTab] = useState<TabKey>("aliran");
  return (
    <section className="card p-4 sm:p-5">
      <div role="tablist" aria-label="Detail keputusan" className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.04] p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:text-[var(--fg)]"
              }`}
            >
              <Icon size={15} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="mt-5">
        {tab === "aliran" && <ForeignFlow rows={d.foreign_10} />}
        {tab === "level" &&
          (d.invalidation ? (
            <Levels inv={d.invalidation} rsi={d.hold_check?.rsi ?? d.invalidation.rsi} />
          ) : (
            <EmptyState message="Riwayat harga belum cukup untuk menghitung level batas." />
          ))}
        {tab === "riwayat" &&
          (d.events.length > 0 ? <EventHistory events={d.events} /> : <EmptyState message="Belum ada riwayat pola untuk emiten ini." />)}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ halaman

export function DecisionWorkspace({ code }: { code: string | null }) {
  const { data, error, isLoading } = useStockDecision(code);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Scale size={26} className="text-accent" aria-hidden />
          Ruang <span className="gradient-text">Keputusan</span>
        </h1>
        <p className="text-muted text-sm">Cek apakah saham ini layak ditahan, dikurangi, atau dilepas, dengan bahasa yang mudah dipahami.</p>
      </header>

      <StockPicker value={code} />

      {!code ? (
        <Guide />
      ) : error ? (
        <ErrorState message={`Gagal memuat keputusan: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <Verdict d={data} />
          <ContextTiles d={data} />
          {code && <PositionPlanPanel code={code} />}
          <DetailTabs d={data} />
          <p className="text-muted text-xs leading-relaxed">
            Dihitung {data.generated_at}. Bukan rekomendasi beli atau jual. Keputusan akhir tetap ada di tangan kamu.
          </p>
        </>
      )}
    </main>
  );
}