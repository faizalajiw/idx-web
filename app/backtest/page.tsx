"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Coins,
  Info,
  LineChart,
  Play,
  FlaskConical,
  ScrollText,
  Settings2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useBacktestConfig, useWatchlist } from "@/lib/hooks";
import { runBacktest } from "@/lib/api";
import { fmtCompact } from "@/lib/format";
import type {
  BacktestMetrics,
  BacktestResult,
  CostModelInfo,
  CostSettings,
  StrategyInfo,
} from "@/lib/types";
import { Card } from "@/components/Card";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { RebalanceLedger } from "@/components/RebalanceLedger";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { RegimeBanner } from "@/components/RegimeBanner";
import { LastUpdated } from "@/components/LastUpdated";

const PERIODS = [
  { id: "6M", label: "6 Bulan", months: 6 },
  { id: "1Y", label: "1 Tahun", months: 12 },
  { id: "3Y", label: "3 Tahun", months: 36 },
  { id: "ALL", label: "Semua", months: null },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];
type Tone = "up" | "down" | "neutral";

/** Cost knobs live in percent in the UI; the API takes fractions. */
type CostPct = { commission: number; tax: number; slippage: number; adv: number };

const COST_PRESETS: { id: string; label: string; desc: string; value: CostPct }[] = [
  {
    id: "zero",
    label: "Tanpa biaya",
    desc: "Batas atas teoretis — komisi, pajak, slippage, dan cap likuiditas dimatikan.",
    value: { commission: 0, tax: 0, slippage: 0, adv: 0 },
  },
  {
    id: "standard",
    label: "Standar IDX",
    desc: "Komisi 0,15%/sisi, pajak jual 0,1%, slippage 0,1%, cap likuiditas 2% nilai transaksi harian.",
    value: { commission: 0.15, tax: 0.1, slippage: 0.1, adv: 2 },
  },
  {
    id: "conservative",
    label: "Konservatif",
    desc: "Komisi 0,25%/sisi, slippage 0,25%, cap likuiditas 1% — untuk saham berlikuiditas rendah.",
    value: { commission: 0.25, tax: 0.1, slippage: 0.25, adv: 1 },
  },
];

const COST_FIELDS: { key: keyof CostPct; label: string; hint: string; step: number }[] = [
  {
    key: "commission",
    label: "Komisi (%/sisi)",
    hint: "Biaya jasa sekuritas tiap kali membeli atau menjual.",
    step: 0.05,
  },
  {
    key: "tax",
    label: "Pajak jual (%)",
    hint: "Pajak penjualan saham 0,1% yang dipotong saat menjual.",
    step: 0.05,
  },
  {
    key: "slippage",
    label: "Slippage (%/sisi)",
    hint: "Selisih harga beli/jual nyata dari harga yang diharapkan.",
    step: 0.05,
  },
  {
    key: "adv",
    label: "Cap likuiditas (% ADTV)",
    hint: "Batas porsi order terhadap nilai transaksi harian emiten; 0 berarti tanpa batas.",
    step: 0.5,
  },
];

const TABS: { id: TabId; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "ringkasan", label: "Ringkasan", hint: "Hasil utama", icon: Trophy },
  { id: "kurva", label: "Kurva Modal", hint: "Pertumbuhan modal", icon: LineChart },
  { id: "perbandingan", label: "Perbandingan", hint: "Strategi vs beli-tahan", icon: BarChart3 },
  { id: "biaya", label: "Biaya", hint: "Yang menggerus untung", icon: Coins },
  { id: "ledger", label: "Jejak Transaksi", hint: "Tiap sesi rebalance", icon: ScrollText },
];

type TabId = "ringkasan" | "kurva" | "perbandingan" | "biaya" | "ledger";

function costPctFromDefaults(d: CostModelInfo): CostPct {
  return {
    commission: d.commission_pct * 100,
    tax: d.sell_tax_pct * 100,
    slippage: d.slippage_pct * 100,
    adv: d.max_adv_pct * 100,
  };
}

