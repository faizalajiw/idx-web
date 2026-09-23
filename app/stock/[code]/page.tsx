"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TechnicalChart } from "@/components/TechnicalChart";
import { HistoryTable } from "@/components/HistoryTable";
import { SignalsPanel } from "@/components/SignalsPanel";

export default function StockDetailPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code?.toUpperCase();

  if (!code) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <p className="text-muted">Kode emiten tidak valid.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-muted text-xs">
            <Link href="/" className="hover:underline">
              ← Kembali ke dashboard
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{code}</h1>
        </div>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TechnicalChart code={code} />
          </div>
          <div className="space-y-4">
            <SignalsPanel codes={code} />
            <HistoryTable code={code} />
          </div>
        </div>
      </div>
    </main>
  );
}
