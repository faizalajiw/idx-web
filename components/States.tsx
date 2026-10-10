export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export interface ErrorStateProps {
  message: string;
  /**
   * Waktu kapan error terakhir terjadi (misalnya `new Date()` di sisi pemanggil).
   * Kosongkan bila tak diketahui — label tanggal-haknya tidak akan muncul.
   */
  occurredAt?: Date;
  /**
   * Callback mengganti data gradasi tombol. Wajib bila ErrorState berada dalam
   * halaman yang berniat memperbarui ulang.
   */
  onRetry?: () => void;
}

/** Invalid config/empty state = tiada data (tak ada error). */
export function EmptyState({ message = "Tidak ada data." }: { message?: string }) {
  return (
    <div className="text-muted rounded-2xl border border-dashed border-[var(--border)] py-8 text-center text-sm">
      {message}
    </div>
  );
}

/** Kondisi error sementara / gagal — fokus pada aksi Coba lagi. */
export function ErrorState({ message, occurredAt, onRetry }: ErrorStateProps) {
  const stale = !occurredAt || Date.now() - occurredAt.getTime() > 10_000;
  return (
    <div className="alert-error text-down p-3 text-sm" role="alert">
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] text-[var(--accent)] text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-1"
          aria-label="Coba lagi"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 4v6h6" />
            <path d="M3.5 15.5A9 9 0 0 1 17.5 8" />
          </svg>
          {stale ? "Coba sekali lagi" : "Coba lagi"}
        </button>
      )}
    </div>
  );
}
