# Sektor (`/sectors`)

## 1. Ringkasan Fungsi
Membandingkan performa antar sektor (perbankan, energi, konsumer, dan lain-lain) untuk melihat sektor mana yang sedang kuat dan ke mana rotasi dana bergerak. Pengguna: analis dan trader sektor. Sering lebih berguna daripada memilih satu saham.

## 2. Route & Berkas
- URL: `/sectors` → [`app/sectors/page.tsx`](../../idx-web/app/sectors/page.tsx)
- Komponen: `RegimeBanner` ([components/RegimeBanner.tsx](../../idx-web/components/RegimeBanner.tsx)), `SectorRotationTable` ([components/SectorRotationTable.tsx](../../idx-web/components/SectorRotationTable.tsx)), `Card`, `LastUpdated`
- Hook: `useSectors()` ([hooks.ts:191](../../idx-web/lib/hooks.ts), refresh 30 detik); `useSectorRotation(60, 3)` ([hooks.ts:366](../../idx-web/lib/hooks.ts), 300 detik) [BELUM TERVERIFIKASI baris hook]
- Backend: `GET /api/sectors` ([app.py:507](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_sector_analysis` ([analytics.py:1266](../../idx-scraper/src/idx_scraper/api/analytics.py)); `GET /api/sectors/rotation?lookback=60&min_names=3` ([app.py:493](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_sector_rotation` ([analytics.py:2478](../../idx-scraper/src/idx_scraper/api/analytics.py)); pemetaan sektor [api/sector_map.py](../../idx-scraper/src/idx_scraper/api/sector_map.py)

## 3. Penjelasan Per-Card / Per-Panel

### Regime IHSG (RegimeBanner)
| Field | Isi |
|---|---|
| Nama card | Banner Regime |
| Komponen | [RegimeBanner.tsx](../../idx-web/components/RegimeBanner.tsx) (baris 62 untuk volatilitas) |
| Fungsi | Konteks tren pasar sebelum membaca sektor |
| Sumber data | `GET /api/market/regime` ([app.py:197](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_market_regime` ([analytics.py:62](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | ADX(14) + DI pada IHSG; volatilitas = realized vol 20 hari, dianualisasi (~240 sesi) |
| Periode/Window | 20 hari (volatilitas) |
| Interaksi | — |
| Empty/Loading/Error | Placeholder |

### Rotasi Sektor (SectorRotationTable)
| Field | Isi |
|---|---|
| Nama card | Rotasi Sektor |
| Komponen | [SectorRotationTable.tsx](../../idx-web/components/SectorRotationTable.tsx) |
| Fungsi | Perubahan performa sektor dan pergeseran urutan (rotasi) |
| Sumber data | `GET /api/sectors/rotation` → `get_sector_rotation` ([analytics.py:2478](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache `sector_rotation:{lookback}:{min_names}` |
| Rumus/Logika | Return sektor periode `lookback` (60 sesi); sektor dengan minimal 3 emiten (`min_names`) |
| Periode/Window | Lookback 60 sesi |
| Interaksi | — [BELUM TERVERIFIKASI interaksi klik] |
| Empty/Loading/Error | Pesan bila jumlah emiten per sektor kurang |

### Peta Sektor
| Field | Isi |
|---|---|
| Nama card | Peta Sektor |
| Komponen | [sectors/page.tsx](../../idx-web/app/sectors/page.tsx) baris 41 (subtitle "Diurutkan dari sektor terkuat") |
| Fungsi | Tabel per sektor: Rata-rata %, Breadth, Value, Foreign Net, Top Stock; warna sel (`heatColor`) |
| Sumber data | `GET /api/sectors` → `get_sector_analysis` ([analytics.py:1266](../../idx-scraper/src/idx_scraper/api/analytics.py)) via `useSectors` |
| Rumus/Logika | Rata-rata % perubahan harga emiten per sektor; breadth = porsi emiten naik; value = total nilai transaksi; foreign net = jumlah net asing sektor; top stock = kontributor terbesar |
| Periode/Window | Sesi terakhir (`date` opsional di backend) |
| Interaksi | Warna heat-map; sort menurut rata-rata |
| Empty/Loading/Error | `EmptyState`, `ErrorState` "Gagal memuat sektor", `Skeleton` |

## 4. Data Flow (end-to-end)
```
Harga & volume EOD (stock_quotes/stock_daily, latest_pit) + foreign_net
  → sector_map (kode → sektor) → analytics.get_sector_analysis / get_sector_rotation
  → GET /api/sectors, /api/sectors/rotation → SWR (30 s / 300 s) → RegimeBanner + tabel + kartu
```

## 5. Cara Pengambilan / Update Data
- **On-demand** dengan cache in-process; data sumber dari pipeline EOD (`refresh_s2` 16:05, `refresh_s2_late` 16:20 WIB).
- **Refresh UI**: SWR 30 detik (peta) dan 300 detik (rotasi).
- **Reset cache**: `POST /api/cache/clear`.
- **Idempotensi**: deterministik dari data tersimpan.
- **Fallback**: sektor dengan emiten di bawah `min_names` tidak ditampilkan di rotasi.

## 6. Dependensi & Relasi Menu
- Konteks regime dari [Dashboard](dashboard.md).
- Foreign net per sektor berasal dari [Foreign Flow](foreign-flow.md).
- Emiten top sektor dapat dibuka ke [Halaman Detail Emiten](halaman-detail.md).

## 7. Catatan Batasan & Edge Case
- Pemetaan sektor bergantung pada `sector_map.py`; emiten tanpa pemetaan tidak masuk.
- Data EOD: sektor tidak berubah intraday.
- Sektor dengan emiten sedikit tidak stabil; gunakan `min_names`.
- [BELUM TERVERIFIKASI] Kolom persis `get_sector_analysis` dan logika breadth; cek analytics.py:1266.
