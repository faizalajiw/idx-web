"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

// Icon "i" + tooltip penjelasan buat user awam finansial.
export function InfoHint({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [geser, setGeser] = useState(0);
  const tipRef = useRef<HTMLSpanElement>(null);

  // Tooltip 240px yang dipusatkan pada ikon dekat tepi layar bisa keluar
  // viewport dan membuat halaman menggulir mendatar. Ukur setelah tampil, lalu
  // geser seperlunya supaya seluruh teksnya tetap di dalam layar.
  useLayoutEffect(() => {
    if (!open) {
      setGeser(0);
      return;
    }
    const el = tipRef.current;
    if (!el) return;
    const tepi = 8;
    const r = el.getBoundingClientRect();
    if (r.left < tepi) setGeser(tepi - r.left);
    else if (r.right > window.innerWidth - tepi) setGeser(window.innerWidth - tepi - r.right);
    else setGeser(0);
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label ?? "Penjelasan"}
        className="text-muted hover:text-[var(--accent-text)] focus:text-[var(--accent-text)] inline-flex cursor-help items-center outline-none transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          // Selalu buka, jangan balik-tutup: sentuhan memicu focus lalu click
          // sekaligus, jadi toggle menutup tooltip yang baru saja dibuka dan
          // di layar sentuh (tanpa hover) penjelasannya jadi tak bisa dijangkau.
          setOpen(true);
        }}
      >
        <Info size={13} strokeWidth={2.5} />
      </button>
      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${geser}px))` }}
          className="animate-in fade-in absolute top-full left-1/2 z-50 mt-1.5 w-60 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs leading-relaxed font-normal tracking-normal text-[var(--fg)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
