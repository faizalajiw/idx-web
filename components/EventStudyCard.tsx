"use client";

import { useStockEvents } from "@/lib/hooks";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";

const pct = (v: number | null, digits = 1) =>
  v === null ? "-" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;

const EVENT_LABEL: Record<string, { label: string; icon: string }> = {
  jump_up: { label: "Jump Up", icon: "🚀" },
  jump_down: { label: "Jump Down", icon: "🩸" },
  vol_spike: { label: "Volume Spike", icon: "📊" },
  near_high: { label: "Dekat Puncak 63h", icon: "⛰️" },
  ma_cross_up: { label: "SMA20↑50", icon: "📈" },
  ma_cross_down: { label: "SMA20↓50", icon: "📉" },
};

function tone(v: number | null): string {
  if (v === null) return "text-muted";
  return v >= 0 ? "text-up" : "text-down";
}

/**
 * Kartu event study untuk satu emiten: seberapa sering event terjadi,
 * median forward return 21 hari emiten itu sendiri, abnormal vs pasar,
 * dibandingkan baseline seluruh pasar.
 */
export function EventStudyCard({ code }: { code: string }) {
  const { data, error, isLoading } = useStockEvents(code);

  return (
    <Card
      title="Event Study"
      subtitle="Median return 21 hari bursa setelah event (entry T+1), vs baseline seluruh pasar"
    >
      {error ? (
        <ErrorState message="Gagal memuat event study." />
      ) : isLoading || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Event</th>
                  <th className="text-right">Kali</th>
                  <th className="text-right">Terakhir</th>
                  <th className="text-right" title="Median forward return 21 hari emiten ini">
                    Median 21h
                  </th>
                  <th className="text-right" title="Median emiten dikurangi median pasar">
                    Abnormal
                  </th>
                  <th className="text-right" title="Hit-rate semua emiten (baseline pasar)">
                    Pasar hit
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e) => {
                  const meta = EVENT_LABEL[e.event] ?? { label: e.event, icon: "•" };
                  const noData = e.my_count === 0;
                  return (
                    <tr key={e.event}>
                      <td>
                        <span aria-hidden className="mr-1">{meta.icon}</span>
                        {meta.label}
                      </td>
                      <td className={`text-right tabular-nums ${noData ? "text-muted" : "font-semibold"}`}>
                        {e.my_count}
                      </td>
                      <td className="text-muted text-right tabular-nums">
                        {e.my_last_date ?? "-"}
                      </td>
                      <td className={`text-right tabular-nums ${noData ? "" : tone(e.my_median_fwd)}`}>
                        {noData ? "-" : pct(e.my_median_fwd)}
                      </td>
                      <td className={`text-right tabular-nums ${noData ? "" : tone(e.my_median_abnormal)}`}>
                        {noData ? "-" : pct(e.my_median_abnormal)}
                      </td>
                      <td className="text-muted text-right tabular-nums">
                        {e.market_hit_rate !== null
                          ? `${(e.market_hit_rate * 100).toFixed(0)}% (${e.market_count})`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.events.every((e) => e.my_count === 0) && (
            <EmptyState message="Belum ada event pada emiten ini dalam cakupan data." />
          )}
          <p className="text-muted text-[11px] leading-snug">
            Baseline pasar = seluruh emiten dengan event serupa (jumlah di kolom
            kanan). Abnormal = median emiten dikurangi median pasar. Angka
            historis-indikatif, bukan prediksi; event dihitung point-in-time
            dengan eksekusi T+1.
          </p>
        </div>
      )}
    </Card>
  );
}
