export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[var(--down)]/30 bg-[rgba(234,57,67,0.08)] p-3 text-sm text-down">
      {message}
    </div>
  );
}

export function EmptyState({ message = "Tidak ada data." }: { message?: string }) {
  return <div className="text-muted py-6 text-center text-sm">{message}</div>;
}
