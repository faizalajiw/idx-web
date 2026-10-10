# Backtest (`/backtest`)

## 1. Ringkasan Fungsi
Simulasi strategi di atas data historis untuk menguji apakah sebuah aturan entry/exit layak dipakai. Menjawab: "kalau aturan ini dijalankan sejak tanggal X dengan biaya nyata, hasilnya bagaimana dibanding beli-dan-tahan?" Pengguna: analis dan PM yang menguji ide sebelum dipakai. Halaman ini **hanya menghitung on-demand**; tidak ada hasil yang disimpan.

## 2. Route & Berkas
- URL: `/backtest` → [`app/backtest/page.tsx`](../../idx-web/app/backtest/page.tsx)
- Hook: `useBacktestConfig()` ([hooks.ts:410](../../idx-web/lib/hooks.ts), refresh 300 detik) dan `runBacktest` ([api.ts:118](../../idx-web/lib/api.ts))
- Backend: [simulation.py](../../idx-scraper/src/idx_scraper/api/simulation.py), endpoint [app.py:693](../../idx-scraper/src/idx_scraper/api/app.py) (config) dan [app.py:699](../../idx-scraper/src/idx_scraper/api/app.py) (run, POST)

## 3. Penjelasan Per-Card / Per-Panel

### Form Konfigurasi (strategi, parameter, biaya, rebalance)
| Field | Isi |
|---|---|
| Nama card | Konfigurasi Backtest |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) |
| Fungsi | Pilih strategi, parameter, rentang tanggal, daftar emiten, biaya, dan frekuensi rebalance |
| Sumber data | `GET /api/backtest/config` ([app.py:693](../../idx-scraper/src/idx_scraper/api/app.py)) → `simulation.get_config()` ([simulation.py:296](../../idx-scraper/src/idx_scraper/api/simulation.py)) |
| Rumus/Logika | Nilai default dan batas diambil dari konstanta: `DEFAULT_COSTS` (simulation.py:56), `COST_LIMITS`, `REBALANCE_OPTIONS` (daily/weekly/monthly, default `weekly`), `MAX_CODES=60`, `MAX_DAYS=756` |
| Periode/Window | Rentang tanggal dipilih pengguna, maksimum 756 hari |
| Interaksi | Ubah parameter → tombol jalankan → `POST /api/backtest/run` |
| Empty/Loading/Error | Skeleton saat config dimuat; pesan error bila gagal |

### Strategi yang Tersedia
| Field | Isi |
|---|---|
| Nama card | Pilihan Strategi |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) |
| Fungsi | Tiga strategi: `ma_cross`, `momentum_top`, `rsi_oversold`, masing-masing dengan `ParamSpec` sendiri |
| Sumber data | `STRATEGIES` ([simulation.py:234](../../idx-scraper/src/idx_scraper/api/simulation.py)) |
| Rumus/Logika | `ma_cross`: sinyal dari persilangan rata-rata bergerak; `momentum_top`: peringkat return terkuat; `rsi_oversold`: entry saat RSI di bawah ambang. Detail parameter ada di `ParamSpec` |
| Periode/Window | Dikendalikan parameter setiap strategi |
| Interaksi | Pilih strategi → form parameter berubah |
| Empty/Loading/Error | Tidak relevan (daftar statis dari backend) |

### Hasil (Hasil)
| Field | Isi |
|---|---|
| Nama card | Hasil |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 514 |
| Fungsi | Empat angka utama: total return neto, Alpha vs buy & hold, Max drawdown, Sharpe |
| Sumber data | `POST /api/backtest/run` ([app.py:699](../../idx-scraper/src/idx_scraper/api/app.py)) → `simulation.run_backtest` ([simulation.py:546](../../idx-scraper/src/idx_scraper/api/simulation.py)) |
| Rumus/Logika | Return dari equity curve neto biaya. Sharpe memakai `TRADING_DAYS_PER_YEAR=252` ([simulation.py](../../idx-scraper/src/idx_scraper/api/simulation.py)). Alpha = return strategi − return benchmark |
| Periode/Window | Rentang tanggal backtest |
| Interaksi | Tidak ada drill-down |
| Empty/Loading/Error | Muncul setelah run selesai; error ditampilkan bila backend gagal |

