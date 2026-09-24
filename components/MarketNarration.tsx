"use client";

import { useNarration } from "@/lib/hooks";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";

const TONE_CLASS: Record<string, string> = {
  up: "text-up border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)]",
  down: "text-down border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)]",
  neutral: "text-fg border-[var(--border)] bg-[var(--bg-elev)]",
};

export function MarketNarrationCard() {
  const { data, error, isLoading } = useNarration();

  return (
    <Card
      title="Narasi Pasar"
      subtitle={
        data?.date
          ? `Ringkasan otomatis sesi ${data.date}`
          : "Ringkasan otomatis dari data tersimpan"
      }
      right={<span className="badge badge-accent">auto-generated</span>}
    >
      {error ? (
        <ErrorState message={`Gagal memuat narasi: ${error.message}`} />
      ) : isLoading || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : data.sections.length === 0 ? (
        <p className="text-muted text-sm">Belum ada data untuk dinarasikan.</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {data.sections.map((s, i) => (
            <div
              key={`${s.title}-${i}`}
              className={`fade-up rounded-xl border p-3.5 ${TONE_CLASS[s.tone] ?? TONE_CLASS.neutral}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                <span aria-hidden>{s.icon}</span>
                {s.title.toUpperCase()}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
