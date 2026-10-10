# Ruang Keputusan (`/keputusan`, `/keputusan/[code]`)

## 1. Ringkasan Fungsi
Satu halaman untuk menjawab "apa posisi saya terhadap emiten ini". Menggabungkan verdict hold-check sebagai dasar, lalu memperkaya dengan konteks yang **tidak mengubah verdict** (regime, sentimen aliran, jejak asing, base rate event, level pembatalan). Pengguna: trader/analis yang butuh ringkasan keputusan + alasan. Dipakai saat mau memutuskan hold/trim/exit satu emiten.

## 2. Route & Berkas
- URL: `/keputusan` (pemilih emiten) → [`app/keputusan/page.tsx`](../../idx-web/app/keputusan/page.tsx); `/keputusan/[code]` → workspace
- Komponen: [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) (VerdictBadge, MiniBar, ContextStrip, ForeignMini, InvalidationLevels, StockPicker)
- Hook: `useStockDecision(code)` ([hooks.ts](../../idx-web/lib/hooks.ts), refresh 120 detik)

## 3. Penjelasan Per-Card

### Verdict Dasar
| Field | Isi |
|---|---|
| Nama card | Ruang Keputusan — `{code}` |
| Komponen | [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) (`VerdictBadge`, `MiniBar`) |
| Fungsi | Verdict gabungan teknikal + valuasi + lapisan IC/broker; skor N/100 + alasan |
| Sumber data | `GET /api/stocks/{code}/decision` ([app.py:367](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_stock_decision` ([analytics.py:1143](../../idx-scraper/src/idx_scraper/api/analytics.py)); dasar dari `services.get_hold_check` ([services.py:772](../../idx-scraper/src/idx_scraper/api/services.py)) |
| Rumus/Logika | Verdict = hold-check; `score = base_score + factor_adj + broker_adj`; verdict merek: STRONG HOLD / HOLD / TRIM / EXIT |
| Periode/Window | Verdict bergerak harian; cache 30 menit |
| Interaksi | Ganti emiten lewat StockPicker |
| Empty/Loading/Error | Empty "Emiten tidak ditemukan / histori tidak cukup untuk verdict" |

### Konteks Pasar & Aliran (Strip)
| Field | Isi |
|---|---|
| Nama card | Context strip (4 tile) |
| Komponen | [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) (`ContextStrip`) |
| Fungsi | Regime IHSG (+ADX, as-of), Sentimen aliran (label + skor), Flip asing terakhir, Gauge pasar (N/100 + band) |
| Sumber data | `get_stock_decision` membaca `get_market_regime` ([analytics.py:62](../../idx-scraper/src/idx_scraper/api/analytics.py)) + `get_sentiment` ([analytics.py:1984](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Konteks murni informatif — tidak mengubah verdict |
| Periode/Window | Regime/sentimen terbaru |
| Interaksi | — |
| Empty/Loading/Error | "Tidak ada dasar" bila sentimen kosong |

### Jejak Asing 10 Sesi
| Field | Isi |
|---|---|
| Nama card | Jejak Asing 10 Sesi |
| Komponen | [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) (`ForeignMini`) |
| Fungsi | Bar net asing per hari (rupiah), amber = hari flip |
| Sumber data | `get_stock_decision` → net asing per sesi |
| Rumus/Logika | Lebar bar ∝ `|net| / maxAbs`; warna flip (`#f59e0b`) vs up/down |
| Periode/Window | 10 sesi terakhir |
| Interaksi | — |
| Empty/Loading/Error | Empty "Belum ada jejak asing." |

### Level Pembatalan
| Field | Isi |
|---|---|
| Nama card | Level Pembatalan |
| Komponen | [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) (`InvalidationLevels`) |
| Fungsi | Level teknikal yang membatalkan tesis: Close, SMA50, Mean 60-hari, Bollinger bawah, RSI |
| Sumber data | `get_stock_decision` → `invalidation` (dari frame OHLC `prices_adjusted`) |
| Rumus/Logika | Level dihitung dari harga; RSI ≥ 65 mendekati overbought, ≤ 35 oversold |
| Periode/Window | Snapshot terbaru |
| Interaksi | — |
| Empty/Loading/Error | Empty "Histori harga belum cukup untuk menghitung level." |

### Base Rate Event
| Field | Isi |
|---|---|
| Nama card | Base Rate Event |
| Komponen | [DecisionWorkspace.tsx](../../idx-web/app/keputusan/DecisionWorkspace.tsx) |
| Fungsi | Median forward & abnormal return setelah event serupa; kolom Emiten (n×, tanggal), Median fwd, Median abn., Pasar (count · hit rate) |
| Sumber data | `get_stock_decision` → `events` (event study) |
| Rumus/Logika | Event study: riwayat emiten vs baseline pasar; sampel kecil = baca sekilas |
| Periode/Window | Per jenis event |
| Interaksi | — |
| Empty/Loading/Error | Card disembunyikan bila `events.length === 0` |

## 4. Data Flow (end-to-end)
```
EOD ingest → Postgres (prices_pit / latest_pit, stock_summary_daily)
   → services.get_hold_check (skor) + analytics.get_sentiment + get_market_regime
   → analytics.get_stock_decision (gabung, cache 30m) → GET /api/stocks/{code}/decision
   → SWR useStockDecision (120s) → DecisionWorkspace render
```

## 5. Cara Pengambilan / Update Data
- **On-demand**: dihitung saat request, **bukan** precomputed job.
- **Cache**: 30 menit (`_research_cache`), kunci `stock_decision:{code}`.
- **Refresh UI**: SWR 120 detik.
- **Idempotensi**: verdict dari satu sumber (hold-check); konteks dibaca ulang tiap request.
- **Fallback**: mengikuti hold-check (lihat [Hold Check](hold-check.md)).

## 6. Dependensi & Relasi Menu
- Bergantung pada [Hold Check](hold-check.md) (verdict dasar), [Sentimen](sentimen.md), regime IHSG, dan event study.
- Menautkan ke `/stock/[code]` dan `/flow/[code]`.

## 7. Catatan Batasan & Edge Case
- Verdict butuh histori harga minimal; emiten tipis bisa kosong.
- Konteks (regime/sentimen/base rate) bersifat penilai kepercayaan — bukan pengubah verdict.
- Skor broker hanya muncul bila run IC tersedia.
