"use client";

import { useState } from "react";
import { AlertRules } from "@/components/AlertRules";
import { TechnicalChart } from "@/components/TechnicalChart";
import { TelegramStatus } from "@/components/TelegramStatus";
import { WatchlistTable } from "@/components/WatchlistTable";

/**
 * Pantau = watchlist + notifikasi in one place. The watchlist drives both the
 * chart and the list of emiten available to the alert builder, so users do the
 * whole "pilih saham -> pasang batas -> tunggu Telegram" loop without leaving
 * the page.
 */
export default function PantauPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Pantau & <span className="gradient-text">Notifikasi</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Kelola watchlist, pasang batas harga/RSI/volume, lalu terima kabarnya di Telegram
        </p>
      </div>

      <div className="card p-4 text-sm leading-relaxed text-[var(--fg-muted)]">
        <span className="font-semibold text-[var(--fg)]">Cara kerja: </span>
        aturan diperiksa setiap kali data EOD baru masuk. Notifikasi dikirim{" "}
        <span className="font-semibold text-[var(--fg)]">sekali per persilangan</span> —
        begitu kondisi terpenuhi, aturan itu “tersimpan aman” dan baru bisa bunyi lagi
        setelah kondisinya kembali normal. Jadi tidak ada spam tiap hari selama harga
        masih di atas batas.
      </div>

      <WatchlistTable onSelect={setSelected} selected={selected} />

      <TechnicalChart code={selected} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AlertRules />
        <TelegramStatus />
      </div>
    </main>
  );
}