function costsPayload(c: CostPct): CostSettings {
  return {
    commission_pct: c.commission / 100,
    sell_tax_pct: c.tax / 100,
    slippage_pct: c.slippage / 100,
    max_adv_pct: c.adv / 100,
  };
}

function costModelLabel(c: CostModelInfo): string {
  const pct = (v: number) => `${+(v * 100).toFixed(3)}%`;
  return [
    `Komisi ${pct(c.commission_pct)}/sisi`,
    `pajak jual ${pct(c.sell_tax_pct)}`,
    `slippage ${pct(c.slippage_pct)}/sisi`,
    `cap likuiditas ${pct(c.max_adv_pct)} ADTV`,
  ].join(" · ");
}

function defaultsFor(info: StrategyInfo): Record<string, number> {
  return Object.fromEntries(info.params.map((p) => [p.key, p.default]));
}

function periodStart(id: PeriodId): string | undefined {
  const months = PERIODS.find((p) => p.id === id)?.months ?? null;
  if (months === null) return undefined; // full history
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function pct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "-";
  return `${v > 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
}

/** Unsigned percent — for values where the sign is already implied by the label. */
function pctMag(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "-";
  return `${(Math.abs(v) * 100).toFixed(digits)}%`;
}

function decimals(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "-";
  return v.toFixed(digits);
}

function toneOf(v: number | null | undefined): Tone {
  if (v === null || v === undefined || v === 0) return "neutral";
  return v > 0 ? "up" : "down";
}

function toneClass(tone?: Tone): string {
  if (tone === "up") return "text-up";
  if (tone === "down") return "text-down";
  return "";
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-muted flex items-center gap-1 text-xs">
        {label}
        {hint && <InfoDot text={hint} />}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

/** Tiny hoverable explanation marker — avoids jargon walls in the layout. */
function InfoDot({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      role="button"
      aria-label={text}
      title={text}
      className="text-muted inline-flex cursor-help items-center align-middle"
    >
      <Info className="h-3 w-3" />
    </span>
  );
}

/** Plain-language verdict so a lay user knows if the result is even worth reading. */
function VerdictCard({ result, alpha, costErosion }: { result: BacktestResult; alpha: number; costErosion: number }) {
  const beatBenchmark = alpha > 0;
  const beatAfterCost = result.metrics.total_return > 0;
  const label = beatBenchmark
    ? "Strategi menang dari beli-tahan"
    : beatAfterCost
      ? "Untung, tapi kalah dari beli-tahan"
      : "Strategi belum menghasilkan untung";
  const tone: Tone = beatBenchmark ? "up" : beatAfterCost ? "neutral" : "down";
  const accent =
    tone === "up"
      ? "var(--up)"
      : tone === "down"
        ? "var(--down)"
        : "var(--border-strong)";

  return (
    <div className="card p-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-base font-bold ${toneClass(tone)}`}>{label}</p>
        <p className="text-muted text-xs tabular-nums">
          Rp {fmtCompact(result.initial_cash)} → Rp {fmtCompact(result.metrics.final_equity)}
        </p>
      </div>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        Strategi <span className="font-semibold text-[var(--fg)]">{result.strategy_name}</span>{" "}
        menghasilkan <span className={`font-semibold ${toneClass(toneOf(result.metrics.total_return))}`}>{pct(result.metrics.total_return)}</span>{" "}
        dalam {result.days} hari bursa, sementara beli-tahan semua emiten{" "}
        <span className="font-semibold text-[var(--fg)]">{pct(result.benchmark.total_return)}</span>.
        {costErosion > 0.001 && (
          <>
            {" "}Biaya transaksi menggerus{" "}
                    <span className="font-semibold text-down">{pctMag(costErosion)}</span> dari hasil kotor.
          </>
        )}
      </p>
    </div>
  );
}

function MetricRow({
  label,
  gross,
  net,
  benchmark,
  tone,
  hint,
}: {
  label: string;
  gross: string;
  net: string;
  benchmark: string;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <tr>
      <td className="text-muted">
        <span className="inline-flex items-center gap-1">
          {label}
          {hint && <InfoDot text={hint} />}
        </span>
      </td>
      <td className="text-muted text-right tabular-nums">{gross}</td>
      <td className={`text-right font-semibold tabular-nums ${toneClass(tone)}`}>{net}</td>
      <td className="text-muted text-right tabular-nums">{benchmark}</td>
    </tr>
  );
}

