"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Filter,
  Landmark,
  BadgeCheck,
  FlaskConical,
  History,
  Bell,
  Globe2,
  ArrowLeftRight,
  Waves,
  Activity,
  LayoutGrid,
  ShieldCheck,
  Scale,
  Radar,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { MarketBadge } from "./MarketBadge";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalLastUpdated } from "./GlobalLastUpdated";

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
      { href: "/rekomendasi", label: "Rekomendasi Beli", icon: Target },
      { href: "/keputusan", label: "Ruang Keputusan", icon: Scale },
      { href: "/valuation", label: "Valuasi", icon: Landmark },
      { href: "/hold-check", label: "Hold Check", icon: BadgeCheck },
      { href: "/jejak-sinyal", label: "Jejak Sinyal", icon: History },
      { href: "/backtest", label: "Backtest", icon: FlaskConical },
      { href: "/faktor", label: "Faktor & Kalibrasi", icon: ShieldCheck },
    ],
  },
  {
    title: "Flow",
    items: [
      { href: "/radar", label: "Radar Smart Money", icon: Radar },
      { href: "/foreign", label: "Foreign Flow", icon: Globe2 },
      { href: "/flow", label: "Aliran Dana Emiten", icon: ArrowLeftRight },
      { href: "/sentimen", label: "Sentimen", icon: Waves },
      { href: "/broker-activity", label: "Aktivitas Broker", icon: Activity },
    ],
  },
  {
    title: "Sektor",
    items: [{ href: "/sectors", label: "Sektor", icon: LayoutGrid }],
  },
];

const SIDEBAR_KEY = "ml-sidebar-collapsed";

/** Buka/tutup sidebar desktop. Status disimpan sebagai kelas di <html> +
 *  localStorage supaya konsisten dengan script inline di layout (tanpa kedip). */
function toggleSidebar() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const next = !root.classList.contains("sidebar-collapsed");
  root.classList.toggle("sidebar-collapsed", next);
  try {
    localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
  } catch {}
}

function Brand() {
  return (
    <Link href="/" className="brand-link flex items-center gap-2.5 px-1" aria-label="Market Labs">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: "var(--accent)" }}
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6" />
          <path d="M10 3v5.5L4.7 17a2 2 0 0 0 1.7 3h11.2a2 2 0 0 0 1.7-3L14 8.5V3" />
          <path d="M6.5 14h11" />
        </svg>
      </span>
      <span className="brand-text gradient-text text-lg font-bold tracking-tight">Market Labs</span>
    </Link>
  );
}

function NavList() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Navigasi utama">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="nav-group-title text-muted mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]">
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
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`nav-link ${active ? "nav-link-active" : ""}`}
                  >
                    <Icon size={17} strokeWidth={2} aria-hidden />
                    <span className="nav-label">{item.label}</span>
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

/** Sidebar selalu tampil: penuh di desktop, rail ikon saat disembunyikan / di layar kecil. */
export function Sidebar() {
  return (
    <aside className="app-sidebar glass-strong fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--border)]">
      <div className="sidebar-header flex h-16 items-center border-b border-[var(--border)] px-3">
        <Brand />
        <button
          type="button"
          onClick={toggleSidebar}
          className="btn btn-ghost sidebar-toggle-btn"
          aria-label="Sembunyikan atau tampilkan sidebar"
          title="Sembunyikan / tampilkan sidebar"
        >
          <PanelLeftClose size={18} className="icon-expanded" aria-hidden />
          <PanelLeftOpen size={18} className="icon-rail" aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-5">
        <NavList />
      </div>
    </aside>
  );
}

/** Top bar: brand (mobile / saat sidebar jadi rail) di kiri, kontrol di kanan. */
export function Topbar() {
  return (
    <header className="glass-strong sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] px-4 sm:px-6">
      <span className="topbar-brand lg:hidden">
        <Brand />
      </span>
      <div className="flex items-center gap-2">
        <GlobalLastUpdated />
        <ThemeToggle />
        <MarketBadge />
      </div>
    </header>
  );
}