### Equity Curve
| Field | Isi |
|---|---|
| Nama card | Equity Curve |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 537 (Recharts) |
| Fungsi | Pertumbuhan nilai portofolio strategi vs benchmark dari waktu ke waktu |
| Sumber data | Field `equity_curve` pada respons `run_backtest` |
| Rumus/Logika | Nilai portofolio harian setelah biaya |
| Periode/Window | Seluruh rentang backtest |
| Interaksi | Hover untuk nilai per tanggal |
| Empty/Loading/Error | Tidak tampil bila belum ada run |

### Perbandingan Metrik
| Field | Isi |
|---|---|
| Nama card | Perbandingan Metrik |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 549 |
| Fungsi | Metrik kotor (`gross_metrics`) vs neto (`metrics`) dan benchmark (`benchmark`) |
| Sumber data | `run_backtest` → `metrics`, `gross_metrics`, `benchmark` |
| Rumus/Logika | Gross = sebelum biaya; neto = sesudah biaya; benchmark = equal-weighted buy & hold |
| Periode/Window | Seluruh rentang backtest |
| Interaksi | — |
| Empty/Loading/Error | Tidak tampil bila belum ada run |

### Dampak Biaya
| Field | Isi |
|---|---|
| Nama card | Dampak Biaya |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 561 |
| Fungsi | Total biaya, komisi+pajak, slippage, dan cost drag |
| Sumber data | `run_backtest` → `costs`, `cost_impact` |
| Rumus/Logika | Komisi `commission_pct` 0,15%; pajak jual `sell_tax_pct` 0,1%; slippage `slippage_pct` 0,1%; partisipasi dibatasi `max_adv_pct` 2% dari ADV (`DEFAULT_COSTS`, simulation.py:56) |
| Periode/Window | Seluruh rentang backtest |
| Interaksi | — |
| Empty/Loading/Error | Tidak tampil bila belum ada run |

### Ledger Rebalance
| Field | Isi |
|---|---|
| Nama card | Ledger Rebalance |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 599 |
| Fungsi | Catatan setiap transaksi per tanggal rebalance (beli/jual, jumlah, harga) |
| Sumber data | Field `ledger` pada `run_backtest` |
| Rumus/Logika | Dihasilkan saat rebalance sesuai frekuensi (daily/weekly/monthly) |
| Periode/Window | Per tanggal rebalance |
| Interaksi | Scroll tabel |
| Empty/Loading/Error | Kosong bila strategi tidak memicu transaksi |

### Cara Membaca Hasil
| Field | Isi |
|---|---|
| Nama card | Cara membaca hasil |
| Komponen | [backtest/page.tsx](../../idx-web/app/backtest/page.tsx) ~baris 616 |
| Fungsi | Panduan interpretasi. Memuat catatan point-in-time: sinyal hanya memakai data yang sudah tersedia pada tanggal keputusan |
| Sumber data | Teks statis |
| Rumus/Logika | — |
| Periode/Window | — |
| Interaksi | — |
| Empty/Loading/Error | — |

## 4. Data Flow (end-to-end)
```
Postgres (prices/OHLCV, stock_daily, index_quotes) 
  → simulation.run_backtest (point-in-time, biaya, rebalance)
  → POST /api/backtest/run (compute-only, tanpa cache)
  → api.ts runBacktest → state lokal halaman
  → Recharts (equity curve) + tabel (metrik, biaya, ledger)
```
Config: `GET /api/backtest/config` → `useBacktestConfig` (SWR 300 detik) → form.

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
- Biaya default adalah asumsi; ubah di form bila kondisi berbeda.
- Hasil lampau bukan jaminan. Metrik dengan sampel kecil mudah bias.
- [BELUM TERVERIFIKASI] Nilai pasti parameter `ParamSpec` per strategi dan rumus Sharpe/drawdown di baris kode; cek `simulation.py` sebelum dikutip angka.
