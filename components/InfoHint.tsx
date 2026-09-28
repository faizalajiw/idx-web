"use client";

import { useState } from "react";
import { Info } from "lucide-react";

// Icon "i" + tooltip penjelasan buat user awam finansial.
export function InfoHint({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label ?? "Penjelasan"}
        className="text-muted hover:text-[var(--accent)] focus:text-[var(--accent)] inline-flex cursor-help items-center outline-none transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Info size={13} strokeWidth={2.5} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="animate-in fade-in absolute top-full left-1/2 z-50 mt-1.5 w-60 -translate-x-1/2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elev)] px-3 py-2 text-xs leading-relaxed font-normal tracking-normal text-[var(--fg)] shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