function MetricsTable({
  gross,
  net,
  benchmark,
}: {
  gross: BacktestMetrics;
  net: BacktestMetrics;
  benchmark: BacktestMetrics;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Metrik</th>
            <th className="text-right">Sebelum biaya</th>
            <th className="text-right">Setelah biaya</th>
            <th className="text-right">Beli &amp; tahan</th>
          </tr>
        </thead>
        <tbody>
          <MetricRow
            label="Total keuntungan"
            hint="Berapa persen modal bertambah atau berkurang selama periode uji."
            gross={pct(gross.total_return)}
            net={pct(net.total_return)}
            benchmark={pct(benchmark.total_return)}
            tone={toneOf(net.total_return)}
          />
          <MetricRow
            label="Rata-rata per tahun"
            hint="Setara keuntungan tahunan bila hasilnya diratakan (CAGR)."
            gross={pct(gross.annualized_return)}
            net={pct(net.annualized_return)}
            benchmark={pct(benchmark.annualized_return)}
          />
          <MetricRow
            label="Jatuh terdalam"
            hint="Penurunan terbesar dari puncak ke dasar selama uji (max drawdown)."
            gross={pct(-gross.max_drawdown)}
            net={pct(-net.max_drawdown)}
            benchmark={pct(-benchmark.max_drawdown)}
            tone="down"
          />
          <MetricRow
            label="Naik-turun tahunan"
            hint="Seberapa liar nilai portofolio bergerak (volatilitas tahunan)."
            gross={pct(gross.volatility)}
            net={pct(net.volatility)}
            benchmark={pct(benchmark.volatility)}
          />
          <MetricRow
            label="Imbal hasil per risiko"
            hint="Keuntungan dibanding naik-turunnya (Sharpe). Makin tinggi makin efisien."
            gross={decimals(gross.sharpe)}
            net={decimals(net.sharpe)}
            benchmark={decimals(benchmark.sharpe)}
          />
          <MetricRow
            label="Modal akhir"
            gross={`Rp ${fmtCompact(gross.final_equity)}`}
            net={`Rp ${fmtCompact(net.final_equity)}`}
            benchmark={`Rp ${fmtCompact(benchmark.final_equity)}`}
          />
        </tbody>
      </table>
    </div>
  );
}

