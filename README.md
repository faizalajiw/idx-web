# Market Labs — IDX Web

Next.js + Recharts frontend for the IDX market-data platform. Presentation-only —
all calculations happen in the FastAPI backend
(`market-labs/idx-scraper/src/idx_scraper/api`). Data source auto-switches between
the official IDX feed and Yahoo Finance fallback.

## Peta Navigasi

Sidebar dibagi jadi 7 grup. Semua tabel emiten bisa di-klik untuk membuka
detail teknikal `/stock/[code]`.

```mermaid
graph LR
  subgraph Utama
    A[Dashboard /]
    B[Watchlist /watchlist]
    C[Pantau /pantau]
  end
  subgraph Screening
    D[Screener /screener]
  end
  subgraph Analisis
    E[Valuasi /valuation]
    F[Hold Check /hold-check]
    G[Jejak Sinyal /jejak-sinyal]
    H[Backtest /backtest]
    I[Dividen /dividen]
    J[Faktor & Kalibrasi /faktor]
  end
  subgraph Flow
    K[Foreign Flow /foreign]
    L[Sentimen /sentimen]
    M[Aktivitas Broker /broker-activity]
  end
  subgraph Sektor
    M[Sektor /sectors]
  end
  subgraph Belajar
    N[Belajar Quant /learn]
  end
  subgraph Sistem
    O[Kualitas Data /quality]
  end
  A -.klik ticker.-> P[Stock Detail /stock/CODE]
  B -.klik ticker.-> P
  D -.klik ticker.-> P
```

## Menu & Fitur

### Grup: Utama

#### Dashboard (`/`)
Ringkasan pasar hari ini dalam satu layar:
- **Hero IHSG** — nilai Composite, perubahan poin & persen, volume/value/jumlah
  emiten aktif, plus waktu update terakhir.
- **Regime Banner + Timeline** — deteksi rezim IHSG (ADX + volatilitas realized:
  TRENDING/RANGING/TRANSISI) beserta riwayatnya.
- **Narasi Pasar** — ringkasan otomatis (IHSG + breadth naik/turun/flat).
- **Market Overview** — top gainers & losers.
- **Top Leaders** — leaderboard likuiditas per metrik (volume / value / frekuensi);
  realtime saat jam bursa, EOD di luar jam.
- **Top Brokers** — broker teraktif hari ini.
- **Signals Panel** — sinyal teknikal BUY/SELL/HOLD; klik emiten → chart di bawah.
- **Technical Chart** — kanvas detail bersama (dipilih dari panel mana pun).

#### Watchlist (`/watchlist`)
Daftar pantau manual — tambah/hapus emiten sendiri (persisted ke `.env` backend),
auto-refresh 30 detik. Klik baris → technical chart emiten itu.

#### Pantau (`/pantau`)
Watchlist + notifikasi dalam satu alur "pilih saham → pasang batas → tunggu Telegram":
- **Alert Rules CRUD** — pasang batas harga / RSI / volume per emiten.
- **Telegram Status** — cek koneksi + kirim pesan tes.
- Aturan diperiksa tiap data EOD baru masuk; notifikasi dikirim **sekali per
  persilangan** (anti-spam) dan reset setelah kondisi kembali normal.

### Grup: Screening

#### Screener (`/screener`)
Filter multi-kriteria: sinyal, RSI, momentum, value, foreign-in, rasio volume,
serta **skor aktivitas broker** (`min_broker_score`, preset "Akumulasi Broker").
Hasil bisa di-klik ke detail emiten. Kolom & filter broker hanya terisi bila
skor sudah tervalidasi IC (lihat Aktivitas Broker) — sebelum itu kolomnya kosong
dan filter menyaring habis, bukan diam-diam diabaikan.

### Grup: Analisis

#### Valuasi (`/valuation`)
PER/PBV per emiten beserta peers pembanding.

#### Hold Check (`/hold-check`)
Verdikt gabungan teknikal + valuasi: "saham ini masih layak dipegang?"

