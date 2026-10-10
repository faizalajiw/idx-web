# Pantau (`/pantau`)

## 1. Ringkasan Fungsi
Pusat watchlist + notifikasi. Menjawab "saham apa yang saya pantau, dan kabari saya kalau ada apa-apa". Pengguna: trader/analis yang memantau emiten pilihan. Dipakai harian untuk kelola watchlist, pasang batas, dan terima alert Telegram.

## 2. Route & Berkas
- URL: `/pantau` → [`app/pantau/page.tsx`](../../idx-web/app/pantau/page.tsx)
- Komponen: [WatchlistTable](../../idx-web/components/WatchlistTable.tsx), [TechnicalChart](../../idx-web/components/TechnicalChart.tsx), [SmartMoneyWatchCard](../../idx-web/components/SmartMoneyWatchCard.tsx), [AlertRules](../../idx-web/components/AlertRules.tsx), [TelegramStatus](../../idx-web/components/TelegramStatus.tsx)
- Hooks: `useWatchlist`, `useSignals`, `useTechnical`, `useSmartMoneyWatchlist`, `useAlerts`, `useAddToWatchlist`, `useRemoveFromWatchlist`, `useCreateAlert`, `useDeleteAlert` ([hooks.ts](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card

### Watchlist & Tabel Emiten
| Field | Isi |
|---|---|
| Nama card | Watchlist (tabel, klik baris → pilih emiten) |
| Komponen | [WatchlistTable.tsx](../../idx-web/components/WatchlistTable.tsx) |
| Fungsi | Daftar emiten pantauan + harga/perubahan; baris terpilih menggerakkan chart di bawah |
| Sumber data | `GET /api/watchlist` ([app.py:244](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_watchlist` ([services.py:334](../../idx-scraper/src/idx_scraper/api/services.py)); tambah `POST /api/watchlist` (249), ubah `PUT /api/watchlist` (260), hapus `DELETE /api/watchlist` (274) |
| Rumus/Logika | Gabungan snapshot harga (`stock_quotes`) per kode watchlist |
| Periode/Window | Sesi terbaru; refresh SWR 30 detik |
| Interaksi | Klik baris → `onSelect` → chart; tombol tambah/hapus emiten |
| Empty/Loading/Error | Empty state bila watchlist kosong |

### Chart Teknikal Emiten Terpilih
| Field | Isi |
|---|---|
| Nama card | Grafik teknikal (mengikuti emiten terpilih) |
| Komponen | [TechnicalChart.tsx](../../idx-web/components/TechnicalChart.tsx) |
| Fungsi | Candlestick + overlay indikator (SMA/RSI/MACD per mode) |
| Sumber data | `GET /api/stocks/{code}/technical` ([app.py:325](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_technical_chart` ([services.py:1098](../../idx-scraper/src/idx_scraper/api/services.py)); OHLC via `GET /api/stocks/{code}/history` (314) → `services.get_price_history` ([services.py:715](../../idx-scraper/src/idx_scraper/api/services.py)) |
| Rumus/Logika | Indikator dihitung di `services` dari frame OHLC (`prices_adjusted`) |
| Periode/Window | 120 sesi (default history); refresh 30 detik |
| Interaksi | Ganti emiten lewat tabel; hover tooltip |
| Empty/Loading/Error | Placeholder bila belum ada emiten terpilih |

### Kartu Smart Money Watchlist
| Field | Isi |
|---|---|
| Nama card | Verdict Smart Money (verdicts board) |
| Komponen | [SmartMoneyWatchCard.tsx](../../idx-web/components/SmartMoneyWatchCard.tsx) |
| Fungsi | Ringkasan verdict akumulasi/distribusi untuk emiten yang dipantau |
| Sumber data | `GET /api/smart-money/verdicts` ([app.py:478](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_smart_money_verdicts` ([analytics.py:924](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.latest_pit` |
| Rumus/Logika | Verdict dari net asing + pola aliran terbaru |
| Periode/Window | Jendela aliran terbaru (5 sesi default) |
| Interaksi | Tautan ke detail emiten |
| Empty/Loading/Error | Empty bila belum ada verdict |

### Aturan Alert
| Field | Isi |
|---|---|
| Nama card | Aturan Notifikasi |
| Komponen | [AlertRules.tsx](../../idx-web/components/AlertRules.tsx) |
| Fungsi | Bangun/kelola aturan harga/RSI/volume; notifikasi sekali per persilangan |
| Sumber data | `GET /api/alerts` ([app.py:650](../../idx-scraper/src/idx_scraper/api/app.py)); `POST /api/alerts` (656); `DELETE /api/alerts/{rule_id}` (666); `POST /api/alerts/test` (674) |
| Rumus/Logika | Dievaluasi tiap kali data EOD baru masuk; state "tersimpan aman" mencegah spam |
| Periode/Window | Evaluasi per data EOD masuk |
| Interaksi | Form tambah aturan, hapus, uji kirim |
| Empty/Loading/Error | Pesan bila Telegram belum dikonfigurasi |

### Status Telegram
| Field | Isi |
|---|---|
| Nama card | Status Notifikasi Telegram |
| Komponen | [TelegramStatus.tsx](../../idx-web/components/TelegramStatus.tsx) |
| Fungsi | Kesiapan saluran notifikasi (configured/aktif) |
| Sumber data | `GET /api/health` ([app.py:174](../../idx-scraper/src/idx_scraper/api/app.py)) / status alert |
| Rumus/Logika | Cek konfigurasi bot Telegram (nama variabel env saja) |
| Periode/Window | Real-time |
| Interaksi | — |
| Empty/Loading/Error | Peringatan bila token/chat belum diset |

## 4. Data Flow (end-to-end)
```
IDX (EOD / intraday) → cf_transport / ingest → Postgres (stock_quotes, prices_pit)
   → alert job (interval 300s, cli cmd_serve) evaluasi aturan → Telegram
   → API /api/watchlist + /api/alerts → SWR (useWatchlist 30s, useAlerts 30s)
   → WatchlistTable / AlertRules / TelegramStatus
```

## 5. Cara Pengambilan / Update Data
- **Watchlist & chart**: on-demand saat request; snapshot harga dari sesi terbaru.
- **Alert**: job `alerts` interval 300 detik di `cmd_serve` ([cli.py:1037](../../idx-scraper/src/idx_scraper/cli.py)), hanya Telegram.
- **Refresh UI**: SWR 30 detik (watchlist, signals, technical, alerts).
- **Idempotensi**: evaluasi aturan sekali per persilangan (state per aturan).
- **Fallback**: bila sumber resmi gagal, ingest memakai fallback Yahoo Finance (lihat README indeks).

## 6. Dependensi & Relasi Menu
- Bergantung pada snapshot `stock_quotes` (dari job refresh EOD) dan `prices_adjusted`.
- Menyediakan emiten terpilih ke [Jejak Sinyal](jejak-sinyal.md), [Ruang Keputusan](ruang-keputusan.md), dan halaman detail `/stock/[code]`.

## 7. Catatan Batasan & Edge Case
- Alert hanya bunyi setelah data EOD baru masuk; di luar jam bursa tidak ada evaluasi baru.
- Emiten baru perlu data OHLC minimal sebelum indikator bisa dihitung.
- Kolom skor broker/smart-money hanya muncul bila run IC tersedia.