export default function BacktestPage() {
  const { data: config, error: configError, isLoading: configLoading } = useBacktestConfig();
  const { data: watchlist } = useWatchlist();

  const [strategyId, setStrategyId] = useState("");
  const [params, setParams] = useState<Record<string, number>>({});
  const [codes, setCodes] = useState("");
  const [period, setPeriod] = useState<PeriodId>("1Y");
  const [cash, setCash] = useState(100_000_000);
  const [rebalance, setRebalance] = useState("");
  const [costPct, setCostPct] = useState<CostPct | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("ringkasan");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const strategies = config?.strategies;

  const current = useMemo(
    () => strategies?.find((s) => s.id === strategyId) ?? null,
    [strategies, strategyId],
  );

  const activeCostPreset = useMemo(() => {
    if (!costPct) return null;
    return (
      COST_PRESETS.find((preset) =>
        (Object.keys(preset.value) as (keyof CostPct)[]).every(
          (k) => Math.abs(preset.value[k] - costPct[k]) < 1e-9,
        ),
      )?.id ?? null
    );
  }, [costPct]);

  useEffect(() => {
    if (!config) return;
    if (!costPct) setCostPct(costPctFromDefaults(config.cost_defaults));
    if (!rebalance) setRebalance(config.rebalance_default);
  }, [config, costPct, rebalance]);

  useEffect(() => {
    if (codes === "" && watchlist?.length) {
      setCodes(watchlist.slice(0, 10).map((r) => r.code).join(", "));
    }
  }, [watchlist, codes]);

  function choose(info: StrategyInfo) {
    setStrategyId(info.id);
    setParams(defaultsFor(info));
    setResult(null);
    setError(null);
  }

  function handleParam(key: string, raw: string) {
    const value = Number(raw);
    setParams((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : 0 }));
  }

  function handleCost(key: keyof CostPct, raw: string) {
    const value = Number(raw);
    setCostPct((prev) => (prev ? { ...prev, [key]: Number.isFinite(value) ? value : 0 } : prev));
  }

  async function onRun() {
    if (!strategyId || !codes.trim() || !costPct || !rebalance) return;
    setLoading(true);
    setError(null);
    try {
      const res = await runBacktest({
        strategy: strategyId,
        codes: codes.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean),
        start: periodStart(period),
        initial_cash: cash,
        params,
        costs: costsPayload(costPct),
        rebalance,
      });
      setResult(res);
      setTab("ringkasan");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const alpha = result ? result.metrics.total_return - result.benchmark.total_return : 0;
  const costErosion = result
    ? result.gross_metrics.total_return - result.metrics.total_return
    : 0;
  const cadenceLabel = result
    ? (config?.rebalance_options.find((o) => o.id === result.rebalance)?.label ??
      result.rebalance)
    : "";

  const codelist = codes
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const ready = Boolean(strategyId) && codelist.length > 0 && !loading;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  <FlaskConical size={26} className="text-accent" aria-hidden />
                  Uji Strategi <span className="gradient-text">(Backtest)</span>
                </h1>
        <p className="text-muted mt-0.5 text-sm">
          Coba sebuah strategi di data masa lalu — seolah-olah kamu sudah
          menjalankannya sejak dulu — lalu lihat hasilnya setelah biaya nyata.
        </p>
      </div>

      <RegimeBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------------------------------------------------------- form */}
        <div className="min-w-0 lg:col-span-1">
          <Card
            title="1. Pilih Strategi"
            subtitle="Aturan beli-jual yang mau diuji"
            info="Backtest = uji strategi memakai data masa lalu. Ini simulasi untuk belajar; hasil masa lalu tidak menjamin masa depan."
          >
            {configError ? (
              <ErrorState message={`Gagal memuat konfigurasi: ${configError.message}`} />
            ) : configLoading || !config || !costPct ? (
              <Skeleton className="h-72" />
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  {config.strategies.map((s) => {
                    const active = strategyId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => choose(s)}
                        aria-pressed={active}
                        className={`card card-hover flex w-full items-start gap-3 p-3 text-left ${
                          active ? "ring-1 ring-[var(--accent)]" : ""
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-[var(--border-strong)]"
                          }`}
                        >
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className="text-sm font-semibold">{s.name}</span>
                          <span className="text-muted mt-1 block text-xs leading-relaxed">
                            {s.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {current && current.params.length > 0 && (
                  <div>
                    <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                      Pengaturan strategi
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {current.params.map((p) => (
                        <label key={p.key} className="block min-w-0">
                          <span className="text-muted text-xs">{p.label}</span>
                          <input
                            type="number"
                            className="input mt-1 w-full"
                            value={params[p.key] ?? p.default}
                            min={p.min ?? undefined}
                            max={p.max ?? undefined}
                            step={p.step}
                            onChange={(e) => handleParam(p.key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-muted text-xs font-semibold tracking-wider uppercase">
                      Emiten ({codelist.length}/{config.max_codes})
                    </p>
                    {watchlist?.length ? (
                      <button
                        type="button"
                        className="text-muted text-xs underline decoration-dotted hover:text-[var(--fg)]"
                        onClick={() =>
                          setCodes(
                            watchlist.slice(0, 10).map((r) => r.code).join(", "),
                          )
                        }
                      >
                        Pakai watchlist
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    className="input w-full resize-y"
                    rows={2}
                    value={codes}
                    placeholder="BBCA, BBRI, TLKM"
                    onChange={(e) => setCodes(e.target.value)}
                  />
                  <p className="text-muted mt-1 text-xs">
                    Pisahkan dengan koma. Maksimal {config.max_codes} emiten.
                  </p>
                </div>

                <div>
                  <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                    Rentang waktu
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={period === p.id}
                        onClick={() => setPeriod(p.id)}
                        className={`chip ${period === p.id ? "chip-active" : ""}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="text-muted flex items-center gap-1 text-xs underline decoration-dotted hover:text-[var(--fg)]"
                  aria-expanded={showAdvanced}
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  <Settings2 className="h-3 w-3" />
                  {showAdvanced ? "Sembunyikan pengaturan lanjutan" : "Pengaturan lanjutan"}
                </button>

                {showAdvanced && (
                  <div className="space-y-5 border-l-2 border-[var(--border)] pl-3">
                    <div>
                      <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                        Seberapa sering portofolio disusun ulang
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {config.rebalance_options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            title={option.description}
                            aria-pressed={rebalance === option.id}
                            onClick={() => setRebalance(option.id)}
                            className={`chip ${rebalance === option.id ? "chip-active" : ""}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-muted mt-2 text-xs leading-relaxed">
                        Di antara jadwal susun-ulang, posisi dibiarkan mengikuti
                        pasar. Makin jarang, makin kecil biaya transaksinya.
                      </p>
                    </div>

                    <label className="block min-w-0">
                      <span className="text-muted text-xs">Modal awal (Rp)</span>
                      <input
                        type="number"
                        className="input mt-1 w-full"
                        value={cash}
                        min={1_000_000}
                        step={1_000_000}
                        onChange={(e) => setCash(Number(e.target.value) || 0)}
                      />
                    </label>

                    <div>
                      <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                        Biaya &amp; likuiditas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {COST_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            title={preset.desc}
                            aria-pressed={activeCostPreset === preset.id}
                            onClick={() => setCostPct(preset.value)}
                            className={`chip ${activeCostPreset === preset.id ? "chip-active" : ""}`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {COST_FIELDS.map((f) => (
                          <label key={f.key} className="block min-w-0">
                            <span className="text-muted flex items-center gap-1 text-xs">
                              {f.label}
                              <InfoDot text={f.hint} />
                            </span>
                            <input
                              type="number"
                              className="input mt-1 w-full"
                              value={costPct[f.key]}
                              min={0}
                              step={f.step}
                              onChange={(e) => handleCost(f.key, e.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                      <p className="text-muted mt-2 text-xs leading-relaxed">
                        Model biaya: {costModelLabel(config.cost_defaults)}.
                      </p>
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--bg-elev)] px-4 pt-3 pb-1 sm:-mx-5 sm:px-5">
                  <button
                    type="button"
                    className="btn btn-primary flex w-full items-center justify-center gap-2"
                    onClick={onRun}
                    disabled={!ready}
                  >
                    <Play className="h-4 w-4" />
                    {loading ? "Menghitung..." : "Jalankan Backtest"}
                  </button>
                  <p className="text-muted mt-2 text-center text-xs">
                    {!strategyId
                      ? "Pilih satu strategi dulu di atas."
                      : codelist.length === 0
                        ? "Isi minimal satu kode emiten."
                        : `${codelist.length} emiten · ${PERIODS.find((p) => p.id === period)?.label}`}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------------- results */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {error && <ErrorState message={error} />}

          {!result && !error && (
            <Card title="2. Hasil" info="Hasil muncul di sini setelah kamu menekan “Jalankan Backtest”.">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-72" />
                </div>
              ) : (
                <EmptyState message="Belum ada hasil. Pilih satu strategi di panel kiri, lalu tekan “Jalankan Backtest”." />
              )}
            </Card>
          )}

          {result && (
            <>
              <VerdictCard result={result} alpha={alpha} costErosion={costErosion} />

              <nav
                aria-label="Bagian hasil backtest"
                className="flex flex-wrap gap-2"
                role="tablist"
              >
                {TABS.map(({ id, label, hint, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(id)}
                      title={hint}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--fg)]"
                          : "text-muted border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>

              {tab === "ringkasan" && (
                <div className="space-y-4" role="tabpanel">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="Keuntungan bersih"
                      hint="Total perubahan modal setelah semua biaya dihitung."
                      value={pct(result.metrics.total_return)}
                      tone={toneOf(result.metrics.total_return)}
                    />
                    <Stat
                      label="Selisih vs beli-tahan"
                      hint="Seberapa jauh strategi mengalahkan (atau kalah dari) cara pasif beli lalu diamkan."
                      value={pct(alpha)}
                      tone={toneOf(alpha)}
                    />
                    <Stat
                      label="Jatuh terdalam"
                      hint="Penurunan terbesar dari titik tertinggi ke titik terendah selama uji."
                      value={pct(-result.metrics.max_drawdown)}
                      tone="down"
                    />
                    <Stat
                      label="Imbal hasil per risiko"
                      hint="Keuntungan dibanding naik-turunnya nilai. Makin tinggi makin efisien."
                      value={decimals(result.metrics.sharpe)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="card p-4">
                      <p className="text-muted text-xs">Modal akhir strategi</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">
                        Rp {fmtCompact(result.metrics.final_equity)}
                      </p>
                      <p className="text-muted mt-2 text-xs">
                        Dari modal awal Rp {fmtCompact(result.initial_cash)} →
                        {" "}
                        <span className={toneClass(toneOf(result.metrics.final_equity - result.initial_cash))}>
                          {result.metrics.final_equity >= result.initial_cash ? "untung" : "rugi"} Rp{" "}
                          {fmtCompact(Math.abs(result.metrics.final_equity - result.initial_cash))}
                        </span>
                      </p>
                    </div>
                    <div className="card p-4">
                      <p className="text-muted text-xs">Yang diuji</p>
                      <p className="mt-1 text-sm font-semibold">{result.strategy_name}</p>
                      <p className="text-muted mt-2 text-xs leading-relaxed">
                        {result.codes.length} emiten · {result.days} hari bursa ·{" "}
                        {result.start} → {result.end} · susun ulang {cadenceLabel}
                      </p>
                    </div>
                  </div>

                  <Card
                    title="Cara membaca hasil ini"
                    subtitle="Agar tidak salah tafsir"
                  >
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <Info className="text-muted mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--fg)]">Tanpa mengintip masa depan.</span>{" "}
                          <span className="text-muted">
                            Tiap hari simulasi hanya memakai harga dan data yang
                            memang sudah ada saat itu.
                          </span>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <Info className="text-muted mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--fg)]">Frekuensi susun-ulang itu pengungkit utama.</span>{" "}
                          <span className="text-muted">
                            Makin sering, makin besar biayanya. Coba bandingkan
                            tab Biaya antar frekuensi.
                          </span>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <Info className="text-muted mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--fg)]">Beli-tahan adalah tolok ukur.</span>{" "}
                          <span className="text-muted">
                            Kalau strategi kalah dari sekadar membeli lalu diam,
                            strategi itu belum menambah nilai.
                          </span>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <Info className="text-muted mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="font-semibold text-[var(--fg)]">Ini simulasi, bukan janji.</span>{" "}
                          <span className="text-muted">
                            Hasil bagus di masa lalu tidak berarti bagus di masa depan.
                          </span>
                        </span>
                      </li>
                    </ul>
                  </Card>
                </div>
              )}

              {tab === "kurva" && (
                <Card
                  title="Kurva Modal"
                  subtitle={`${result.codes.length} emiten · ${result.days} hari bursa · ${result.start} → ${result.end}`}
                  info="Grafik pertumbuhan modal dari waktu ke waktu. Garis naik = untung, turun = rugi. Perhatikan juga seberapa dalam jatuhnya, bukan cuma hasil akhirnya."
                  right={<LastUpdated dep={result} />}
                >
                  <EquityCurveChart
                    points={result.equity_curve}
                    initialCash={result.initial_cash}
                  />
                </Card>
              )}

              {tab === "perbandingan" && (
                <Card
                  title="Perbandingan Hasil"
                  subtitle={`Modal awal Rp ${fmtCompact(result.initial_cash)} · strategi ${result.strategy_name}`}
                  info="Membandingkan hasil strategi (setelah dan sebelum biaya) dengan cara pasif beli-tahan. Berguna untuk cek: apakah strategi ini benar-benar lebih baik daripada diam memegang saham?"
                >
                  <MetricsTable
                    gross={result.gross_metrics}
                    net={result.metrics}
                    benchmark={result.benchmark}
                  />
                </Card>
              )}

              {tab === "biaya" && (
                <Card
                  title="Dampak Biaya"
                  subtitle={`Susun ulang ${cadenceLabel} ×${result.rebalance_days} · nilai transaksi Rp ${fmtCompact(result.cost_impact.turnover)} · ${result.days} hari bursa`}
                  info="Rincian biaya (komisi, pajak, slippage) yang menggerus keuntungan. Banyak strategi terlihat cuan di atas kertas tapi rugi setelah biaya nyata dihitung."
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="Total biaya"
                      hint="Jumlah semua komisi, pajak, dan slippage selama periode uji."
                      value={`Rp ${fmtCompact(result.cost_impact.total_cost)}`}
                      tone="down"
                    />
                    <Stat
                      label="Komisi + pajak"
                      value={`Rp ${fmtCompact(result.cost_impact.total_fees)}`}
                      tone="down"
                    />
                    <Stat
                      label="Slippage"
                      value={`Rp ${fmtCompact(result.cost_impact.total_slippage)}`}
                      tone="down"
                    />
                    <Stat
                      label="Porsi biaya dari modal"
                      hint="Berapa persen modal yang habis hanya untuk biaya transaksi."
                      value={pctMag(result.cost_impact.cost_pct_of_equity)}
                      tone="down"
                    />
                  </div>
                  <p className="text-muted mt-3 text-xs leading-relaxed">
                    Biaya menggerus keuntungan{" "}
                    <span className="text-down font-semibold">{pctMag(costErosion)}</span>{" "}
                    ({pct(result.gross_metrics.total_return)} sebelum biaya →{" "}
                    {pct(result.metrics.total_return)} setelah biaya).
                  </p>
                  <p className="text-muted mt-2 text-xs leading-relaxed">
                    Model biaya: {costModelLabel(result.costs)}
                  </p>
                </Card>
              )}

              {tab === "ledger" && (
                <Card
                  title="Jejak Transaksi"
                  subtitle={`Susun ulang ${cadenceLabel} · klik satu sesi untuk lihat pembelian & penjualannya`}
                  info="Catatan setiap kali strategi menyusun ulang portofolio: saham apa yang dibeli/dijual dan berapa. Klik sebuah sesi untuk lihat detail transaksinya."
                >
                  <RebalanceLedger
                    events={result.rebalances}
                    truncated={result.rebalances_truncated}
                    total={result.total_rebalances}
                  />
                </Card>
              )}

              <p className="text-muted text-xs leading-relaxed">{result.disclaimer}</p>
            </>
          )}
        </div>
      </div>

      <Card
        title="Istilah singkat"
        subtitle="Arti kata yang sering muncul di halaman ini"
        right={<BookOpen className="text-muted h-4 w-4" />}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Backtest</dt>
            <dd className="text-muted">Menguji strategi memakai data masa lalu.</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Beli &amp; tahan</dt>
            <dd className="text-muted">
              Beli semua emiten di awal lalu diamkan sampai akhir — pembanding paling jujur.
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Susun ulang (rebalance)</dt>
            <dd className="text-muted">
              Momen strategi menyesuaikan kembali komposisi portofolio sesuai aturannya.
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Biaya transaksi</dt>
            <dd className="text-muted">
              Komisi, pajak jual, dan slippage yang dibayar setiap kali transaksi.
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Cap likuiditas</dt>
            <dd className="text-muted">
              Batas porsi order terhadap nilai transaksi harian; saham tipis hanya bisa diisi sebagian per hari.
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-[var(--fg)]">Jatuh terdalam (drawdown)</dt>
            <dd className="text-muted">
              Penurunan terbesar dari titik tertinggi ke terendah selama periode uji.
            </dd>
          </div>
        </dl>
      </Card>
    </main>
  );
}