Skor 0–100 disusun berlapis: sinyal teknikal + valuasi (dominan), lalu lapisan
faktor IC (±10 poin), lalu lapisan **aktivitas broker** (±8 poin). Lapisan broker
hanya aktif bila ada faktor aliran yang lolos uji IC — kalau belum, verdict-nya
sama persis seperti sebelum fitur ini ada.

#### Jejak Sinyal (`/jejak-sinyal`)
Track record kualitas sinyal:
- Hit rate, mean/median forward return, abnormal return vs pasar, dan MFE/MAE per
  horizon (5 / 10 / 21 hari bursa).
- Breakdown per rezim IHSG (trending / ranging / transisi).
- Daftar sinyal terbaru dengan return yang sudah terealisasi.

#### Backtest (`/backtest`)
Simulator strategi point-in-time: equity curve + metrik, cost model (komisi, pajak,
slippage), frekuensi rebalance yang bisa diatur, dan perbandingan gross/net vs
buy & hold. Backend tidak menyimpan apa pun → aman dijalankan berulang saat tuning.

#### Dividen (`/dividen`)
Overview dividen (total, riwayat tahunan, top trailing yield) + ledger corporate
action (split, reverse split, bonus, rights, dividen).

#### Faktor & Kalibrasi (`/faktor`)
Registry faktor kuantitatif (momentum, volatilitas, likuiditas Amihud, foreign net,
ketimpangan order book, absorption, dll) dengan definisi & kalibrasinya.

### Grup: Flow

#### Foreign Flow (`/foreign`)
Arus dana asing (net buy/sell) peringkat pasar.

#### Sentimen (`/sentimen`)
- **Gauge sentimen pasar** (0–100: risk-on / netral / risk-off) — breadth harga +
  IHSG + porsi emiten dibeli asing.
- **Daftar akumulasi & distribusi** — arus asing + ketimpangan buku intraday
  (bid/offer) & absorption, lengkap dengan alasan per emiten. Dihitung dari data
  tersimpan, bukan berita.

#### Aktivitas Broker (`/broker-activity`)
Peringkat emiten berdasarkan **skor akumulasi** dari faktor aliran dana (proksi
jejak broker) + struktur broker pasar:
- **Peringkat skor akumulasi** — emiten dengan jejak aliran terkuat. Bobot tiap
  faktor berasal dari uji IC, dan hanya faktor yang lulus ambang (|IC| ≥ 0,05 &
  |ICIR| ≥ 0,5) yang diberi bobot; arahnya mengikuti tanda IC (ditentukan data,
  bukan asumsi). Kalau belum ada faktor yang lolos, halaman menampilkan status
  "belum tervalidasi" alih-alih skor rekaan.
- **Uji statistik faktor (IC)** — faktor mana yang layak dipakai, beserta bobot,
  t-stat, dan arah historisnya.
- **Struktur broker pasar** — konsentrasi transaksi per firma broker asli
  (CR1/CR3/CR5 + HHI), seluruh pasar, EOD.

Skor dari halaman ini dipakai ulang oleh Screener (filter `min_broker_score`),
Hold Check (lapisan verdict), kartu detail emiten, dan **rotasi sektor** di
halaman Sektor — semuanya lewat satu snapshot yang sama, jadi angkanya tidak
pernah berbeda antar halaman.

> Catatan data: IDX tidak menyediakan breakdown broker **per saham** di endpoint
> gratis. Sisi per emiten karena itu memakai proksi (aliran asing bernotasi +
> ketimpangan buku intraday) dan dilabeli apa adanya; sisi struktur pasar memakai
> data firma broker asli (`research.broker_daily`).

### Grup: Sektor

#### Sektor (`/sectors`)
Analisis sektor + **RRG** (Relative Rotation Graph) untuk melihat rotasi
kepemimpinan sektor dari **harga relatif** terhadap IHSG, plus **Rotasi Sektor —
Aktivitas Broker**: rotasi dari **jejak aliran dana** (median skor broker per
sektor + arah perubahan 5/21 sesi, breadth, dan sparkline riwayat).

