"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SmartMoneyBanner } from "@/components/SmartMoneyBanner";
import { SmartMoneyTrackRecordCard } from "@/components/SmartMoneyTrackRecordCard";

/**
 * Deep-link dari Radar Smart Money: halaman jejak lengkap satu emiten.
 * Konten inti = SmartMoneyBanner (verdict + pola + level + narasi + sektor),
 * dengan tombol balik ke radar.
 */
export default function RadarStockPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code?.toUpperCase();

  if (!code) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-muted">Kode emiten tidak valid.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/radar"
          className="text-accent hover:underline inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft size={15} aria-hidden />
          Radar Smart Money
        </Link>
        <div className="text-muted flex items-center gap-1.5 text-xs">
          <Link href={`/stock/${code}`} className="hover:underline">
            Detail teknikal
          </Link>
          <span>/</span>
          <Link href={`/flow/${code}`} className="hover:underline">
            Arus asing
          </Link>
        </div>
      </div>

      <SmartMoneyBanner code={code} />

      <SmartMoneyTrackRecordCard />
    </main>
  );
}
