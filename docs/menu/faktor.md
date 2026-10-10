# Faktor & Kalibrasi (`/faktor`)

## 1. Ringkasan Fungsi
Menampilkan faktor mana yang terbukti memprediksi return (uji IC), bobot composite yang aktif, dan riwayat rekalibrasi. Menjawab: "faktor apa yang dipakai sistem sekarang dan seberapa kuat buktinya?" Pengguna: analis yang mengaudit model. Dibaca sebagai hasil run IC harian; bukan input interaktif.

## 2. Route & Berkas
- URL: `/faktor` → [`app/faktor/page.tsx`](../../idx-web/app/faktor/page.tsx)
- Hook: `useFactorsOverview()` ([hooks.ts:293](../../idx-web/lib/hooks.ts), refresh 600 detik)
- Hook pendukung: `useRegimeHistory(90)` ([hooks.ts:300](../../idx-web/lib/hooks.ts))
- Backend: `GET /api/factors/overview` ([app.py:593](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_factors_overview` ([analytics.py:1859](../../idx-scraper/src/idx_scraper/api/analytics.py))

## 3. Penjelasan Per-Card / Per-Panel

### Bobot Composite Aktif
| Field | Isi |
|---|---|
| Nama card | Bobot Composite Aktif |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 238 |
| Fungsi | Bobot tiap faktor pada skor composite untuk horizon 10 sesi |
| Sumber data | `research.factor_ic_history` (kolom `weight`) → `get_factors_overview`; fallback konstanta `FACTOR_WEIGHTS` (vol_21d, turnover_21d, dist_52w_high) |
| Rumus/Logika | Bobot dari run IC terbaru untuk horizon 10. Bila tabel kosong, pakai fallback statis |
| Periode/Window | Run IC terbaru (`max(run_date)`) |
| Interaksi | — |
| Empty/Loading/Error | Fallback ke bobot statis bila belum ada run |

### Regime IHSG Historis
| Field | Isi |
|---|---|
| Nama card | Regime IHSG Historis |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 241 |
| Fungsi | Riwayat regime pasar untuk konteks: faktor bisa bekerja beda di tiap regime |
| Sumber data | `GET /api/market/regime/history?days=90` ([app.py:599](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_regime_history` ([analytics.py:1940](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Klasifikasi regime harian (lihat [Dashboard](dashboard.md)) |
| Periode/Window | 90 hari |
| Interaksi | — |
| Empty/Loading/Error | Placeholder bila data kosong |

### IC per Faktor — Horizon 5
| Field | Isi |
|---|---|
| Nama card | IC per Faktor (Horizon 5) |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 246 |
| Fungsi | Mean IC, ICIR, t-stat, hit rate, jumlah hari, status eligible per faktor pada horizon 5 sesi |
| Sumber data | `research.factor_ic_history` (run terbaru) → `get_factors_overview` |
| Rumus/Logika | IC = Spearman rank correlation antara faktor dan return ke depan. Standard error Newey-West lag 5. Lolos bila \|IC\| ≥ 0,05 dan \|ICIR\| ≥ 0,5 (footer halaman) |
| Periode/Window | Horizon 5 sesi; `n_days` = jumlah hari observasi |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong bila belum ada run IC |

### IC per Faktor — Horizon 10
| Field | Isi |
|---|---|
| Nama card | IC per Faktor (Horizon 10) |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 249 |
| Fungsi | Sama seperti horizon 5, pada horizon 10 sesi. Horizon ini dipakai untuk bobot composite |
| Sumber data | Sama dengan horizon 5 |
| Rumus/Logika | Sama |
| Periode/Window | Horizon 10 sesi |
| Interaksi | — |
| Empty/Loading/Error | Sama |

### Riwayat Rekalibrasi
| Field | Isi |
|---|---|
| Nama card | Riwayat Rekalibrasi |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 253 |
| Fungsi | Bobot dan IC 12 run terakhir, untuk melihat stabilitas bobot |
| Sumber data | `research.factor_ic_history` (`history`, 12 run) → `get_factors_overview` |
| Rumus/Logika | Snapshot per `run_date` |
| Periode/Window | 12 run terakhir |
| Interaksi | — |
| Empty/Loading/Error | Kosong bila belum ada histori |

### Registry Faktor
| Field | Isi |
|---|---|
| Nama card | Registry Faktor |
| Komponen | [faktor/page.tsx](../../idx-web/app/faktor/page.tsx) ~baris 257 |
| Fungsi | Definisi tiap faktor (nama, arti, arah) |
| Sumber data | `FACTOR_DEFINITIONS` ([analytics.py](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Teks definisi statis |
| Periode/Window | — |
| Interaksi | — |
| Empty/Loading/Error | — |

## 4. Data Flow (end-to-end)
```
Harga EOD (Postgres) → research.ic (build panel, IC harian)
  → research.factor_ic_history (per run_date)   [job daily_ic 06:30 WIB]
  → analytics.get_factors_overview (cache default)
  → GET /api/factors/overview → useFactorsOverview (600 s) → kartu faktor
```

## 5. Cara Pengambilan / Update Data
- **Precomputed**: IC dihitung job terjadwal `daily_ic` (Senin–Jumat 06:30 WIB, [cli.py](../../idx-scraper/src/idx_scraper/cli.py)) dan disimpan ke `research.factor_ic_history`. Halaman hanya membaca.
- **Manual**: `idx ic` (disebut di pesan kosong [analytics.py](../../idx-scraper/src/idx_scraper/api/analytics.py)).
- **Cache**: respons di-cache in-process; `POST /api/cache/clear` ([app.py:516](../../idx-scraper/src/idx_scraper/api/app.py)) mengosongkannya.
- **Refresh UI**: SWR 600 detik.
- **Idempotensi**: satu baris per (run_date, faktor, horizon); run ulang menimpa.
- **Fallback**: bobot statis `FACTOR_WEIGHTS` bila tabel kosong.

## 6. Dependensi & Relasi Menu
- Bobot dan status eligible dipakai [Aktivitas Broker](aktivitas-broker.md), [Hold Check](hold-check.md), [Ruang Keputusan](ruang-keputusan.md), dan [Screener](screener.md).
- Konteks regime berasal dari [Dashboard](dashboard.md).

## 7. Catatan Batasan & Edge Case
- Faktor yang gagal ambang tetap tampil untuk transparansi tapi tidak diberi bobot.
- Data kurang dari histori minimum menghasilkan IC tidak stabil; lihat `n_days`.
- Bila job `daily_ic` gagal, halaman menampilkan run terakhir yang berhasil (tanggal `run_date` tidak berubah).
- [BELUM TERVERIFIKASI] Nama tabel `research.factor_ic_history` vs skema SQL di `sql/`; cocokkan sebelum dijadikan acuan migrasi.