Dua panel itu sengaja berdampingan karena berbeda pertanyaan: RRG menunjukkan
sektor yang harganya sudah menguat, panel broker menunjukkan sektor yang
**alirannya** berbalik — yang kadang belum terlihat di harga.

### Grup: Belajar

#### Belajar Quant (`/learn`)
Halaman edukasi / glosarium istilah pasar & kuantitatif.

### Grup: Sistem

#### Kualitas Data (`/quality`)
Dashboard mutu layer `research.*`:
- Overview coverage, freshness, jumlah baris.
- Quarantine viewer (baris yang ditolak quality gate + alasannya).
- Coverage gaps & thin days (deteksi hari scrape hilang/parsial).
- Deteksi duplikat (bar dengan lebih dari satu knowledge_date).

### Detail Emiten (`/stock/[code]`)
Dibuka dengan klik ticker mana pun. Berisi price history, technical chart (OHLCV +
MA/BB/RSI/MACD), broker summary per emiten, aktivitas broker (skor aliran +
riwayat driver + pembanding sektor), dan detail dividen (riwayat cash + split).

## Alur Data

Frontend murni presentasi. Semua kalkulasi berat ada di backend; Postgres jadi satu-
satunya sumber kebenaran; UI hanya fetch JSON lewat SWR dan render.

```mermaid
flowchart TD
  subgraph Sumber
    IDX[IDX GetIndexList / GetStockSummary<br/>via Cloudflare bypass]
    YF[Yahoo Finance .JK<br/>fallback historis]
  end

  subgraph Ingest["idx-scraper (Python + APScheduler)"]
    CF[cf_transport.py<br/>Chrome persisten share cookie CF]
    JOB[Scheduler jobs<br/>preopen / intraday / EOD]
    RESEARCH[Research layer PIT<br/>regime, signal_log, sentiment, faktor]
  end

  subgraph Store
    PG[(Postgres / Supabase<br/>raw_eod, prices_pit, index_quotes,<br/>broker_daily, signal_log, research.*)]
  end

  subgraph API["FastAPI (read-only)"]
    EP["/api/market/*, /api/watchlist,<br/>/api/signals, /api/backtest, dll"]
  end

  subgraph Web["idx-web (Next.js)"]
    HOOKS[lib/hooks.ts<br/>SWR, refresh 30s]
    CMP[components/*]
    PAGE[Pages app/*]
  end

  IDX --> CF --> JOB
  YF --> JOB
  JOB --> PG
  JOB --> RESEARCH --> PG
  PG --> EP
  EP -->|JSON| HOOKS --> CMP --> PAGE
```

Tahapannya:

1. **Sumber** — Angka utama dari **IDX** (`GetIndexList` untuk IHSG, `GetStockSummary`
   untuk EOD semua emiten). **Yahoo Finance** hanya fallback historis. Endpoint IDX
   diproteksi Cloudflare.
2. **Ingest (idx-scraper)** — `cf_transport.py` menjalankan Chrome persisten yang sudah
   lolos challenge Cloudflare, lalu menembak JSON IDX lewat `page.evaluate(fetch(...))`
   agar ikut memakai cookie yang bersih. **APScheduler** (timezone WIB) menjalankan job
   preopen / intraday / EOD. Setelah raw data masuk, **research layer point-in-time**
   menghitung regime IHSG, jejak sinyal, sentimen, dan faktor kuantitatif.
3. **Store (Postgres/Supabase)** — Semua ditulis idempotent (upsert `ON CONFLICT`).
   Tabel inti: `raw_eod` (source of truth), `prices_pit`, `index_quotes` (IHSG close
   resmi IDX-live), `broker_daily`, `signal_log`, plus schema `research.*`. Timezone
   di-set `Asia/Jakarta`.
