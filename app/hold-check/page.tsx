import { HoldCheckPanel } from "@/components/HoldCheckPanel";
import { RegimeBanner } from "@/components/RegimeBanner";

export const metadata = { title: "Hold Check · Market Labs" };

export default function HoldCheckPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Hold <span className="gradient-text">Check</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Apakah saham di watchlist masih layak dipegang? Skor gabungan sinyal
          teknikal (SMA20/50, RSI, MACD, Bollinger) dan valuasi (z-score vs band
          60-hari).
        </p>
      </div>
      <RegimeBanner />
      <HoldCheckPanel />
    </main>
  );
}
