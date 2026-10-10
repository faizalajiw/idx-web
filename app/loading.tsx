import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/States";

export default function LoadingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <Skeleton className="w-10 h-10 rounded-full ring-1 ring-[var(--border)]" />
        <p className="text-muted text-sm">Menyiapkan halaman...</p>
        <ThemeToggle />
      </div>
    </div>
  );
}
