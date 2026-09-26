export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[rgba(239,83,80,0.3)] bg-[rgba(239,83,80,0.07)] p-3 text-sm text-down">
      {message}
    </div>
  );
}

export function EmptyState({ message = "Tidak ada data." }: { message?: string }) {
  return (
    <div className="text-muted rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-sm">
      {message}
    </div>
  );
}
