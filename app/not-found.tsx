"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight mt-8 mb-1">Halaman tidak ditemukan</h1>
        <p className="text-muted text-sm leading-relaxed">
          Halaman yang kamu tuju tidak ada atau sudah dipindah. Coba kembali,
          atau cek penulisan alamatnya.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.assign("/")}
          >
            Kembali ke beranda
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.history.back() ?? null}
          >
            Kembali
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
