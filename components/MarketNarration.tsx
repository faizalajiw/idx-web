"use client";

import { useNarration } from "@/lib/hooks";
import { Card } from "./Card";
import { ErrorState, Skeleton } from "./States";
import { LastUpdated } from "./LastUpdated";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe2,
  Landmark,
  Activity,
  Newspaper,
  Circle,
  type LucideIcon,
} from "lucide-react";

const TONE_CLASS: Record<string, string> = {
  up: "text-up border-[rgba(38,166,154,0.25)] bg-[rgba(38,166,154,0.06)]",
  down: "text-down border-[rgba(239,83,80,0.25)] bg-[rgba(239,83,80,0.06)]",
  neutral: "text-fg border-[var(--border)] bg-[var(--bg-elev)]",
};

/** Peta emoji dari API → ikon lucide agar seragam dengan sidebar. */
const ICON_MAP: Record<string, LucideIcon> = {
  "📈": TrendingUp,
  "📉": TrendingDown,
  "📊": BarChart3,
  "🌐": Globe2,
  "🌏": Globe2,
  "🏦": Landmark,
  "🏛️": Landmark,
  "⚡": Activity,
  "📰": Newspaper,
};

function NarrationIcon({ emoji }: { emoji?: string }) {
  const Icon = (emoji && ICON_MAP[emoji.trim()]) || Circle;
  return <Icon size={14} aria-hidden />;
}

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
      info="Rangkuman kondisi pasar hari ini dalam bahasa sederhana, dibuat otomatis dari data. Cocok untuk cepat paham 'apa yang lagi terjadi' tanpa harus baca angka satu per satu."
      right={
        <div className="flex items-center gap-2">
          <LastUpdated sessionDate={data?.date} updatedAt={data?.generated_at} />
          <span className="badge badge-accent">auto-generated</span>
        </div>
      }
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
                <NarrationIcon emoji={s.icon} />
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
