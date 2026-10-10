# Radar Smart Money (`/radar` + `/radar/[code]`)

## 1. Ringkasan Fungsi
Mendeteksi emiten dengan aliran asing dominan: akumulasi (net buy asing terbesar) dan distribusi (net sell asing terbesar) dalam N sesi. Dilengkapi papan pola, track record, dan detail per emiten. Pengguna: trader dan analis yang mencari jejak "uang pintar" (asing sebagai proksi). Data EOD, bukan real-time.

## 2. Route & Berkas
- URL: `/radar` → [`app/radar/page.tsx`](../../idx-web/app/radar/page.tsx)
- URL detail: `/radar/[code]` → [`app/radar/[code]/page.tsx`](../../idx-web/app/radar/[code]/page.tsx)
- Komponen: `SmartMoneyBanner`, `SmartMoneyPatternsBoardCard`, `SmartMoneyTrackRecordCard` ([components/](../../idx-web/components/))
- Hook: `useSmartMoneyRadar(10)` ([hooks.ts:423](../../idx-web/lib/hooks.ts), 300 detik); `useStockSmartMoney(code)` ([hooks.ts:435](../../idx-web/lib/hooks.ts), 300 detik); `useSmartMoneyPatternsBoard` ([hooks.ts:458](../../idx-web/lib/hooks.ts), 1800 detik); `useSmartMoneyTrackRecord` ([hooks.ts:446](../../idx-web/lib/hooks.ts), 3600 detik)
- Backend: `GET /api/smart-money/radar` ([app.py:413](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_smart_money_radar` ([analytics.py:497](../../idx-scraper/src/idx_scraper/api/analytics.py)); `GET /api/stocks/{code}/smart-money` ([app.py:427](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_stock_smart_money` ([analytics.py:585](../../idx-scraper/src/idx_scraper/api/analytics.py)); `GET /api/smart-money/track-record` ([app.py:452](../../idx-scraper/src/idx_scraper/api/app.py)); `GET /api/smart-money/patterns` ([app.py:464](../../idx-scraper/src/idx_scraper/api/app.py)); `GET /api/smart-money/verdicts` ([app.py:478](../../idx-scraper/src/idx_scraper/api/app.py))

## 3. Penjelasan Per-Card / Per-Panel

### Akumulasi
| Field | Isi |
|---|---|
| Nama card | Akumulasi |
| Komponen | [radar/page.tsx](../../idx-web/app/radar/page.tsx) ~baris 150–205 |
| Fungsi | Daftar emiten dengan net buy asing terbesar |
| Sumber data | `GET /api/smart-money/radar?days=10` → `get_smart_money_radar` ([analytics.py:497](../../idx-scraper/src/idx_scraper/api/analytics.py)); sumber baris asing `latest_pit.foreign_net` / `foreign_flow` |
| Rumus/Logika | Urutkan net asing (rupiah = volume asing × close) menurun; ambil teratas |
| Periode/Window | 10 sesi (subtitle "N sesi") |
| Interaksi | Klik emiten → `/radar/[code]` |
| Empty/Loading/Error | Pesan kosong bila tidak ada aliran asing; skeleton saat memuat |

### Distribusi
| Field | Isi |
|---|---|
| Nama card | Distribusi |
| Komponen | [radar/page.tsx](../../idx-web/app/radar/page.tsx) ~baris 150–205 |
| Fungsi | Daftar emiten dengan net sell asing terbesar |
| Sumber data | Sama dengan Akumulasi |
| Rumus/Logika | Urutkan net asing menaik (paling negatif) |
| Periode/Window | 10 sesi |
| Interaksi | Klik emiten → `/radar/[code]` |
| Empty/Loading/Error | Sama dengan Akumulasi |

### Catatan Footer
| Field | Isi |
|---|---|
| Nama card | Catatan data (footer) |
| Komponen | [radar/page.tsx](../../idx-web/app/radar/page.tsx) ~baris 150–205 |
| Fungsi | Menjelaskan keterlambatan EOD (±5–15 menit), definisi rupiah, dan jumlah emiten yang dipindai |
| Sumber data | Teks statis + field `scanned` dari respons radar |
| Rumus/Logika | Rupiah = volume asing × close |
| Periode/Window | — |
| Interaksi | — |
| Empty/Loading/Error | — |

### Papan Pola Smart Money
| Field | Isi |
|---|---|
| Nama card | Papan Pola (`SmartMoneyPatternsBoardCard`) |
| Komponen | `components/SmartMoneyPatternsBoardCard.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Pola aliran (mis. akumulasi berkelanjutan, flip) per emiten |
| Sumber data | `GET /api/smart-money/patterns` ([app.py:464](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_smart_money_patterns_board` ([analytics.py:556](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache `smart_money_patterns_board` 1800 detik |
| Rumus/Logika | Dari deret net asing harian; detail di fungsi backend |
| Periode/Window | Ditentukan backend |
| Interaksi | Klik emiten → detail |
| Empty/Loading/Error | Pesan kosong bila data belum cukup |

### Track Record Smart Money
| Field | Isi |
|---|---|
| Nama card | Track Record (`SmartMoneyTrackRecordCard`) |
| Komponen | `components/SmartMoneyTrackRecordCard.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Seberapa baik sinyal aliran asing historis memprediksi return |
| Sumber data | `GET /api/smart-money/track-record` ([app.py:452](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_smart_money_track_record` ([analytics.py:845](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache 3600 detik |
| Rumus/Logika | Evaluasi sinyal pada horizon tetap; dibandingkan dengan pasar |
| Periode/Window | Histori sinyal |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong bila histori kurang |

### Smart Money per Emiten (`/radar/[code]`)
| Field | Isi |
|---|---|
| Nama card | Banner Smart Money + Track Record emiten |
| Komponen | [radar/[code]/page.tsx](../../idx-web/app/radar/[code]/page.tsx); `SmartMoneyBanner` |
| Fungsi | Ringkasan arah aliran asing satu emiten + posisi di radar |
| Sumber data | `GET /api/stocks/{code}/smart-money` → `get_stock_smart_money` ([analytics.py:585](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache `smart_money_stock:{code}` 1800 detik |
| Rumus/Logika | Dari arus asing emiten; detail di fungsi backend |
| Periode/Window | Ditentukan backend |
| Interaksi | Tombol kembali ke `/radar` |
| Empty/Loading/Error | Pesan kosong bila kode tidak punya data |

## 4. Data Flow (end-to-end)
```
Broker/foreign EOD → Postgres (foreign_flow, latest_pit.foreign_net)
  → analytics.get_smart_money_radar / get_smart_money_patterns_board / get_smart_money_track_record
  → GET /api/smart-money/* → SWR (300 s / 1800 s / 3600 s) → kartu radar
  → klik → /radar/[code] → GET /api/stocks/{code}/smart-money → SmartMoneyBanner
```

## 5. Cara Pengambilan / Update Data
- **Precomputed vs on-demand**: hasil dihitung saat request, lalu di-cache in-process (1800–3600 detik). Sumber data EOD diisi oleh job pipeline `refresh_s2` (16:05 WIB) dan `refresh_s2_late` (16:20 WIB) ([cli.py](../../idx-scraper/src/idx_scraper/cli.py)).
- **Refresh UI**: SWR 300 detik (radar, detail) dan 1800/3600 detik (papan dan track record).
- **Reset cache**: `POST /api/cache/clear` ([app.py:516](../../idx-scraper/src/idx_scraper/api/app.py)), dipanggil setiap job pipeline.
- **Idempotensi**: perhitungan murni dari data tersimpan; run ulang menghasilkan angka sama.
- **Fallback**: bila data asing kosong, kartu menampilkan empty state; tidak ada sumber alternatif.

## 6. Dependensi & Relasi Menu
- Memakai data [Foreign Flow](foreign-flow.md) dan [Aliran Dana Emiten](aliran-dana-emiten.md).
- Hasil ringkas ikut tampil di [Halaman Detail Emiten](halaman-detail.md).
- Verdict papan (`/api/smart-money/verdicts`) dipakai [Screener](screener.md) / watchlist [BELUM TERVERIFIKASI konsumen tepat].

## 7. Catatan Batasan & Edge Case
- Data EOD: sinyal baru tersedia setelah bursa tutup.
- Rupiah dihitung dari volume asing × close, bukan nilai transaksi resmi IDX.
- Track record butuh histori cukup; sampel kecil membuat hasil tidak stabil.
- Cache 1800–3600 detik: data baru tampil setelah cache habis atau dibersihkan.