4. **API (FastAPI read-only)** — Hanya membaca dari DB, **nol kalkulasi**. Expose
   endpoint `/api/*` lewat connection pool (autocommit sebelum `SET time zone`).
5. **Web (idx-web)** — `lib/hooks.ts` fetch JSON via **SWR** (auto-refresh 30 detik),
   diteruskan ke `components/*`, dirakit di halaman `app/*`. Frontend murni presentasi.

## Setup

```bash
cd d:/Project/market-labs/idx-web
npm install
```

Configure the backend URL in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Run

Start the backend first (from `idx-scraper`, with Postgres env loaded):

```bash
cd /d/Project/market-labs/idx-scraper
set -a && . ./.env && set +a
.venv/Scripts/python.exe -m uvicorn idx_scraper.api.app:app --port 8000
```

Then the frontend:

```bash
cd /d/Project/market-labs/idx-web
npm run dev        # http://localhost:3000
```

If you serve on a different port (e.g. 3100), add it to the backend's
`IDX_API_CORS_ORIGINS` allowlist.

## Structure

- `lib/types.ts` — TypeScript mirrors of the backend Pydantic schemas
- `lib/api.ts` — typed fetch client + SWR fetcher
- `lib/hooks.ts` — SWR hooks (30s auto-refresh)
- `lib/format.ts` — id-ID number / percent / compact-IDR formatting
- `components/` — MarketOverview, MarketNarration, RegimeBanner, RegimeTimeline, MarketBadge, WatchlistTable, SignalsPanel, TopLeadersPanel, TopBrokersPanel, HoldCheckPanel, TechnicalChart, HistoryTable, SectorRRGChart, SectorRotationTable, BrokerSummary, BrokerFlowCard, EquityCurveChart, RebalanceLedger, AlertRules, TelegramStatus, DividendYearChart, DividendDetailPanel, EventStudyCard, BrokerActivityCard, TickerLogo, Sidebar, Card, States, InfoHint, LastUpdated
- `app/page.tsx` — dashboard composition
- `app/watchlist/page.tsx` — daftar pantau manual + technical chart
- `app/pantau/page.tsx` — watchlist + signals + alert rules + Telegram wiring
- `app/stock/[code]/page.tsx` — per-stock technical, history, brokers, dividends
- `app/screener/page.tsx` — multi-criteria stock screener
- `app/sectors/page.tsx` — sector analysis + RRG rotation graph
- `app/foreign/page.tsx` — foreign fund flow
- `app/valuation/page.tsx` — PER/PBV valuation view
- `app/hold-check/page.tsx` — combined hold verdict
- `app/faktor/page.tsx` — registry faktor kuantitatif + kalibrasi
- `app/dividen/page.tsx` — dividend overview, trailing yields, corp-action ledger
- `app/quality/page.tsx` — data-quality dashboard (coverage, quarantine, gaps)
- `app/jejak-sinyal/page.tsx` — track record sinyal (per horizon & regime)
- `app/sentimen/page.tsx` — gauge sentimen pasar + daftar akumulasi/distribusi
- `app/backtest/page.tsx` — strategy simulator (equity curve, rebalance cadence, cost model, gross/net metrics vs buy & hold)
- `app/learn/page.tsx` — education / glossary page
- `app/broker-activity/page.tsx` — aktivitas broker (skor aliran tervalidasi IC + komposisi asing/lokal/BUMN + struktur broker pasar)

## Chat Commands

Perintah singkat buat nyuruh AI jalanin project ini. Tinggal copy-paste di chat:

| Perintah | Yang dijalankan |
|---|---|
| `jalanin web` | `npm run dev` (Next.js dev server, port 3000) |
| `jalanin web + backend` | jalankan `npm run dev` + `python -m idx_scraper.cli serve` di idx-scraper |

> **Note:** Frontend butuh backend jalan di `localhost:8000`. Kalau backend belum jalan, dashboard tetap load tapi data nggak muncul.

Full change history for both repos: see `../idx-scraper/AUDIT.md`.
