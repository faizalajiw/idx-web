"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useWatchlist } from "@/lib/hooks";
import { TechnicalChart } from "@/components/TechnicalChart";
import { HistoryTable } from "@/components/HistoryTable";
import { SignalsPanel } from "@/components/SignalsPanel";
import { BrokerSummary } from "@/components/BrokerSummary";
import { RegimeBanner } from "@/components/RegimeBanner";
import { EventStudyCard } from "@/components/EventStudyCard";

const NAV_BTN =
  "card inline-flex min-w-[96px] items-center justify-center px-3 py-2 text-sm transition-colors hover:bg-white/[0.03]";
const NAV_DISABLED = "card inline-flex min-w-[96px] items-center justify-center px-3 py-2 text-sm text-muted opacity-50";

export default function StockDetailPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code?.toUpperCase();

  // Prev/next follow the backend watchlist (alphabetical, circular), so a
  // stock opened from the dashboard can be browsed without going back.
  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();

  const { prev, next } = useMemo(() => {
    if (!watchlist?.length || !code) return { prev: null as string | null, next: null as string | null };
    const codes = watchlist.map((r) => r.code).sort((a, b) => a.localeCompare(b));
    const idx = codes.indexOf(code);
    if (idx === -1) return { prev: null as string | null, next: null as string | null };
    return {
      prev: codes[(idx - 1 + codes.length) % codes.length],
      next: codes[(idx + 1) % codes.length],
    };
  }, [watchlist, code]);

  if (!code) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <p className="text-muted">Kode emiten tidak valid.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <nav className="text-muted text-xs" aria-label="Breadcrumb">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-[var(--fg)]">{code}</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{code}</h1>
        </div>

        <nav className="flex shrink-0 items-center gap-2" aria-label="Navigasi emiten">
          {prev ? (
            <Link href={`/stock/${prev}`} className={NAV_BTN} title={`Ke ${prev}`}>
              <span aria-hidden>←</span>&nbsp;{prev}
            </Link>
          ) : (
            <span className={NAV_DISABLED}>
              <span aria-hidden>←</span>&nbsp;—
            </span>
          )}
          {next ? (
            <Link href={`/stock/${next}`} className={NAV_BTN} title={`Ke ${next}`}>
              {next}&nbsp;<span aria-hidden>→</span>
            </Link>
          ) : (
            <span className={NAV_DISABLED}>
              —&nbsp;<span aria-hidden>→</span>
            </span>
          )}
        </nav>
      </header>

      <div className="space-y-4">
        <RegimeBanner />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TechnicalChart code={code} />
          </div>
          <div className="space-y-4">
            <SignalsPanel codes={code} />
            <BrokerSummary code={code} />
            <EventStudyCard code={code} />
            <HistoryTable code={code} />
          </div>
        </div>
      </div>
    </main>
  );
}
