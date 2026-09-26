"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import {
  LayoutDashboard,
  Filter,
  Landmark,
  BadgeCheck,
  FlaskConical,
  Coins,
  Bell,
  Globe2,
  LayoutGrid,
  GraduationCap,
  ShieldCheck,
  X,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { MarketBadge } from "./MarketBadge";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "Utama",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pantau", label: "Pantau", icon: Bell },
    ],
  },
  {
    title: "Screening",
    items: [{ href: "/screener", label: "Screener", icon: Filter }],
  },
  {
    title: "Analisis",
    items: [
      { href: "/valuation", label: "Valuasi", icon: Landmark },
      { href: "/hold-check", label: "Hold Check", icon: BadgeCheck },
      { href: "/backtest", label: "Backtest", icon: FlaskConical },
      { href: "/dividen", label: "Dividen", icon: Coins },
    ],
  },
  {
    title: "Flow",
    items: [{ href: "/foreign", label: "Foreign Flow", icon: Globe2 }],
  },
  {
    title: "Sektor",
    items: [{ href: "/sectors", label: "Sektor", icon: LayoutGrid }],
  },
  {
    title: "Belajar",
    items: [{ href: "/learn", label: "Belajar Quant", icon: GraduationCap }],
  },
  {
    title: "Sistem",
    items: [{ href: "/quality", label: "Kualitas Data", icon: ShieldCheck }],
  },
];

// ---- mobile drawer open/close shared between top bar and sidebar ----
const SidebarCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarCtx.Provider value={{ open, setOpen }}>{children}</SidebarCtx.Provider>;
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[0_4px_16px_-4px_rgba(139,92,246,0.6)]"
        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6" />
          <path d="M10 3v5.5L4.7 17a2 2 0 0 0 1.7 3h11.2a2 2 0 0 0 1.7-3L14 8.5V3" />
          <path d="M6.5 14h11" />
        </svg>
      </span>
      <span className="gradient-text text-lg font-bold tracking-tight">Market Labs</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Navigasi utama">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-muted mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`nav-link ${active ? "nav-link-active" : ""}`}
                  >
                    <Icon size={17} strokeWidth={2} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Fixed sidebar (desktop) + slide-in drawer (mobile). */
export function Sidebar() {
  const { open, setOpen } = useContext(SidebarCtx);

  return (
    <>
      {/* Desktop */}
      <aside className="glass-strong fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[var(--border)] lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--border)] px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavList />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="glass-strong fade-up absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[var(--border)]">
            <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost"
                aria-label="Tutup menu"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/** Slim top bar shown on all breakpoints; holds hamburger (mobile) + market badge. */
export function Topbar() {
  const { setOpen } = useContext(SidebarCtx);
  return (
    <header className="glass-strong sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-ghost lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu size={18} aria-hidden />
        </button>
        <span className="lg:hidden">
          <Brand />
        </span>
      </div>
      <MarketBadge />
    </header>
  );
}
