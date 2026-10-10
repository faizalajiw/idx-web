# Aliran Dana Emiten (`/flow` + `/flow/[code]`)

## 1. Ringkasan Fungsi
Satu halaman untuk membaca aliran dana satu emiten: arah asing harian, timeline skor akumulasi, dan komposisi broker. Pengguna: analis yang sudah memilih emiten dan ingin melihat jejak aliran. Tanpa kode, halaman menampilkan pemilih dan empty state.

## 2. Route & Berkas
- URL indeks: `/flow` → [`app/flow/page.tsx`](../../idx-web/app/flow/page.tsx) (tanpa emiten)
- URL detail: `/flow/[code]` → `app/flow/[code]/page.tsx` [BELUM TERVERIFIKASI nama berkas]
- Workspace: [`app/flow/FlowWorkspace.tsx`](../../idx-web/app/flow/FlowWorkspace.tsx)
- Komponen: `ForeignFlowCard`, `FlowTimelineCard`, `BrokerFlowCard` ([components/](../../idx-web/components/))
- Hook: `useWatchlist()` (untuk saran cepat, [hooks.ts](../../idx-web/lib/hooks.ts)); `useStockForeignFlow(code, 30, 10)` ([hooks.ts:129](../../idx-web/lib/hooks.ts)); `useStockBrokerActivity(code, lookback)` ([hooks.ts:227](../../idx-web/lib/hooks.ts), 300 detik); `useBrokerFlow(20, 5)` ([hooks.ts:117](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card / Per-Panel

### Pemilih Emiten (StockPicker)
| Field | Isi |
|---|---|
| Nama card | Pemilih emiten |
| Komponen | [FlowWorkspace.tsx](../../idx-web/app/flow/FlowWorkspace.tsx) (`StockPicker`) |
| Fungsi | Input kode dan saran cepat (8 kode dari watchlist) |
| Sumber data | `useWatchlist()` → `GET /api/watchlist` ([app.py:244](../../idx-scraper/src/idx_scraper/api/app.py)) |
| Rumus/Logika | Filter kode berdasarkan teks; emiten aktif selalu ditawarkan |
| Periode/Window | — |
| Interaksi | Ketik kode + Enter/Lihat → `/flow/{KODE}`; chip cepat → link |
| Empty/Loading/Error | Saran kosong bila watchlist kosong |

### Arus Asing (ForeignFlowCard)
| Field | Isi |
|---|---|
| Nama card | Arus Asing |
| Komponen | [ForeignFlowCard.tsx](../../idx-web/components/ForeignFlowCard.tsx) (`code` prop) |
| Fungsi | Arah net asing harian, streak, flip terakhir, dan lama sejak flip |
| Sumber data | `GET /api/stocks/{code}/foreign-flow?days=30&peer_days=10` ([app.py:397](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_stock_foreign_flow` ([analytics.py:318](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache `stock_foreign_flow:{code}:{days}:{peer_days}:{peer_limit}` |
| Rumus/Logika | Arah = tanda net asing harian; streak = jumlah sesi berturut-turut searah; flip = pergantian tanda; peer = emiten sebanding |
| Periode/Window | 30 sesi; peer 10 sesi |
| Interaksi | Hover pada titik peer; "Emiten ini" ditandai |
| Empty/Loading/Error | Pesan "Belum ada data aliran asing..." bila kosong; skeleton; error message |

### Timeline Aliran Dana (FlowTimelineCard)
| Field | Isi |
|---|---|
| Nama card | Timeline Aliran Dana |
| Komponen | [FlowTimelineCard.tsx](../../idx-web/components/FlowTimelineCard.tsx) |
| Fungsi | Skor akumulasi per tanggal dan median pasar sebagai pembanding |
| Sumber data | `GET /api/stocks/{code}/broker-activity?lookback=60` ([app.py:378](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_stock_broker_activity` ([analytics.py:2578](../../idx-scraper/src/idx_scraper/api/analytics.py)); skor dari `broker_activity_snapshot` ([analytics.py:2192](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Rumus/Logika | Skor 0–100 dari faktor aliran yang lolos gate IC; median = median skor pasar pada tanggal itu |
| Periode/Window | Lookback 60 sesi (default) |
| Interaksi | Tooltip per titik: tanggal, skor, median |
| Empty/Loading/Error | Pesan: butuh ≥ 2 sesi berskor dan faktor tervalidasi IC |

### Komposisi Broker (BrokerFlowCard)
| Field | Isi |
|---|---|
| Nama card | Komposisi Broker |
| Komponen | [BrokerFlowCard.tsx](../../idx-web/components/BrokerFlowCard.tsx) (`compact`) |
| Fungsi | Porsi nilai transaksi per kategori broker: asing, lokal, BUMN |
| Sumber data | `GET /api/broker-flow?days=20&top_n=5` ([app.py:221](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_broker_flow` ([analytics.py:2055](../../idx-scraper/src/idx_scraper/api/analytics.py)); tabel `research.broker_daily` |
| Rumus/Logika | Nilai per kategori dibagi total; kategori dari map kurasi `idx_scraper.broker_flow` |
| Periode/Window | 20 sesi, top 5 |
| Interaksi | Toggle peta broker (`showMap`) |
| Empty/Loading/Error | Pesan: isi lewat `idx serve` (job 16:30) atau `python -m scripts.backfill_broker_eod` |

## 4. Data Flow (end-to-end)
```
Ingest EOD (foreign_flow, broker_daily) → Postgres
  → analytics.get_stock_foreign_flow / get_stock_broker_activity / get_broker_flow
  → GET /api/stocks/{code}/... → SWR → ForeignFlowCard, FlowTimelineCard, BrokerFlowCard
```

## 5. Cara Pengambilan / Update Data
- **On-demand** dengan cache in-process (600–3600 detik). Data sumber diisi job EOD.
- **Job**: `refresh_s2` 16:05 WIB, `refresh_s2_late` 16:20 WIB; broker EOD 16:30 WIB ([cli.py](../../idx-scraper/src/idx_scraper/cli.py)).
- **Refresh UI**: SWR 30 detik (foreign, broker flow), 300 detik (broker activity per emiten).
- **Reset cache**: `POST /api/cache/clear`.
- **Idempotensi**: upsert per (tanggal, emiten/broker) [BELUM TERVERIFIKASI detail upsert].
- **Fallback**: pesan kosong; tidak ada sumber alternatif.

## 6. Dependensi & Relasi Menu
- Dibuka dari [Foreign Flow](foreign-flow.md), [Aktivitas Broker](aktivitas-broker.md), dan [Halaman Detail Emiten](halaman-detail.md).
- Skor berasal dari [Faktor & Kalibrasi](faktor.md) (IC gate).

## 7. Catatan Batasan & Edge Case
- Timeline butuh minimal 2 sesi berskor dan faktor tervalidasi; bila tidak, kartu kosong.
- Komposisi broker bersifat pasar, bukan per emiten.
- Data EOD: tidak real-time.
