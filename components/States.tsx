export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="alert-error text-down p-3 text-sm">
      {message}
    </div>
  );
}

export function EmptyState({ message = "Tidak ada data." }: { message?: string }) {
  return (
    <div className="text-muted rounded-2xl border border-dashed border-[var(--border)] py-8 text-center text-sm">
      {message}
    </div>
  );
}
