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
| Nama card | Tab strategi (Momentum + Foreign In, Lonjakan Volume, Oversold Sehat, Trend Up Tenang, Akumulasi Broker) |
| Komponen | `PRESETS` dan tab bar di [screener/page.tsx](../../idx-web/app/screener/page.tsx) |
| Fungsi | Memilih satu strategi; setiap tab mengisi beberapa filter sekaligus |
| Sumber data | Klien-only (state); dikirim sebagai query ke `GET /api/screener` |
| Rumus/Logika | Preset = kombinasi nilai filter (`min_momentum`, `foreign_in_only`, `min_vol_ratio`, `rsi_max`, `signal`, `min_broker_score`, `min_value`, `min_days`) |
| Periode/Window | `min_days` = syarat panjang data (default 30 sesi) |
| Interaksi | Tab `role="tablist"` dengan roving tabindex. Navigasi keyboard: ←/→ pindah tab, Home/End ke ujung. Klik tab → URL ter-update dan hasil dimuat. Deskripsi singkat di tooltip (`title`) |
| Guide card | `role="tabpanel"`, hanya tampil setelah strategi dipilih. Berisi **Untuk apa?**, **Kriteria** (chip syarat), **Cara baca** |
| Empty/Loading/Error | **Default (belum pilih)**: panel panduan dengan 5 kartu strategi, tanpa fetch ke API. Setelah pilih: skeleton saat load pertama (`ScreenerShellSkeleton`, fallback Suspense) |

### Status Default (Belum Pilih Strategi)
- Saat membuka `/screener` tanpa query, tidak ada tab yang aktif (`active = -1`) dan tidak ada request `GET /api/screener`.
- Panel panduan menampilkan 5 kartu strategi yang bisa diklik untuk memulai.
- Panel FACTORS, peringatan skor broker, dan tabel hasil hanya tampil setelah strategi dipilih.
- Hook `useScreener` menerima `null`; SWR key bernilai null sehingga fetch dilewati.
- Deep link dengan query preset (mis. `/screener?min_momentum=0&min_vol_ratio=2&min_days=30`) langsung memilih tab yang cocok dan memuat hasil.

### Tabel Hasil Screener
| Field | Isi |
|---|---|
| Nama card | Hasil (kolom: Close, RSI, Momentum 20d, Vol Ratio, ATR%, Jarak 52w, Hari sejak sinyal, Skor broker, OB imbalance, Absorption, Foreign net, Value) |
| Komponen | `COLUMNS`/`SortKey` di [screener/page.tsx:84](../../idx-web/app/screener/page.tsx) |
| Fungsi | Daftar emiten lolos filter + metrik pendukung; sortable & kolom bisa disembunyikan |
| Sumber data | `GET /api/screener` ([app.py:527](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_screener` ([analytics.py:1561](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.latest_pit`, `research.orderbook` (1744–1755) |
| Rumus/Logika | Momentum 20d = % perubahan 20 sesi; RSI(14); Vol ratio = volume÷rata-rata 20 sesi; ATR% = ATR(14)/close; Jarak 52w = posisi vs puncak 52 pekan; OB imbalance/absorption dari `research.orderbook`; Skor broker dari `research.factor_ic_history` (bobot lulus IC) |
| Periode/Window | 20 sesi (momentum/volume), 14 (RSI/ATR), 52 pekan (jarak), lookback broker 60 hari |
| Interaksi | Klik header → sort; toggle kolom; klik emiten → detail. Hover kolom (`title`) menampilkan keterangan; Foreign Net: net beli (+) / jual (-) asing dalam Rp |
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

### Sinkronisasi Filter ↔ URL
Filter disimpan di query string (`/screener?min_momentum=5&foreign_in_only=true&...`) agar bisa di-share dan dipakai back/forward.
- **Sumber kebenaran**: URL. State `filters` di-hydrate dari URL (`filtersFromParams`).
- **Perbandingan**: `sameFilters` membandingkan hasil `screenerQuery(...)` (serialisasi kanonik), bukan perbandingan key-per-key. Ini menyamakan jalur URL→state dan state→URL.
- **Navigasi**: `router.replace` (bukan `push`), dan hanya bila query string benar-benar berbeda. Riwayat browser tidak penuh oleh entri duplikat.
- **Hasil uji** (Playwright): penulisan history turun dari ~22 dalam 3 detik menjadi 2; CLS turun dari ~1.6 menjadi ~0.13.
- **Aturan**: jangan menambah `lastSynced` ref atau perbandingan shallow baru. Jika menambah filter baru, tambahkan juga ke `filtersFromParams`, `screenerQuery`, dan `sameFilters` agar tetap konsisten.

## 4. Data Flow (end-to-end)
```
IDX EOD → ingest → Postgres (prices_pit, stock_summary_daily/foreign, orderbook capture)
   → analytics.get_screener (hitung indikator + join orderbook + skor broker)
   → GET /api/screener → SWR useScreener → tabel hasil + sort/filter
   (skor broker butuh research.factor_ic_history dari run `idx ic`)
```

## 5. Cara Pengambilan / Update Data
- **Perhitungan**: on-demand saat request (filter diterapkan di backend lalu di klien).
- **Job/scheduler**: tidak ada job khusus screener; bergantung pada job refresh EOD (`refresh_s2` 16:10 WIB, dll) yang mengisi `prices_pit` dan capture order-book saat jam bursa.
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
