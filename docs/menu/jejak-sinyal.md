# Jejak Sinyal (`/jejak-sinyal`)

## 1. Ringkasan Fungsi
Rapor kejujuran sinyal BUY/SELL: hit-rate, return setelah sinyal, selisih vs pasar equal-weight, dipecah per regime IHSG. Menjawab "kalau sinyal aplikasi ini diikuti, apakah benar-benar menang?". Pengguna: analis/PM yang menilai kredibilitas sinyal.

## 2. Route & Berkas
- URL: `/jejak-sinyal` → [`app/jejak-sinyal/page.tsx`](../../idx-web/app/jejak-sinyal/page.tsx) (233 baris)
- Komponen: `SummaryStrip`, `HorizonPills`, `StatTable` (di file page), [LastUpdated](../../idx-web/components/LastUpdated.tsx), [States](../../idx-web/components/States.tsx)
- Hooks: `useSignalTrack()` (600 s) ([hooks.ts](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card

### Ringkasan (SummaryStrip)
| Field | Isi |
|---|---|
| Nama card | Ringkasan strip (jumlah sinyal, periode, tanggal data terakhir) |
| Komponen | `SummaryStrip` [jejak-sinyal/page.tsx](../../idx-web/app/jejak-sinyal/page.tsx) |
| Fungsi | Gambaran cepat cakupan track record |
| Sumber data | `GET /api/signals/track` ([app.py:563](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.signal_track` ([analytics.py:2023](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Agregasi jumlah & rentang tanggal dari `signal_log` |
| Periode/Window | Seluruh riwayat `signal_log` |
| Interaksi | — |
| Empty/Loading/Error | Skeleton |

### Kinerja per Sinyal
| Field | Isi |
|---|---|
| Nama card | Kinerja per Sinyal |
| Komponen | [jejak-sinyal/page.tsx:157](../../idx-web/app/jejak-sinyal/page.tsx) + `StatTable` |
| Fungsi | Rata-rata return, excess return vs equal-weight, t-stat (Newey-West lag 5), max runup/drawdown per sinyal |
| Sumber data | `analytics.signal_track` → `research.signal_log` (2024, 2034) + `research.latest_pit` untuk harga |
| Rumus/Logika | Entry = close T+1; excess = return sinyal − return pasar equal-weight window sama; t-stat Newey-West lag 5 |
| Periode/Window | Horizon 5 / 10 / 21 sesi (pill `HorizonPills`) |
| Interaksi | Pilih horizon (5h/10h/21h) |
| Empty/Loading/Error | Skeleton; tabel kosong bila belum ada sinyal |

### Kinerja per Regime IHSG
| Field | Isi |
|---|---|
| Nama card | Kinerja per Regime IHSG |
| Komponen | [jejak-sinyal/page.tsx:170](../../idx-web/app/jejak-sinyal/page.tsx) |
| Fungsi | Membandingkan kinerja sinyal saat trending / ranging / transisi |
| Sumber data | `analytics.signal_track` → `research.signal_log` join `research.regime_daily` |
| Rumus/Logika | Sinyal dikelompokkan berdasarkan `regime` pada tanggal sinyal |
| Periode/Window | Horizon mengikuti pill aktif |
| Interaksi | Horizon bersama dengan kartu sebelumnya |
| Empty/Loading/Error | Skeleton / kosong bila `regime_daily` belum terisi |

### Sinyal Terbaru
| Field | Isi |
|---|---|
| Nama card | Sinyal Terbaru |
| Komponen | [jejak-sinyal/page.tsx:180](../../idx-web/app/jejak-sinyal/page.tsx) (tabel) |
| Fungsi | Daftar sinyal terbaru + return realisasi 5h/10h/21h |
| Sumber data | `analytics.signal_track` → `research.signal_log` |
| Rumus/Logika | Return terealisasi dari close entry; kosong bila horizon belum selesai |
| Periode/Window | 5 / 10 / 21 sesi |
| Interaksi | — |
| Empty/Loading/Error | EmptyState "Belum ada sinyal tercatat." |

## 4. Data Flow (end-to-end)
```
Pipeline sinyal (services.get_signals) → research.signal_log
  + research.latest_pit (harga) + research.regime_daily
  → analytics.signal_track → GET /api/signals/track → SWR (600 s) → 4 kartu
```

## 5. Cara Pengambilan / Update Data
- **Perhitungan**: on-demand dari `signal_log`; hasil di-cache (research cache 3600 s, `_RESEARCH_TTL`).
- **Pencatatan sinyal**: `signal_log` diisi pipeline sinyal; hasil horizon terisi seiring waktu.
- **Job**: ikut pipeline EOD; cache dibersihkan oleh `POST /api/cache/clear` tiap pipeline refresh.
- **Refresh UI**: 600 s.
- **Idempotensi**: [BELUM TERVERIFIKASI — cek unique key `signal_log`].

## 6. Dependensi & Relasi Menu
- Input: sinyal dari [Pantau](pantau.md)/[Screener](screener.md) pipeline; regime dari [Faktor & Kalibrasi](faktor.md).
- Menilai hasil [Rekomendasi Beli](rekomendasi.md) dan [Backtest](backtest.md) pada sisi kejujuran sinyal.

## 7. Catatan Batasan & Edge Case
- Kolom return kosong = horizon belum selesai (bukan nol).
- Sampel kecil per regime → t-stat tidak stabil; baca bersama jumlah sinyal.
- Hanya sinyal yang tercatat di `signal_log` yang dinilai; sinyal belum tercatat tidak ikut.
