# Dashboard (`/`)

## 1. Ringkasan Fungsi
Halaman pembuka: satu layar menjawab "bagaimana kondisi pasar hari ini?". Menampilkan IHSG, regime volatilitas, narasi pasar, ringkasan breadth, leaderboard likuiditas, sinyal teknikal, dan chart emiten terpilih. Pengguna: semua (trader, analis, PM). Dipakai saat membuka aplikasi / cek cepat kondisi sesi.

## 2. Route & Berkas
- URL: `/` → [`app/page.tsx`](../../idx-web/app/page.tsx)
- Komponen: [MarketOverview](../../idx-web/components/MarketOverview.tsx), [MarketNarration](../../idx-web/components/MarketNarration.tsx), [TopLeadersPanel](../../idx-web/components/TopLeadersPanel.tsx), [TopBrokersPanel](../../idx-web/components/TopBrokersPanel.tsx), [SignalsPanel](../../idx-web/components/SignalsPanel.tsx), [TechnicalChart](../../idx-web/components/TechnicalChart.tsx), [MarketRegimeCard](../../idx-web/components/MarketRegimeCard.tsx), [LastUpdated](../../idx-web/components/LastUpdated.tsx)
- Hooks: `useMarketOverview`, `useMarketTradeSummary`, `useMarketRegime`, `useMarketLeaders`, `useTopBrokers`, `useSignals`, `useTechnical`, `useNarration` ([hooks.ts](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card

### Hero IHSG (Volume/Value/Emiten + Reguler/Non-Reguler)
| Field | Isi |
|---|---|
| Nama card | IHSG · Composite (hero) |
| Komponen | `HeroIndex`/`SegmentBox` di [`app/page.tsx:41`](../../idx-web/app/page.tsx) |
| Fungsi | Harga IHSG + perubahan, volume/value total, jumlah emiten aktif, rincian pasar reguler vs non-reguler |
| Sumber data | `GET /api/market/overview` ([app.py:179](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_market_overview` ([services.py:200](../../idx-scraper/src/idx_scraper/api/services.py)) → tabel `index_quotes`; `GET /api/market/trade-summary` → `research.market_segment_daily` |
| Rumus/Logika | `index_quotes` close/change/percent; segment share = value segmen ÷ total ([services.py:55](../../idx-scraper/src/idx_scraper/api/services.py) `_segment`, `_share`) |
| Periode/Window | Sesi terbaru; volume dalam lot (1 lot = 100 lembar) |
| Interaksi | Hover `InfoHint` untuk definisi pasar |
| Empty/Loading/Error | Bila `trade.date` null → teks "data sesi terbaru belum tersedia" |

### Suasana Pasar (Regime)
| Field | Isi |
|---|---|
| Nama card | Suasana Pasar |
| Komponen | [MarketRegimeCard.tsx](../../idx-web/components/MarketRegimeCard.tsx) |
| Fungsi | Status tren & volatilitas IHSG (ADX(14)+DI, realized vol 20 hari) |
| Sumber data | `GET /api/market/regime` ([app.py:197](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_market_regime` ([analytics.py:62](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `index_summary_daily`, fallback breadth `research.latest_pit` |
| Rumus/Logika | Regime dari ADX/DI + realized vol → label tren/ranging/transisi; klasifikasi di `research/regime.py` |
| Periode/Window | 20 hari (vol), ADX 14 |
| Interaksi | — |
| Empty/Loading/Error | Skeleton/Empty/Error via [States.tsx](../../idx-web/components/States.tsx) |

### Narasi Pasar
| Field | Isi |
|---|---|
| Nama card | Narasi Pasar |
| Komponen | [MarketNarration.tsx](../../idx-web/components/MarketNarration.tsx) |
| Fungsi | Ringkasan teks kondisi pasar (breadth, foreign, top movers) |
| Sumber data | `GET /api/market/narration` ([app.py:512](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.get_market_narration` ([analytics.py:1323](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.latest_pit` |
| Rumus/Logika | Agregasi qty value/volume/foreign_net per `trade_date` ([analytics.py:1344-1365](../../idx-scraper/src/idx_scraper/api/analytics.py)) |
| Periode/Window | Sesi terbaru |
| Interaksi | — |
| Empty/Loading/Error | Skeleton/Empty/Error |

### Ringkasan Pasar (Breadth)
| Field | Isi |
|---|---|
| Nama card | Ringkasan Pasar |
| Komponen | [MarketOverview.tsx](../../idx-web/components/MarketOverview.tsx) |
| Fungsi | Jumlah naik/turun/stagnan, breadth |
| Sumber data | `GET /api/market/overview` → `services.get_market_overview` → `index_quotes` |
| Rumus/Logika | Agregasi field `totals` di `get_market_overview` |
| Periode/Window | Sesi terbaru |
| Interaksi | — |
| Empty/Loading/Error | Skeleton/Empty/Error |

### Leaderboard (Volume / Value / Frekuensi)
| Field | Isi |
|---|---|
| Nama card | Top Leader (3 varian) |
| Komponen | [TopLeadersPanel.tsx](../../idx-web/components/TopLeadersPanel.tsx) (`metric="volume"/"value"/"frequency"`) |
| Fungsi | 5 emiten teratas per metrik likuiditas |
| Sumber data | `GET /api/market/leaders?metric=` ([app.py:207](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_market_leaders` ([services.py:490](../../idx-scraper/src/idx_scraper/api/services.py)) → `stock_summary_daily`/`stock_quotes` |
| Rumus/Logika | Realtime dari `stock_quotes` saat jam bursa, EOD dari `stock_summary_daily` ([services.py:377](../../idx-scraper/src/idx_scraper/api/services.py) `_leaders_eod`, `:424` `_leaders_intraday`) |
| Periode/Window | Sesi terbaru |
| Interaksi | Klik emiten → set `selected` → chart di bawah |
| Empty/Loading/Error | Skeleton/Empty/Error |

### Top Broker
| Field | Isi |
|---|---|
| Nama card | Top Broker |
| Komponen | [TopBrokersPanel.tsx](../../idx-web/components/TopBrokersPanel.tsx); logo kode broker lewat [TickerLogo.tsx](../../idx-web/components/TickerLogo.tsx) `basePath="/logos/brokers"`, monogram bila file tidak ada |
| Fungsi | Broker teraktif per nilai transaksi, dengan logo di samping kode broker |
| Sumber data | `GET /api/market/top-brokers` ([app.py:215](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_top_brokers` ([services.py:507](../../idx-scraper/src/idx_scraper/api/services.py)) → `research.broker_daily` |
| Rumus/Logika | Rank value per `broker_code` pada `trade_date` terbaru |
| Periode/Window | EOD harian seluruh pasar |
| Interaksi | — |
| Empty/Loading/Error | Skeleton/Empty/Error |

### Trading Signals
| Field | Isi |
|---|---|
| Nama card | Trading Signals |
| Komponen | [SignalsPanel.tsx](../../idx-web/components/SignalsPanel.tsx) |
| Fungsi | Sinyal BUY/SELL/HOLD rule-based per emiten |
| Sumber data | `GET /api/signals` ([app.py:304](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_signals` ([services.py:1051](../../idx-scraper/src/idx_scraper/api/services.py)) → `research.latest_pit` |
| Rumus/Logika | SMA20/50 + RSI(14) rule-based ([SignalsPanel.tsx:128](../../idx-web/components/SignalsPanel.tsx)) |
| Periode/Window | SMA20/50, RSI 14, min 25 hari ([services.py:1051](../../idx-scraper/src/idx_scraper/api/services.py)) |
| Interaksi | Klik emiten → chart |
| Empty/Loading/Error | Skeleton/Empty/Error |

### Technical Chart
| Field | Isi |
|---|---|
| Nama card | Technical Chart |
| Komponen | [TechnicalChart.tsx](../../idx-web/components/TechnicalChart.tsx) |
| Fungsi | Close, MA20/50, Bollinger, RSI, MACD |
| Sumber data | `GET /api/stocks/{code}/technical` ([app.py:325](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_technical_chart` ([services.py:1098](../../idx-scraper/src/idx_scraper/api/services.py)) → `stock_daily`, live bar dari `stock_quotes` |
| Rumus/Logika | OHLC historis + live bar di-merge ([services.py:667](../../idx-scraper/src/idx_scraper/api/services.py) `_live_bar`, `:692` `_merge_live_bar`) |
| Periode/Window | ~60 sesi |
| Interaksi | Tampil saat ada emiten terpilih |
| Empty/Loading/Error | Empty bila belum pilih emiten |

## 4. Data Flow (end-to-end)
IDX/DataIDX → `cf_transport.py` → `live_capture.py` → PostgreSQL (`index_quotes`, `stock_quotes`, `index_summary_daily`, `stock_summary_daily`, `research.broker_daily`, `research.latest_pit`) → `analytics.py`/`services.py` → FastAPI (`/api/market/*`, `/api/signals`, `/api/stocks/{code}/technical`) → SWR (30s) → `app/page.tsx` render.

## 5. Cara Pengambilan / Update Data
- **Kapan dibuat**: campuran — `overview`/`leaders` on-demand dari snapshot terbaru; `trade-summary` dari agregat EOD.
- **Job**: interval `idx` (60s, refresh index), `wl` (60s, watchlist/leaders). Cron EOD `refresh_s2` 16:05 mengisi snapshot harian. Lihat [cli.py](../../idx-scraper/src/idx_scraper/cli.py).
- **Refresh UI**: SWR 30s (overview/leaders/signals/technical), 60s (trade-summary/narration), 300s (regime).
- **Idempotensi**: upsert pada `trade_date`/`code`.
- **Fallback**: breadth dari `research.latest_pit` bila `index_summary_daily` kosong.

## 6. Dependensi & Relasi Menu
Feed ke hampir semua menu lain (klik emiten → `/stock/[code]`). Bergantung pada EOD pipeline yang juga mengisi Radar/Foreign/Aliran Dana.

## 7. Batasan & Edge Case
- Angka volume/value final hanya setelah pasar tutup.
- Data delayed ~5–15 menit (label UI).
- `stock_quotes` (live) bisa stale di luar jam bursa; leaderboard jatuh ke EOD.
