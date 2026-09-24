import Link from "next/link";
import { Card } from "@/components/Card";

const STAGES = [
  {
    n: "01",
    title: "Fondasi: Python untuk Data",
    weeks: "Minggu 1–4",
    color: "#818cf8",
    items: [
      "Python dasar: list, dict, function, class — cukup 2 minggu kalau fokus",
      "NumPy: array, vektorisasi (jangan pakai for-loop untuk hitung math)",
      "pandas: DataFrame, groupby, rolling, resample — INI 80% pekerjaan quant",
      "Matplotlib/Plotly untuk visualisasi cepat",
    ],
    resources: [
      ["Kaggle Learn (Pandas)", "https://www.kaggle.com/learn/pandas"],
      ["Python for Data Analysis (buku Wes McKinney)", "https://wesmckinney.com/book/"],
    ],
  },
  {
    n: "02",
    title: "Statistik & Matematika Pasar",
    weeks: "Minggu 5–10",
    color: "#22d3ee",
    items: [
      "Distribusi, mean/variance/std — dasar dari SEMUA risk metric",
      "Korelasi & kovarians: kenapa diversifikasi bekerja",
      "Regresi linear: hubungan antar variabel (beta saham vs IHSG!)",
      "Random walk hypothesis & log-return (kenapa return di-LOG-kan)",
    ],
    resources: [
      ["Khan Academy Statistics", "https://www.khanacademy.org/math/statistics-probability"],
      ["QuantStart: statistics for quant trading", "https://www.quantstart.com/articles/"],
    ],
  },
  {
    n: "03",
    title: "Analisis Teknikal yang Benar",
    weeks: "Minggu 11–14",
    color: "#34d399",
    items: [
      "MA crossover, RSI, MACD — kalian SUDAH pakai ini di dashboard ini!",
      "Backtest dasar: kenapa MA crossover di IHSG sering rugi setelah biaya",
      "Konsep lookahead bias & overfitting — kesalahan pemula #1 dan #2",
      "Tulis backtest sendiri di pandas sebelum pakai library (backtrader/vectorbt)",
    ],
    resources: [
      ["vectorbt docs (backtesting)", "https://vectorbt.dev/"],
      ["QuantConnect Bootcamp (gratis)", "https://www.quantconnect.com/learn"],
    ],
  },
  {
    n: "04",
    title: "Portfolio & Risk Management",
    weeks: "Minggu 15–20",
    color: "#fbbf24",
    items: [
      "Sharpe ratio, max drawdown, VaR — bahasa resmi dunia quant",
      "Modern Portfolio Theory & Efficient Frontier (Markowitz)",
      "Position sizing: kenapa risk per trade 1–2% itu standar",
      "Walk-forward optimization: test di data yang TIDAK dipakai tuning",
    ],
    resources: [
      ["QuantStart portfolio series", "https://www.quantstart.com/articles/"],
      ["EDHEC: Investment Management with Python (Coursera audit gratis)", "https://www.coursera.org/specializations/investment-management-python"],
    ],
  },
  {
    n: "05",
    title: "Proyek Nyata dengan Data Sendiri",
    weeks: "Bulan 6+",
    color: "#f87171",
    items: [
      "Pakai database Postgres dari project ini sebagai data lab kamu",
      "Backtest strategi momentum di 200 emiten watchlist (data EOD sudah tersedia!)",
      "Paper trading 3 bulan: jalankan sinyal, catat, evaluasi TANPA uang riil",
      "Baru kemudian pertimbangkan eksekusi semi-otomatis (masih manual-confirm)",
    ],
    resources: [
      ["yfinance docs (data tambahan)", "https://ranaroussi.github.io/yfinance/"],
      ["Kaggle: Jane Street / Optiver competitions (belajar dari solusi orang)", "https://www.kaggle.com/competitions"],
    ],
  },
];

export const metadata = {
  title: "Belajar Quant — Market Labs",
};

export default function LearnPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Roadmap Belajar <span className="gradient-text">Quant</span>
        </h1>
        <p className="text-muted mt-0.5 text-sm">
          Jalur realistis dari nol sampai bisa meneliti strategi sendiri — 6 bulan
          part-time. Dirancang khusus mengacu ke project IDX yang sudah kamu punya.
        </p>
      </div>

      <div className="card p-4 text-sm leading-relaxed">
        <span className="font-semibold">Kenapa roadmap ini beda? </span>
        <span className="text-muted">
          Karena kamu sudah punya infrastruktur data: scraper jalan, database
          Postgres terisi EOD 963 emiten + intraday, dan dashboard analitik.
          Kebanyakan pemula belajar quant tanpa data — kamu kebalikannya:{" "}
          <span className="text-[var(--fg)] font-medium">
            bangun strategi di atas data yang sudah kamu pahami.
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {STAGES.map((s) => (
          <Card key={s.n}>
            <div className="flex items-start gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                style={{ background: `${s.color}22`, color: s.color }}
              >
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="text-base font-bold">{s.title}</h2>
                  <span className="text-muted text-xs">{s.weeks}</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span aria-hidden className="text-muted">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.resources.map(([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip"
                    >
                      {label} ↗
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Prinsip yang menyelamatkan akun kamu">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-semibold text-up">1.</span> Backtest bagus ≠ akan
            profit — pasar berubah (regime change). Selalu tanya “kenapa strategi
            ini secara logika bekerja?”
          </li>
          <li>
            <span className="font-semibold text-up">2.</span> Overfitting itu
            default, bukan kecelakaan. Semakin banyak parameter, semakin curiga.
          </li>
          <li>
            <span className="font-semibold text-up">3.</span> Biaya transaksi &
            slippage mematikan strategi frekuensi tinggi. Selalu masukkan ke
            backtest.
          </li>
          <li>
            <span className="font-semibold text-up">4.</span> Risk per posisi 1–2%
            — bukan karena takut, tapi karena matematika geometri dari drawdown.
          </li>
        </ul>
      </Card>

      <p className="text-muted text-center text-xs">
        Semua di halaman ini adalah materi edukasi, bukan nasihat keuangan.{" "}
        <Link href="/" className="hover:underline">
          Kembali ke dashboard
        </Link>
      </p>
    </main>
  );
}
