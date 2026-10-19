"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { Brand, NavList } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalLastUpdated } from "./GlobalLastUpdated";
import { MarketBadge } from "./MarketBadge";

const PANEL_ID = "m-nav-drawer";

/**
 * Rangka ponsel (di bawah 1024px): header 44px bersih + strip status + drawer.
 * Sidebar penuh disembunyikan lewat CSS, isi navigasinya sama persis karena
 * memakai `NavList` yang sama, bukan daftar salinan.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Layout bertahan saat navigasi klien, jadi drawer tidak tertutup sendiri
  // setelah pengguna memilih halaman. Tutup diam-diam di sini: tanpa
  // mengembalikan fokus ke tombol menu, karena halaman sudah berganti.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci gulir halaman selama drawer terbuka.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("drawer-open", open);
    return () => root.classList.remove("drawer-open");
  }, [open]);

  // Fokus masuk ke tombol tutup saat dibuka.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Fokus dikembalikan ke tombol menu DULUAN, baru ditutup: kalau terbalik,
  // fokus tersangkut di elemen yang sudah inert dan hilang dari halaman.
  function close() {
    menuRef.current?.focus();
    setOpen(false);
  }

  // Esc menutup; Tab berputar di dalam panel, tidak pernah keluar ke belakang.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active ? panel.contains(active) : false;
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="app-mobile-chrome">
      <header className="m-header glass-strong">
        <button
          ref={menuRef}
          type="button"
          className="m-icon-btn"
          aria-label="Buka menu"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen(true)}
        >
          <Menu size={20} aria-hidden />
        </button>
        <Brand />
        <button
          type="button"
          className="m-icon-btn ml-auto"
          aria-label="Cari halaman atau emiten"
          onClick={() => window.dispatchEvent(new Event("ml:palette"))}
        >
          <Search size={19} aria-hidden />
        </button>
      </header>

      <div className="m-status">
        <GlobalLastUpdated />
        <MarketBadge />
      </div>

      <div
        id={PANEL_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className="drawer-layer"
        data-open={open}
        inert={!open}
      >
        <button
          type="button"
          className="drawer-scrim"
          aria-label="Tutup menu"
          tabIndex={-1}
          onClick={close}
        />
        <div ref={panelRef} className="drawer-panel">
          <div className="drawer-head">
            <Brand />
            <button
              ref={closeRef}
              type="button"
              className="m-icon-btn"
              aria-label="Tutup menu"
              onClick={close}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="drawer-nav">
            <NavList />
          </div>
          <div className="drawer-foot">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-muted text-xs">Tema</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
