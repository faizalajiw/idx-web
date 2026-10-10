"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchStocks } from "@/lib/api";
import type { StockSearchResult } from "@/lib/types";

type Action = {
  id: string;
  label: string;
  href: string;
  keywords: string;
};

/** Item hasil gabungan: halaman (navigasi) atau emiten (cari ticker). */
type Item =
  | { kind: "nav"; id: string; label: string; href: string; current: boolean }
  | { kind: "stock"; id: string; code: string; name: string | null };

/** Navigasi utama — sinkron dengan Sidebar NAV_GROUPS. */
const NAV_ACTIONS: Action[] = [
  { id: "home", label: "Dashboard", href: "/", keywords: "beranda home dashboard" },
  { id: "pantau", label: "Pantau", href: "/pantau", keywords: "pantau alert notifikasi" },
  { id: "screener", label: "Screener", href: "/screener", keywords: "screener filter scan cari" },
  { id: "rekomendasi", label: "Rekomendasi Beli", href: "/rekomendasi", keywords: "rekomendasi beli sinyal" },
  { id: "keputusan", label: "Ruang Keputusan", href: "/keputusan", keywords: "keputusan decision" },
  { id: "valuation", label: "Valuasi", href: "/valuation", keywords: "valuasi valuation fair" },
  { id: "hold-check", label: "Hold Check", href: "/hold-check", keywords: "hold cek" },
  { id: "jejak-sinyal", label: "Jejak Sinyal", href: "/jejak-sinyal", keywords: "jejak sinyal history" },
  { id: "backtest", label: "Backtest", href: "/backtest", keywords: "backtest simulasi strategi" },
  { id: "faktor", label: "Faktor & Kalibrasi", href: "/faktor", keywords: "faktor kalibrasi ic" },
  { id: "radar", label: "Radar Smart Money", href: "/radar", keywords: "radar smart money bandarmologi" },
  { id: "foreign", label: "Foreign Flow", href: "/foreign", keywords: "foreign asing net" },
  { id: "flow", label: "Aliran Dana Emiten", href: "/flow", keywords: "aliran dana flow" },
  { id: "sentimen", label: "Sentimen", href: "/sentimen", keywords: "sentimen berita" },
  { id: "broker-activity", label: "Aktivitas Broker", href: "/broker-activity", keywords: "broker bandar" },
  { id: "sectors", label: "Sektor", href: "/sectors", keywords: "sektor sector rotasi" },
];

const STOCK_DEBOUNCE_MS = 250;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [stocks, setStocks] = useState<StockSearchResult[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    setStocks([]);
    setStocksLoading(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => {
      if (v) {
        setQuery("");
        setActiveIndex(0);
        setStocks([]);
      }
      return !v;
    });
  }, []);

  // Shortcut global: Cmd+K / Ctrl+K buka, Esc tutup.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, close]);

  // Autofocus input saat dibuka.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Cari emiten (debounced) — hasil basi dari request sebelumnya diabaikan.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setStocks([]);
      setStocksLoading(false);
      return;
    }
    let cancelled = false;
    setStocksLoading(true);
    const id = setTimeout(() => {
      searchStocks(q)
        .then((rows) => {
          if (!cancelled) setStocks(rows);
        })
        .catch(() => {
          if (!cancelled) setStocks([]); // gagal fetch bukan error fatal — navigasi tetap jalan
        })
        .finally(() => {
          if (!cancelled) setStocksLoading(false);
        });
    }, STOCK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, open]);

  // Filter halaman berdasarkan label + kata kunci.
  const navFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ACTIONS;
    return NAV_ACTIONS.filter((a) =>
      `${a.label} ${a.href} ${a.keywords}`.toLowerCase().includes(q),
    );
  }, [query]);

  // Gabungan: emiten dulu (lebih relevan saat mengetik ticker), lalu halaman.
  const items: Item[] = useMemo(() => {
    const stockItems: Item[] = stocks.map((s) => ({
      kind: "stock",
      id: `stock-${s.code}`,
      code: s.code,
      name: s.name,
    }));
    const navItems: Item[] = navFiltered.map((a) => ({
      kind: "nav",
      id: a.id,
      label: a.label,
      href: a.href,
      current: pathname === a.href,
    }));
    return [...stockItems, ...navItems];
  }, [stocks, navFiltered, pathname]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, stocks]);

  // Scroll item aktif ke pandangan.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Kunci scroll body saat terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (item: Item) => {
      close();
      router.push(item.kind === "stock" ? `/stock/${item.code}` : item.href);
    },
    [close, router],
  );

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) go(item);
    }
  };

  if (!open) return null;

  let lastKind: Item["kind"] | null = null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-hidden />
      <div className="relative mx-auto mt-[12vh] w-[min(560px,92vw)]">
        <div className="card overflow-hidden border border-[var(--border)] shadow-2xl">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Cari halaman atau ticker emiten… (Esc untuk tutup)"
            className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)]"
            aria-label="Cari halaman atau emiten"
          />
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                {stocksLoading
                  ? "Mencari emiten…"
                  : `Tidak ada hasil untuk "${query}"`}
              </p>
            ) : (
              items.map((item, i) => {
                const active = i === activeIndex;
                const header =
                  item.kind !== lastKind
                    ? item.kind === "stock"
                      ? "Emiten"
                      : "Halaman"
                    : null;
                lastKind = item.kind;
                return (
                  <div key={item.id}>
                    {header && (
                      <div className="px-4 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                        {header}
                      </div>
                    )}
                    <Link
                      href={item.kind === "stock" ? `/stock/${item.code}` : item.href}
                      onClick={close}
                      data-active={active}
                      className={`mx-1 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      {item.kind === "stock" ? (
                        <>
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/70"
                              aria-hidden
                            />
                            <span className="font-semibold">{item.code}</span>
                            {item.name && (
                              <span className="truncate text-xs text-[var(--muted)]">
                                {item.name}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                            /stock/{item.code}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                item.current
                                  ? "bg-[var(--accent)]"
                                  : "bg-[var(--muted)]/50"
                              }`}
                              aria-hidden
                            />
                            {item.label}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--muted)]">
                            {item.current ? "aktif" : item.href}
                          </span>
                        </>
                      )}
                    </Link>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-1.5 text-[10px] text-[var(--muted)]">
            <span>↑↓ pilih · ↵ buka</span>
            <span>⌘K / Ctrl+K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
