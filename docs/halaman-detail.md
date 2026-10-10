# Halaman Detail Emiten (`/stock/[code]`)

## 1. Ringkasan Fungsi
Satu halaman lengkap untuk satu emiten: grafik teknikal, sinyal, kepemilikan, arus asing, aliran dana, broker, event study, dan riwayat harga. Pengguna: analis yang sudah memilih emiten dari menu lain. Navigasi prev/next mengikuti urutan watchlist.

## 2. Route & Berkas
- URL: `/stock/[code]` → [`app/stock/[code]/page.tsx`](../../idx-web/app/stock/[code]/page.tsx)
- Komponen (diimpor di [page.tsx](../../idx-web/app/stock/[code]/page.tsx) baris 7–18): `TechnicalChart`, `HistoryTable`, `SignalsPanel`, `BrokerSummary`, `ForeignFlowCard`, `FlowTimelineCard`, `BrokerFlowCard`, `BrokerActivityCard`, `RegimeBanner`, `EventStudyCard`, `SmartMoneyBanner`, `OwnershipCard`
- Hook: `useWatchlist()` (navigasi prev/next, [hooks.ts](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card / Per-Panel

### Header & Navigasi Emiten
| Field | Isi |
|---|---|
| Nama card | Header kode + tombol prev/next |
| Komponen | [stock/[code]/page.tsx](../../idx-web/app/stock/[code]/page.tsx) baris 30–80 |
| Fungsi | Menampilkan kode dan pindah ke emiten sebelum/sesudah dalam watchlist |
| Sumber data | `GET /api/watchlist` ([app.py:244](../../idx-scraper/src/idx_scraper/api/app.py)) |
| Rumus/Logika | Urutan array watchlist; prev/next = indeks ± 1 |
| Periode/Window | — |
| Interaksi | Tombol prev/next → `/stock/{kode}` |
| Empty/Loading/Error | Tombol nonaktif bila tidak ada tetangga |

### Grafik Teknikal (TechnicalChart)
| Field | Isi |
|---|---|
| Nama card | Grafik Teknikal |
| Komponen | `components/TechnicalChart.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Candlestick dengan indikator (SMA, MACD, RSI) |
| Sumber data | `GET /api/stocks/{code}/technical` ([app.py:325](../../idx-scraper/src/idx_scraper/api/app.py)) → `services.get_technical_chart` ([services.py:1098](../../idx-scraper/src/idx_scraper/api/services.py)); hook `useTechnical` refresh 30 detik |
| Rumus/Logika | Indikator dihitung di backend dari OHLC |
| Periode/Window | Ditentukan backend [BELUM TERVERIFIKASI] |
| Interaksi | Hover per candle |
| Empty/Loading/Error | Skeleton; pesan error |

### Sinyal (SignalsPanel)
| Field | Isi |
|---|---|
| Nama card | Sinyal |
| Komponen | `components/SignalsPanel.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Sinyal BUY/SELL untuk emiten ini |
| Sumber data | `GET /api/signals?min_days=…` ([app.py:304](../../idx-scraper/src/idx_scraper/api/app.py)); hook `useSignals`, 30 detik |
| Rumus/Logika | Lihat [Jejak Sinyal](jejak-sinyal.md) |
| Periode/Window | Parameter `min_days` |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong |

### Kepemilikan (OwnershipCard)
| Field | Isi |
|---|---|
| Nama card | Kepemilikan |
| Komponen | `components/OwnershipCard.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Komposisi pemegang saham |
| Sumber data | `GET /api/stocks/{code}/ownership` ([app.py:439](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_stock_ownership` ([analytics.py:1004](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache 600 detik; hook 3600 detik |
| Rumus/Logika | Dari data kepemilikan tersimpan (tabel `research.ownership`) |
| Periode/Window | Periode laporan kepemilikan |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong |

### Arus Asing, Timeline, Broker
| Field | Isi |
|---|---|
| Nama card | Arus Asing; Timeline Aliran Dana; Komposisi Broker; Aktivitas Broker |
| Komponen | `ForeignFlowCard`, `FlowTimelineCard`, `BrokerFlowCard`, `BrokerActivityCard` |
| Fungsi | Lihat [Aliran Dana Emiten](aliran-dana-emiten.md) dan [Aktivitas Broker](aktivitas-broker.md) |
| Sumber data | `/api/stocks/{code}/foreign-flow`, `/broker-activity`, `/api/broker-flow` |
| Rumus/Logika | Lihat menu terkait |
| Periode/Window | Lihat menu terkait |
| Interaksi | — |
| Empty/Loading/Error | Lihat menu terkait |

### Broker Summary (BrokerSummary)
| Field | Isi |
|---|---|
| Nama card | Ringkasan Broker |
| Komponen | `components/BrokerSummary.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Broker teratas untuk emiten ini |
| Sumber data | `GET /api/stocks/{code}/brokers` ([app.py:336](../../idx-scraper/src/idx_scraper/api/app.py)); hook refresh 30 detik |
| Rumus/Logika | Dari `broker_summary` per emiten |
| Periode/Window | Tanggal EOD |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong |

### Event Study (EventStudyCard)
| Field | Isi |
|---|---|
| Nama card | Event Study |
| Komponen | `components/EventStudyCard.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Reaksi harga di sekitar event (dividen, aksi korporasi, pengumuman) |
| Sumber data | `GET /api/stocks/{code}/events` ([app.py:584](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_stock_events` ([analytics.py:1809](../../idx-scraper/src/idx_scraper/api/analytics.py)); cache 6 jam |
| Rumus/Logika | Return abnormal sekitar tanggal event [BELUM TERVERIFIKASI window] |
| Periode/Window | Window event |
| Interaksi | — |
| Empty/Loading/Error | Pesan kosong |

### Riwayat Harga (HistoryTable)
| Field | Isi |
|---|---|
| Nama card | Riwayat Harga |
| Komponen | `components/HistoryTable.tsx` [BELUM TERVERIFIKASI baris] |
| Fungsi | Tabel OHLCV harian |
| Sumber data | `GET /api/stocks/{code}/history?limit=…` ([app.py:314](../../idx-scraper/src/idx_scraper/api/app.py)); hook refresh 30 detik |
| Rumus/Logika | Data mentah dari tabel harga |
| Periode/Window | Parameter `limit` |
| Interaksi | Scroll |
| Empty/Loading/Error | Pesan kosong |

## 4. Data Flow (end-to-end)
```
Postgres (stock_daily, stock_quotes, foreign_flow, broker_summary, research.*)
  → endpoint /api/stocks/{code}/* (app.py)
  → SWR hook per kartu (lib/hooks.ts)
  → komponen kartu di halaman stock/[code]
```

## 5. Cara Pengambilan / Update Data
- **Campuran**: harga dan broker dibaca langsung dari DB (refresh 30 detik); skor dan event di-cache.
- **Job**: lihat [README](README.md) bagian scheduler.
- **Reset cache**: `POST /api/cache/clear`.
- **Fallback**: kartu kosong menampilkan pesannya sendiri; kartu lain tetap jalan.

## 6. Dependensi & Relasi Menu
- Menggabungkan [Sinyal/Jejak Sinyal](jejak-sinyal.md), [Foreign Flow](foreign-flow.md), [Aliran Dana Emiten](aliran-dana-emiten.md), [Aktivitas Broker](aktivitas-broker.md), [Radar Smart Money](radar-smart-money.md).

## 7. Catatan Batasan & Edge Case
- Watchlist kosong → navigasi prev/next tidak tersedia.
- Banyak kartu memakai data EOD; data intraday hanya tersedia bila capture berjalan.
- [BELUM TERVERIFIKASI] Nama berkas dan baris untuk komponen bertanda; cek sebelum dikutip.
