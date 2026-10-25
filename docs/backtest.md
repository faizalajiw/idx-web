# Backtest (`/backtest`)

## 1. Ringkasan Fungsi
Simulasi strategi di atas data historis untuk menguji apakah sebuah aturan entry/exit layak dipakai. Menjawab: "kalau aturan ini dijalankan sejak tanggal X dengan biaya nyata, hasilnya bagaimana dibanding beli-dan-tahan?" Pengguna: analis dan PM yang menguji ide sebelum dipakai. Halaman ini **hanya menghitung on-demand**; tidak ada hasil yang disimpan.

## 2. Route & Berkas
- URL: `/backtest` → [`routes/backtest/+page.svelte`](../web/src/routes/backtest/+page.svelte)
- Hook: `useBacktestConfig()` ([hooks.svelte.ts](../web/src/lib/hooks.svelte.ts), refresh 300 detik) dan `runBacktest` ([api.ts](../web/src/lib/api.ts))
- Backend: [simulation.py](../../idx-scraper/src/idx_scraper/api/simulation.py), endpoint [app.py:893](../../idx-scraper/src/idx_scraper/api/app.py) (config) dan [app.py:899](../../idx-scraper/src/idx_scraper/api/app.py) (run, POST)

## 3. Layout Halaman

Halaman dibagi dua kolom. Kolom kiri untuk menyusun uji, kolom kanan untuk membaca hasil.

### Kolom Kiri: Susun Uji
| Bagian | Isi |
|---|---|
| 1. Pilih Strategi | Kartu pilihan (radio). Tiga strategi: `ma_cross`, `momentum_top`, `rsi_oversold`, masing-masing dengan parameter dari `ParamSpec` |
| Parameter | Form sesuai strategi terpilih |
| Emiten | Textarea kode saham, tombol "Pakai watchlist" |
| Periode | Chip periode (Semua, 1 Tahun, dan seterusnya). `Semua` mengirim `periodStart` kosong |
| Pengaturan lanjutan | Dapat dilipat. Rebalance, modal awal, dan preset/field biaya |
| Tombol "Jalankan Backtest" | Sticky di bagian bawah kolom. Memanggil `POST /api/backtest/run` |

Sumber config: `GET /api/backtest/config` ([app.py:893](../../idx-scraper/src/idx_scraper/api/app.py)) → `simulation.get_config()` ([simulation.py:296](../../idx-scraper/src/idx_scraper/api/simulation.py)). Skeleton tampil sampai config dimuat.

Logika strategi: `ma_cross` = sinyal dari persilangan rata-rata bergerak; `momentum_top` = peringkat return terkuat; `rsi_oversold` = entry saat RSI di bawah ambang. Daftar: `STRATEGIES` ([simulation.py:234](../../idx-scraper/src/idx_scraper/api/simulation.py)).

### Kolom Kanan: Hasil
1. **Kartu verdict**: kesimpulan singkat dalam bahasa sederhana. Menyebut return neto, perbandingan dengan buy & hold, dan porsi biaya yang memotong hasil kotor (`pctMag`, tanpa tanda plus).
2. **Tab navigasi** (`role="tablist"`, lima tab):

| Tab | Isi | Sumber data |
|---|---|---|
| Ringkasan | Empat kartu `Stat`: total return neto, alpha vs buy & hold, max drawdown, Sharpe | `metrics`, `benchmark` |
| Kurva Modal | Grafik pertumbuhan modal strategi vs benchmark (`EquityCurveChart` di atas `LineArea`) | `equity_curve` |
| Perbandingan | Metrik kotor (sebelum biaya) vs neto (sesudah biaya) vs benchmark | `gross_metrics`, `metrics`, `benchmark` |
| Biaya | Total biaya, komisi + pajak, slippage, porsi biaya dari modal, dan erosi return | `cost_impact`, `costs` |
| Jejak Transaksi | Ledger setiap transaksi per tanggal rebalance (beli/jual, jumlah, harga) | `ledger` |

Hanya satu panel tab yang di-mount pada satu waktu.

3. **Istilah singkat**: glosarium di bagian bawah halaman untuk istilah seperti alpha, drawdown, Sharpe, dan slippage.

Sumber run: `POST /api/backtest/run` ([app.py:899](../../idx-scraper/src/idx_scraper/api/app.py)) → `simulation.run_backtest` ([simulation.py:546](../../idx-scraper/src/idx_scraper/api/simulation.py)).

## 4. Data Flow (end-to-end)
```
Postgres (prices/OHLCV, stock_daily, index_quotes)
  → simulation.run_backtest (point-in-time, biaya, rebalance)
  → POST /api/backtest/run (compute-only, tanpa cache)
  → api.ts runBacktest → state lokal halaman
  → Kartu verdict + tab (Ringkasan, Kurva Modal, Perbandingan, Biaya, Jejak Transaksi)
```
Config: `GET /api/backtest/config` → `useBacktestConfig` (auto-refresh 300 detik) → form.

## 5. Cara Pengambilan / Update Data
- **On-demand**: setiap run menghitung ulang dari data harga tersimpan. Hasil tidak disimpan ke DB.
- **Job terjadwal**: tidak ada. Backtest tidak ikut pipeline refresh.
- **Refresh UI**: hasil tidak auto-refresh; pengguna menekan jalankan.
- **Idempotensi**: input sama + data harga sama → hasil sama (deterministik).
- **Fallback**: bila data harga kurang untuk rentang, backend mengembalikan error; UI menampilkan pesan.
- **Update data harga**: mengikuti pipeline EOD (lihat [README](README.md)); backtest hanya membaca.

## 6. Dependensi & Relasi Menu
- Bergantung pada data harga dari pipeline EOD (menu [Dashboard](dashboard.md), [Pantau](pantau.md)).
- Definisi faktor di strategi tidak terkait langsung dengan bobot [Faktor & Kalibrasi](faktor.md); keduanya terpisah.

## 7. Catatan Batasan & Edge Case
- Maksimum 60 emiten dan 756 hari per run (`MAX_CODES`, `MAX_DAYS`).
- Benchmark selalu equal-weighted buy & hold dari emiten yang sama.
- Biaya default (komisi 0,15%, pajak jual 0,1%, slippage 0,1%, partisipasi maks 2% ADV) adalah asumsi; ubah di Pengaturan lanjutan bila kondisi berbeda. Nilai di `DEFAULT_COSTS` (simulation.py:56).
- Di tab Biaya, nilai erosi ditampilkan sebagai besaran tanpa tanda, karena selalu mengurangi hasil.
- Hasil lampau bukan jaminan. Metrik dengan sampel kecil mudah bias.
- Pastikan run sesuai data terbaru: jalankan backend dari `idx-scraper` dengan `.\.venv\Scripts\python.exe -m uvicorn idx_scraper.api.app:app --port 8000`.
- [BELUM TERVERIFIKASI] Rumus Sharpe dan drawdown di baris kode; cek `simulation.py` sebelum dikutip angkanya.