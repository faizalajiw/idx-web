"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";
import { EmptyState, ErrorState, Skeleton } from "./States";
import { useLatestNews } from "@/lib/hooks";
import type { NewsItem, NewsList } from "@/lib/types";

function relTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (Number.isNaN(diff)) return "";
  if (diff < 1) return "baru saja";
  if (diff < 60) return `${Math.floor(diff)} menit lalu`;
  if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
  return `${Math.floor(diff / 1440)} hari lalu`;
}

const PREVIEW_COUNT = 3;

function NewsListView({
  data,
  error,
  loading,
  onRetry,
}: {
  data?: NewsList;
  error?: Error;
  loading: boolean;
  onRetry: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (loading || !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (data.items.length === 0) return <EmptyState message="Belum ada berita." />;
  const preview = data.items.slice(0, PREVIEW_COUNT);
  const hasMore = data.items.length > PREVIEW_COUNT;
  return (
    <>
      <NewsList items={preview} />
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs font-medium opacity-80 transition hover:bg-white/5 hover:opacity-100"
        >
          Lihat semua ({data.items.length})
        </button>
      )}
      {showAll && <NewsModal items={data.items} onClose={() => setShowAll(false)} />}
    </>
  );
}

function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <ol className="space-y-2">
      {items.map((n, i) => (
        <li key={n.url}>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-white/5"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-medium group-hover:underline">
                {n.title}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs opacity-60">
                <span>{n.source}</span>
                <span>·</span>
                <span>{relTime(n.published_at)}</span>
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function NewsModal({ items, onClose }: { items: NewsItem[]; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semua berita"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        aria-hidden
      />
      <div className="relative flex max-h-[80vh] w-[min(600px,100%)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl animate-[popIn_180ms_ease-out]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Semua Berita</h3>
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
              {items.length} berita · 7 hari terakhir · Stockbit Snips
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-muted)] transition hover:bg-[var(--bg-elev)] hover:text-[var(--fg)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <ul className="overflow-y-auto divide-y divide-[var(--border)] p-2">
          {items.map((n, i) => (
            <li key={n.url}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl px-3 py-3 transition hover:bg-[var(--bg-elev)]"
              >
                <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--fg-muted)]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium leading-snug transition group-hover:text-[var(--accent-text)]">
                    {n.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                    <span className="font-medium">{n.source}</span>
                    <span aria-hidden>•</span>
                    <span>{relTime(n.published_at)}</span>
                  </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-[var(--fg-muted)] opacity-0 transition group-hover:opacity-100" aria-hidden>
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LatestNewsCard() {
  const { data, error, isLoading, mutate } = useLatestNews();
  return (
    <Card
      title="MarLabs News"
      subtitle="Berita dan riset terbaru dari Stockbit Snips 7 hari terakhir"
      info="Judul terbaru dari snips.stockbit.com, diurutkan dari yang paling baru. Data diambil otomatis tiap 15 menit. Klik judul untuk membuka sumber asli."
    >
      <NewsListView
        data={data}
        error={error}
        loading={isLoading}
        onRetry={() => mutate()}
      />
    </Card>
  );
}



