# Hold Check (`/hold-check`)

## 1. Ringkasan Fungsi
Satu verdict per emiten yang menjawab "tahan, kurangi, atau keluar". Menggabungkan skor teknikal + valuasi, lalu disesuaikan faktor (IC) dan broker. Pengguna: pemegang posisi yang butuh keputusan disiplin. Dipakai rutin untuk review portofolio.

## 2. Route & Berkas
- URL: `/hold-check` → [`app/hold-check/page.tsx`](../../idx-web/app/hold-check/page.tsx)
- Komponen: [HoldCheckPanel](../../idx-web/components/HoldCheckPanel.tsx), [RegimeBanner](../../idx-web/components/RegimeBanner.tsx)
- Hook: `useHoldCheck(codes)` ([hooks.ts](../../idx-web/lib/hooks.ts), refresh 300 detik)

## 3. Penjelasan Per-Card

### Verdict Hold Check
| Field | Isi |
|---|---|
| Nama card | Hold Check |
| Komponen | [HoldCheckPanel.tsx](../../idx-web/components/HoldCheckPanel.tsx) |
| Fungsi | Verdict + skor (0-100) per emiten; rincian dasar/faktor/broker dan alasan |
| Sumber data | `GET /api/hold-check` ([app.py:288](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_hold_check` ([services.py:772](../../idx-scraper/src/idx_scraper/api/services.py)) |
| Rumus/Logika | Skor teknikal + valuasi (`base_score`), disesuaikan `factor_adj` (bobot IC) dan `broker_adj`; verdict STRONG HOLD/HOLD/TRIM/EXIT |
| Periode/Window | Snapshot EOD terbaru (SMA50, mean60, RSI) |
| Interaksi | Pilih/lihat emiten; tautan detail |
| Empty/Loading/Error | Empty bila histori tidak cukup |

### Banner Regime
| Field | Isi |
|---|---|
| Nama card | Regime IHSG |
| Komponen | [RegimeBanner.tsx](../../idx-web/components/RegimeBanner.tsx) |
| Fungsi | Kondisi pasar (tren naik/turun/sideways) + arah |
| Sumber data | `GET /api/market/regime` ([app.py:197](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_market_regime` ([analytics.py:62](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Klasifikasi regime dari tren IHSG + ADX |
| Periode/Window | Harian |
| Interaksi | — |
| Empty/Loading/Error | Placeholder bila belum ada data |

## 4. Data Flow (end-to-end)
```
EOD ingest → Postgres prices_pit/latest_pit + stock_summary_daily
   → services.get_hold_check (teknikal+valuasi) + factor weights (factor_ic_history)
   → GET /api/hold-check → SWR useHoldCheck (300s) → HoldCheckPanel
```

## 5. Cara Pengambilan / Update Data
- **On-demand**: dihitung saat request, bukan precomputed.
- **Refresh UI**: SWR 300 detik.
- **Idempotensi**: verdict murni fungsi data EOD (deterministik per tanggal).
- **Fallback**: komponen valuasi opsional; skor tetap dari teknikal bila valuasi kosong.

## 6. Dependensi & Relasi Menu
- Sumber verdict untuk [Ruang Keputusan](ruang-keputusan.md).
- Bergantung [Faktor & Kalibrasi](faktor.md) untuk bobot composite.

## 7. Catatan Batasan & Edge Case
- Butuh histori OHLC cukup panjang untuk SMA50/mean60.
- `factor_adj` dan `broker_adj` nol bila run IC/broker belum ada.
