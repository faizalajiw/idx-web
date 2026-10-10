# Screener (`/screener`)

## 1. Ringkasan Fungsi
Mesin penyaring saham se-pasar berdasarkan kombinasi filter (momentum, RSI, volume, foreign, skor broker, order-book). Menjawab "saham mana yang cocok dengan kriteria saya hari ini". Pengguna: trader/analis yang mencari kandidat. Dipakai untuk riset kandidat sebelum masuk ke Rekomendasi/Ruang Keputusan.

## 2. Route & Berkas
- URL: `/screener` → [`app/screener/page.tsx`](../../idx-web/app/screener/page.tsx)
- Komponen: [Card](../../idx-web/components/Card.tsx), [RegimeBanner](../../idx-web/components/RegimeBanner.tsx), [TickerLogo](../../idx-web/components/TickerLogo.tsx), [States](../../idx-web/components/States.tsx)
- Hooks: `useScreener`, `useBrokerActivity` ([hooks.ts:216](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card

### Preset & Panel Filter
| Field | Isi |
|---|---|
| Nama card | Filter + preset (Momentum + Foreign In, Breakout Volume, Oversold Sehat, Trend Up Tenang, Akumulasi Broker) |
| Komponen | `PRESETS`/panel filter di [screener/page.tsx:33](../../idx-web/app/screener/page.tsx) |
| Fungsi | Menyusun parameter filter; preset mengisi beberapa filter sekaligus |
| Sumber data | Klien-only (state); dikirim sebagai query ke `GET /api/screener` |
| Rumus/Logika | Preset = kombinasi nilai filter (`min_momentum`, `foreign_in_only`, `min_vol_ratio`, `rsi_max`, `signal`, `min_broker_score`, `min_value`, `min_days`) |
| Periode/Window | `min_days` = syarat panjang data (default 30 sesi) |
| Interaksi | Klik preset / ubah filter → refetch |
| Empty/Loading/Error | — |

### Tabel Hasil Screener
| Field | Isi |
|---|---|
| Nama card | Hasil (kolom: Close, RSI, Momentum 20d, Vol Ratio, ATR%, Jarak 52w, Hari sejak sinyal, Skor broker, OB imbalance, Absorption, Foreign net, Value) |
| Komponen | `COLUMNS`/`SortKey` di [screener/page.tsx:84](../../idx-web/app/screener/page.tsx) |
| Fungsi | Daftar emiten lolos filter + metrik pendukung; sortable & kolom bisa disembunyikan |
| Sumber data | `GET /api/screener` ([app.py:527](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_screener` ([analytics.py:1561](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.latest_pit`, `research.orderbook` (1744–1755) |
| Rumus/Logika | Momentum 20d = % perubahan 20 sesi; RSI(14); Vol ratio = volume÷rata-rata 20 sesi; ATR% = ATR(14)/close; Jarak 52w = posisi vs puncak 52 pekan; OB imbalance/absorption dari `research.orderbook`; Skor broker dari `research.factor_ic_history` (bobot lulus IC) |
| Periode/Window | 20 sesi (momentum/volume), 14 (RSI/ATR), 52 pekan (jarak), lookback broker 60 hari |
| Interaksi | Klik header → sort; toggle kolom; klik emiten → detail |
| Empty/Loading/Error | Empty state bila tidak ada yang lolos; pesan khusus bila skor broker belum ada (butuh run `idx ic`) |

### Faktor (Legenda Skor)
| Field | Isi |
|---|---|
| Nama card | Faktor (daftar definisi tiap kolom) |
| Komponen | `FACTORS` di [screener/page.tsx:65](../../idx-web/app/screener/page.tsx) |
| Fungsi | Menjelaskan arti & cara baca tiap kolom |
| Sumber data | Statis (teks) |
| Rumus/Logika | Definisi tiap faktor |
| Periode/Window | — |
| Interaksi | — |
| Empty/Loading/Error | — |

## 4. Data Flow (end-to-end)
```
IDX EOD → ingest → Postgres (prices_pit, stock_summary_daily/foreign, orderbook capture)
   → analytics.get_screener (hitung indikator + join orderbook + skor broker)
   → GET /api/screener → SWR useScreener → tabel hasil + sort/filter
   (skor broker butuh research.factor_ic_history dari run `idx ic`)
```

## 5. Cara Pengambilan / Update Data
- **Perhitungan**: on-demand saat request (filter diterapkan di backend lalu di klien).
- **Job/scheduler**: tidak ada job khusus screener; bergantung pada job refresh EOD (`refresh_s2` 16:05 WIB, dll) yang mengisi `prices_pit` dan capture order-book saat jam bursa.
- **Refresh UI**: SWR (hook screener) 30 detik.
- **Idempotensi**: sumber data bitemporal (`prices_pit`) → hasil deterministik per as-of.
- **Fallback**: order-book kosong → kolom OB kosong; skor broker kosong sampai run IC ada.

## 6. Dependensi & Relasi Menu
- Bergantung pada job EOD (prices) + capture order-book saat jam bursa.
- Menyuplai kandidat ke [Rekomendasi Beli](rekomendasi.md) dan [Ruang Keputusan](ruang-keputusan.md); skor broker berasal dari [Faktor & Kalibrasi](faktor.md).

## 7. Catatan Batasan & Edge Case
- Filter `min_broker_score` menyaring semua bila kolom skor broker kosong (belum ada run `idx ic`).
- Butuh history minimal (`min_days`) sebelum indikator valid.
- Klasifikasi sektor/universe mengikuti mapping kurasi internal.
