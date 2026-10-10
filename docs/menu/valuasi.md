# Valuasi (`/valuation`)

## 1. Ringkasan Fungsi
Menemukan emiten yang harganya menyimpang dari rata-rata 60-harinya (z-score). Menjawab "saham mana yang sedang murah/mahal secara statistik". Pengguna: analis/PM yang menyaring kandidat berbasis mean-reversion. Dipakai saat screening valuasi.

## 2. Route & Berkas
- URL: `/valuation` → [`app/valuation/page.tsx`](../../idx-web/app/valuation/page.tsx)
- Hook: `useValuation()` ([hooks.ts](../../idx-web/lib/hooks.ts), refresh 300 detik)

## 3. Penjelasan Per-Card

### Potensi Undervalued
| Field | Isi |
|---|---|
| Nama card | Potensi Undervalued |
| Komponen | [page.tsx](../../idx-web/app/valuation/page.tsx) (`RowTable`, `zBadge`) |
| Fungsi | Tabel emiten dengan z-score ≤ -1.0 (di bawah rata-rata 60 hari) |
| Sumber data | `GET /api/valuation` ([app.py:522](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_valuation` ([analytics.py:1479](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `prices_adjusted` (`stock_daily`) |
| Rumus/Logika | `z = (close − mean60) / std60`; kolom: Kode/Close/Rata-rata 60d/Z-Score/Momentum 20d/RSI/Trend |
| Periode/Window | Rata-rata & std 60 hari; momentum 20 hari |
| Interaksi | Klik baris → `/stock/[code]` |
| Empty/Loading/Error | Empty bila tak ada kandidat |

### Potensi Overvalued
| Field | Isi |
|---|---|
| Nama card | Potensi Overvalued |
| Komponen | [page.tsx](../../idx-web/app/valuation/page.tsx) (`RowTable`) |
| Fungsi | Tabel emiten dengan z-score ≥ 1.5 (di atas rata-rata 60 hari) |
| Sumber data | Sama dengan Undervalued |
| Rumus/Logika | Ambang: Undervalued z ≤ -1.0, Overvalued z ≥ 1.5 ([analytics.py:1530-1532](../../idx-scraper/src/idx_scraper/api/analytics.py)); badge z ≤ -2 beli / ≥ 2 jual |
| Periode/Window | 60 hari |
| Interaksi | Klik baris → `/stock/[code]` |
| Empty/Loading/Error | Empty bila tak ada kandidat |

## 4. Data Flow (end-to-end)
```
Yahoo/IDX EOD → ingest → Postgres stock_daily → view prices_adjusted
   → analytics.get_valuation (z-score 60d, cache 600s) → GET /api/valuation
   → SWR useValuation (300s) → RowTable
```

## 5. Cara Pengambilan / Update Data
- **On-demand**: dihitung saat request; **bukan** job terjadwal.
- **Cache**: 600 detik.
- **Refresh UI**: SWR 300 detik.
- **Fallback**: harga dari view `prices_adjusted` (gabungan sumber EOD).

## 6. Dependensi & Relasi Menu
- Bergantung pada `stock_daily`/`prices_adjusted` (job refresh EOD).
- Terkait [Screener](screener.md) (faktor valuasi) dan [Ruang Keputusan](ruang-keputusan.md) (komponen valuasi skor).

## 7. Catatan Batasan & Edge Case
- Z-score butuh histori ≥ 60 sesi; emiten baru tidak muncul.
- Sinyal mean-reversion, bukan rekomendasi — konfirmasi dengan menu lain.
