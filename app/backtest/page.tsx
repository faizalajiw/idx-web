"use client";

import { useEffect, useMemo, useState } from "react";
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

const COST_FIELDS: { key: keyof CostPct; label: string; step: number }[] = [
  { key: "commission", label: "Komisi (%/sisi)", step: 0.05 },
  { key: "tax", label: "Pajak jual (%)", step: 0.05 },
  { key: "slippage", label: "Slippage (%/sisi)", step: 0.05 },
  { key: "adv", label: "Cap likuiditas (% ADTV)", step: 0.5 },
];

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

function decimals(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined) return "-";
  return v.toFixed(digits);
}

function toneOf(v: number | null | undefined): Tone {
  if (v === null || v === undefined || v === 0) return "neutral";
  return v > 0 ? "up" : "down";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  const cls = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <div className="card p-4">
      <p className="text-muted text-xs">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function MetricRow({
  label,
  gross,
  net,
  benchmark,
  tone,
}: {
  label: string;
  gross: string;
  net: string;
  benchmark: string;
  tone?: Tone;
}) {
  const cls = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "";
  return (
    <tr>
      <td className="text-muted">{label}</td>
      <td className="text-muted text-right tabular-nums">{gross}</td>
      <td className={`text-right font-semibold tabular-nums ${cls}`}>{net}</td>
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
            <th className="text-right">Buy &amp; Hold</th>
          </tr>
        </thead>
        <tbody>
          <MetricRow
            label="Total return"
            gross={pct(gross.total_return)}
            net={pct(net.total_return)}
            benchmark={pct(benchmark.total_return)}
            tone={toneOf(net.total_return)}
          />
          <MetricRow
            label="Return tahunan (CAGR)"
            gross={pct(gross.annualized_return)}
            net={pct(net.annualized_return)}
            benchmark={pct(benchmark.annualized_return)}
          />
          <MetricRow
            label="Max drawdown"
            gross={pct(-gross.max_drawdown)}
            net={pct(-net.max_drawdown)}
            benchmark={pct(-benchmark.max_drawdown)}
            tone="down"
          />
          <MetricRow
            label="Volatilitas tahunan"
            gross={pct(gross.volatility)}
            net={pct(net.volatility)}
            benchmark={pct(benchmark.volatility)}
          />
          <MetricRow
            label="Sharpe ratio (rf = 0)"
            gross={decimals(gross.sharpe)}
            net={decimals(net.sharpe)}
            benchmark={decimals(benchmark.sharpe)}
          />
          <MetricRow
            label="Nilai akhir"
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

  // Pick a default strategy (and its default params) once the catalog loads.
  useEffect(() => {
    if (!strategyId && strategies?.length) {
      setStrategyId(strategies[0].id);
      setParams(defaultsFor(strategies[0]));
    }
  }, [strategies, strategyId]);

  // Seed the cadence and cost knobs from the backend defaults, and the universe
  // from the watchlist — each only the first time the data arrives.
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

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Backtest <span className="gradient-text">Simulator</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Uji strategi di data historis point-in-time, lengkap dengan komisi,
          pajak, slippage &amp; batas likuiditas
        </p>
      </div>

      <RegimeBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------------------------------------------------------- form */}
        <div className="lg:col-span-1">
          <Card title="Konfigurasi" subtitle="Strategi, universe, periode, dan biaya">
            {configError ? (
              <ErrorState message={`Gagal memuat konfigurasi: ${configError.message}`} />
            ) : configLoading || !config || !costPct ? (
              <Skeleton className="h-72" />
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                    Strategi
                  </p>
                  <div className="space-y-2">
                    {config.strategies.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => choose(s)}
                        className={`card card-hover w-full p-3 text-left ${
                          strategyId === s.id ? "ring-1 ring-[var(--accent)]" : ""
                        }`}
                      >
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-muted mt-1 text-xs leading-relaxed">
                          {s.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {current && current.params.length > 0 && (
                  <div>
                    <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                      Parameter
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {current.params.map((p) => (
                        <label key={p.key} className="block">
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

                <label className="block">
                  <span className="text-muted text-xs">
                    Emiten (pisah koma, maks {config.max_codes})
                  </span>
                  <textarea
                    className="input mt-1 w-full resize-y"
                    rows={3}
                    value={codes}
                    placeholder="BBCA, BBRI, TLKM"
                    onChange={(e) => setCodes(e.target.value)}
                  />
                </label>

                <div>
                  <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                    Periode
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPeriod(p.id)}
                        className={`chip ${period === p.id ? "chip-active" : ""}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted mb-2 text-xs font-semibold tracking-wider uppercase">
                    Frekuensi rebalance
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.rebalance_options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        title={option.description}
                        onClick={() => setRebalance(option.id)}
                        className={`chip ${rebalance === option.id ? "chip-active" : ""}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted mt-2 text-xs leading-relaxed">
                    Di antara hari rebalance, posisi dibiarkan mengikuti pasar —
                    bukan dipaksa balik ke bobot target. Makin jarang, makin
                    kecil turnover dan biayanya.
                  </p>
                </div>

                <label className="block">
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
                        onClick={() => setCostPct(preset.value)}
                        className={`chip ${activeCostPreset === preset.id ? "chip-active" : ""}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {COST_FIELDS.map((f) => (
                      <label key={f.key} className="block">
                        <span className="text-muted text-xs">{f.label}</span>
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
                    Cap likuiditas membatasi porsi tiap order terhadap nilai
                    transaksi harian emiten; 0 berarti tanpa batas.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={onRun}
                  disabled={loading || !strategyId || !codes.trim()}
                >
                  {loading ? "Menghitung…" : "Jalankan Backtest"}
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------------- results */}
        <div className="space-y-4 lg:col-span-2">
          {error && <ErrorState message={error} />}

          {!result && !error && (
            <Card title="Hasil">
              <EmptyState message="Atur strategi di kiri, lalu klik “Jalankan Backtest”." />
            </Card>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Total return (neto)"
                  value={pct(result.metrics.total_return)}
                  tone={toneOf(result.metrics.total_return)}
                />
                <Stat label="Alpha vs B&H" value={pct(alpha)} tone={toneOf(alpha)} />
                <Stat
                  label="Max drawdown"
                  value={pct(-result.metrics.max_drawdown)}
                  tone="down"
                />
                <Stat label="Sharpe (neto)" value={decimals(result.metrics.sharpe)} />
              </div>

              <Card
                title="Equity Curve"
                subtitle={`${result.codes.length} emiten · ${result.days} hari bursa · ${result.start} → ${result.end}`}
              >
                <EquityCurveChart
                  points={result.equity_curve}
                  initialCash={result.initial_cash}
                />
              </Card>

              <Card
                title="Perbandingan Metrik"
                subtitle={`Modal awal Rp ${fmtCompact(result.initial_cash)} · strategi ${result.strategy_name}`}
              >
                <MetricsTable
                  gross={result.gross_metrics}
                  net={result.metrics}
                  benchmark={result.benchmark}
                />
              </Card>

              <Card
                title="Dampak Biaya"
                subtitle={`Rebalance ${cadenceLabel} ×${result.rebalance_days} · turnover Rp ${fmtCompact(result.cost_impact.turnover)} · ${result.days} hari bursa`}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Total biaya"
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
                    label="Cost drag"
                    value={pct(result.cost_impact.cost_pct_of_equity)}
                    tone="down"
                  />
                </div>
                <p className="text-muted mt-3 text-xs leading-relaxed">
                  Erosi return dari biaya:{" "}
                  <span className="text-down font-semibold">{pct(costErosion)}</span>{" "}
                  ({pct(result.gross_metrics.total_return)} sebelum biaya →{" "}
                  {pct(result.metrics.total_return)} setelah biaya).
                </p>
                <p className="text-muted mt-2 text-xs leading-relaxed">
                  Model: {costModelLabel(result.costs)}
                </p>
              </Card>

              <Card
                title="Ledger Rebalance"
                subtitle={`Rebalance ${cadenceLabel} · klik salah satu sesi untuk lihat trade & posisinya`}
              >
                <RebalanceLedger
                  events={result.rebalances}
                  truncated={result.rebalances_truncated}
                  total={result.total_rebalances}
                />
              </Card>

              <p className="text-muted text-xs leading-relaxed">{result.disclaimer}</p>
            </>
          )}
        </div>
      </div>

      <Card title="Cara membaca hasil" subtitle="Agar tidak salah tafsir">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-semibold text-[var(--fg)]">Point-in-time.</span>{" "}
            <span className="text-muted">
              Emiten hanya “melihat” harga sampai hari simulasi, jadi tidak ada
              look-ahead bias. Harga juga disesuaikan dengan aksi korporasi
              (split/bonus) yang sudah diketahui saat itu.
            </span>
          </li>
          <li>
            <span className="font-semibold text-[var(--fg)]">Frekuensi rebalance itu pengungkit utama.</span>{" "}
            <span className="text-muted">
              Rebalance harian memaksa seluruh buku kembali ke bobot target tiap
              sesi, jadi turnover-nya besar. Mingguan atau bulanan membiarkan
              posisi mengalir dan hampir selalu memangkas biaya drastis —
              bandingkan kartu “Dampak Biaya” antar frekuensi.
            </span>
          </li>
          <li>
            <span className="font-semibold text-[var(--fg)]">Biaya bikin atau menghancurkan.</span>{" "}
            <span className="text-muted">
              Setiap rebalance dibebani komisi dua arah, pajak jual, dan slippage.
              Lihat kolom “Sebelum biaya” vs “Setelah biaya” untuk tahu berapa
              yang dimakan biaya.
            </span>
          </li>
          <li>
            <span className="font-semibold text-[var(--fg)]">Cap likuiditas.</span>{" "}
            <span className="text-muted">
              Order dibatasi porsi tertentu dari nilai transaksi harian emiten,
              jadi saham tipis hanya bisa diisi sebagian per hari (realistis,
              tapi butuh beberapa hari untuk masuk/keluar penuh).
            </span>
          </li>
          <li>
            <span className="font-semibold text-[var(--fg)]">Ledger = bukti churn.</span>{" "}
            <span className="text-muted">
              Tiap sesi rebalance merekam persis emiten mana yang dibeli/dijual,
              volume, harga eksekusi, fee, dan posisi akhirnya. Dari sini
              kelihatan kenapa turnover bisa besar walau sinyal jarang berubah.
            </span>
          </li>
          <li>
            <span className="font-semibold text-[var(--fg)]">Buy &amp; Hold = tolok ukur.</span>{" "}
            <span className="text-muted">
              Benchmark beli rata semua emiten di awal periode (hanya dibebani
              biaya masuk) lalu didiamkan. Kalau strategi kalah dari kolom ini,
              strategi belum menambah nilai.
            </span>
          </li>
        </ul>
      </Card>
    </main>
  );
}
