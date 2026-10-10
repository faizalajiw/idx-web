"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function ErrorPage({ error }: { error: Error }) {
  "use client";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight mt-6 mb-1">
          Halaman ingin disajikan tapi kami mengalami masalah.
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          Silakan coba lagi dalam sebentar. Jika hal ini terus-menerus muncul,
          lapor pada admin.
        </p>
        <p className="text-xs text-muted mt-4">{error?.message ?? "-"}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            aria-label="Muat ulang halaman"
          >
            Muat lagi
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => history.back()}
            aria-label="Kembali ke halaman sebelumnya"
          >
            Kembali
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
