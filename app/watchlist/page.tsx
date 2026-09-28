"use client";

import { useState } from "react";
import { WatchlistTable } from "@/components/WatchlistTable";
import { TechnicalChart } from "@/components/TechnicalChart";

export default function WatchlistPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="gradient-text">Watchlist</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Daftar pantau manual · tambah/hapus emiten sendiri · auto-refresh 30 detik
        </p>
      </div>

      <WatchlistTable onSelect={setSelected} selected={selected} />
      <TechnicalChart code={selected} />
    </main>
  );
}
