"use client";

import { useMemo, useState } from "react";
import {
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
  useWatchlist,
} from "@/lib/hooks";
import { fmtNum, fmtPct } from "@/lib/format";
import type { AlertRuleStatus, AlertRuleType, WatchlistRow } from "@/lib/types";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

function fmtMetric(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "-";
  if (unit === "IDR") return fmtNum(value);
  if (unit === "RSI") return value.toFixed(1);
  return `${value.toFixed(2)}×`;
}

function signalBadge(signal: string | null): string {
  if (signal === "BUY") return "badge badge-buy";
  if (signal === "SELL") return "badge badge-sell";
  return "badge badge-hold";
}

function defaultThreshold(
  spec: AlertRuleType | undefined,
  rows: WatchlistRow[] | undefined,
  code: string,
): number {
  if (!spec) return 0;
  // Price levels are far more useful pre-filled with the current price.
  if (spec.unit === "IDR" && code) {
    const row = rows?.find((r) => r.code === code);
    if (row?.close) return Math.round(row.close);
  }
  return spec.default;
}

function RuleRow({
  rule,
  onRemove,
  busy,
}: {
  rule: AlertRuleStatus;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  return (
    <tr>
      <td>
        <span className="font-semibold">{rule.code}</span>
        <span className="text-muted ml-2 text-xs tabular-nums">
          {fmtNum(rule.close)}
          {rule.percent !== null ? ` (${fmtPct(rule.percent)})` : ""}
        </span>
      </td>
      <td>
        <span className="text-sm">{rule.type_label}</span>
        {rule.note && <span className="text-muted ml-2 text-xs">· {rule.note}</span>}
      </td>
      <td className="text-right tabular-nums">
        {fmtMetric(rule.threshold, rule.unit)}
      </td>
      <td className="text-right tabular-nums">{fmtMetric(rule.current, rule.unit)}</td>
      <td className="text-center">
        <span className={rule.triggered ? "badge badge-warn" : "badge badge-hold"}>
          {rule.triggered ? "TERPICU" : "menunggu"}
        </span>
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={() => onRemove(rule.id)}
          disabled={busy}
          title={`Hapus aturan ${rule.code} ${rule.type_label}`}
          aria-label={`Hapus aturan ${rule.code} ${rule.type_label}`}
          className="text-muted hover:text-down rounded px-1.5 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

export function AlertRules() {
  const { data, error, isLoading } = useAlerts();
  const { data: watchlist } = useWatchlist();
  const addAlert = useCreateAlert();
  const removeAlert = useDeleteAlert();

  const [code, setCode] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutateError, setMutateError] = useState<string | null>(null);

  const ruleTypes = useMemo(() => data?.rule_types ?? [], [data]);
  const activeCode = code ?? watchlist?.[0]?.code ?? "";
  const activeType = typeId ?? ruleTypes[0]?.id ?? "";
  const spec = ruleTypes.find((t) => t.id === activeType);
  const effectiveThreshold =
    threshold ?? defaultThreshold(spec, watchlist, activeCode);

  const sortedRules = useMemo(() => {
    const rules = data?.rules ?? [];
    return [...rules].sort(
      (a, b) => a.code.localeCompare(b.code) || a.type.localeCompare(b.type),
    );
  }, [data]);

  async function handleAdd() {
    if (!activeCode || !activeType || busy) return;
    setBusy(true);
    setMutateError(null);
    try {
      await addAlert({
        code: activeCode,
        type: activeType,
        threshold: effectiveThreshold,
        note: note.trim() || null,
      });
      setNote("");
      setThreshold(null);
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : "Gagal menambah aturan");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (busy) return;
    setBusy(true);
    setMutateError(null);
    try {
      await removeAlert(id);
    } catch (e) {
      setMutateError(e instanceof Error ? e.message : "Gagal menghapus aturan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Aturan Notifikasi"
      subtitle="Dikirim via Telegram sekali per persilangan ambang"
      right={
        data ? (
          <span className={data.triggered_count > 0 ? "badge badge-warn" : "badge badge-hold"}>
            {data.triggered_count} terpicu
          </span>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={`Gagal memuat aturan: ${error.message}`} />
      ) : isLoading || !data ? (
        <Skeleton className="h-56" />
      ) : (            <div className="space-y-4">
              {/* ------------------------------------------------------- builder */}
          {!watchlist?.length ? (
            <EmptyState message="Tambahkan emiten ke watchlist dulu, lalu pasang aturannya di sini." />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-muted text-xs">Emiten</span>
                  <select
                    className="input mt-1 w-full"
                    value={activeCode}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setThreshold(null);
                    }}
                  >
                    {watchlist.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-muted text-xs">Kondisi</span>
                  <select
                    className="input mt-1 w-full"
                    value={activeType}
                    onChange={(e) => {
                      setTypeId(e.target.value);
                      setThreshold(null);
                    }}
                  >
                    {ruleTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {spec && (
                <p className="text-muted text-xs leading-relaxed">{spec.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-muted text-xs">
                    Ambang ({spec?.unit === "IDR" ? "Rp" : spec?.unit ?? "-"})
                  </span>
                  <input
                    type="number"
                    className="input mt-1 w-full"
                    value={effectiveThreshold}
                    min={spec?.min ?? undefined}
                    max={spec?.max ?? undefined}
                    step={spec?.step ?? 1}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = Number(raw);
                      setThreshold(
                        raw.trim() === "" || Number.isNaN(parsed) ? null : parsed,
                      );
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-muted text-xs">Catatan (opsional)</span>
                  <input
                    type="text"
                    className="input mt-1 w-full"
                    value={note}
                    placeholder="mis. resistance"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => void handleAdd()}
                disabled={busy || !activeCode || !activeType}
              >
                {busy ? "Menyimpan…" : "+ Tambah aturan"}
              </button>
              {mutateError && <ErrorState message={mutateError} />}
            </div>
          )}

          {/* --------------------------------------------------------- list */}
          {sortedRules.length === 0 ? (
            <EmptyState message="Belum ada aturan. Tambahkan satu di atas." />
          ) : (
            <div className="max-h-[380px] overflow-auto">
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-[var(--bg-card-solid)]">
                  <tr>
                    <th className="text-left">Emiten</th>
                    <th className="text-left">Kondisi</th>
                    <th className="text-right">Ambang</th>
                    <th className="text-right">Kini</th>
                    <th className="text-center">Status</th>
                    <th className="py-2 text-right">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRules.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onRemove={(id) => void handleRemove(id)}
                      busy={busy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-muted text-xs tabular-nums">
            Diperiksa {data.checked_at.slice(11, 16)} WIB · {sortedRules.length} aturan
            {sortedRules[0]?.signal ? (
              <>
                {" "}
                · sinyal {sortedRules[0].code}{" "}
                <span className={signalBadge(sortedRules[0].signal)}>
                  {sortedRules[0].signal}
                </span>
              </>
            ) : null}
          </p>
        </div>
      )}
    </Card>
  );
}
