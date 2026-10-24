# idx-web

Frontend papan pasar IDX. Produksi sekarang **SvelteKit 3 + `adapter-static`** di
folder `web/`; app Next lama di akar repo disimpan sebagai rujukan dan tidak
lagi dijalankan. Seluruh perhitungan ada di backend FastAPI
(`idx-scraper/src/idx_scraper/api`); UI hanya mengambil JSON lalu menampilkan.

Dokumen pendamping di `web/docs/`:

- `PARITAS.md` - peta 19 rute ke berkas SvelteKit + catatan paritas & deviasi
- `DEPLOY.md` - paket deploy statis (nginx/Caddy, cache, fallback SPA)
- `TASKS.md`, `HASIL-UKUR.md`, `PANDUAN-PORT.md` - catatan migrasi (arsip)
- `DEPLOY.md` - paket deploy (nginx atau `serve.mjs`)

---

## Quick Start

1. **Pasang dependensi**

```powershell
cd D:\Project\market-labs\idx-web\web
npm ci
```

2. **Tentukan alamat backend** - dibaca saat build, bukan saat runtime:

```dotenv
# web/.env (contoh lengkap di web/.env.example)
PUBLIC_API_BASE_URL=http://localhost:8000
```

3. **Dev server**

```powershell
npm run dev        # http://localhost:3100
```

   Port :3100 dikunci (`strictPort`); hentikan `npm run preview` dulu kalau
   sedang hidup.

4. **Build produksi dan sajikan di :3000**

```powershell
npm run build                      # hasil: web/build (statis)
node deploy/serve.mjs 3000 build   # server statis tanpa dependensi
```

   `PUBLIC_API_BASE_URL` di-*inline* saat build: build ulang kalau alamatnya
   berubah. Untuk nginx, arahkan root ke `web/build` dengan fallback
   `index.html` - lihat `web/docs/DEPLOY.md`.

---

## Glossary
- **IHSG** – Composite index of all listed Indonesian stocks.
- **Regular market** – Trading during official IDX hours (09:00‑16:00 WIB).
- **Non‑regular market** – After‑hours or pre‑market data (Yahoo fallback).
- **Radar** – Visual board of strongest foreign‑money inflows/outflows.
- **Broker‑score** – Weighted aggregation of validated quantitative factors (IC‑filtered) plus broker‑level market concentration.
- **IC** – Information‑Coefficient, statistical measure of factor predictive power.

---

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
    E[Rekomendasi Beli /rekomendasi]
    G[Jejak Sinyal /jejak-sinyal]
    H[Backtest /backtest]
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
- **Volume & Value Pasar** (di dalam grid hero yang sama, di bawah IHSG) —
  pemisahan **pasar reguler** vs **non-reguler** (tunai + negosiasi): value Rp,
  volume lot & transaksi, plus porsinya terhadap total pasar. Volume/Value hero
  jadi total pasar (reguler + non-reguler) supaya kotak reguler bukan duplikat.
  Angka final setelah pasar tutup (sumber `GetStockSummary` IDX, agregat
  `research.market_segment_daily`).
- **Regime Banner + Timeline** — deteksi rezim IHSG (ADX + volatilitas realized:
  TRENDING/RANGING/TRANSISI) beserta riwayatnya.
- **Narasi Pasar** — ringkasan otomatis (IHSG + breadth naik/turun/flat).
- **Market Overview** — top gainers & losers.
- **Top Leaders** — leaderboard likuiditas per metrik (volume / value / frekuensi);
  realtime saat jam bursa, EOD di luar jam.
- **Top Brokers** — broker teraktif hari ini.
- **Signals Panel** — sinyal teknikal BUY/SELL/HOLD; klik emiten → chart di bawah.
- **Technical Chart** — kanvas detail bersama (dipilih dari panel mana pun).

#### Pantau (`/pantau`)
Watchlist + notifikasi dalam satu alur "pilih saham → pasang batas → tunggu Telegram":
- **Jejak Smart Money — Watchlist** — kartu ringkas: kondisi sekarang tiap emiten
  watchlist (ditimbun / dibuang / seimbang) + hitungannya. Alert Telegram menyala
  otomatis begitu verdict salah satu emiten berubah (tanpa pasang aturan). Daftar
  = baseline, jadi kamu tahu titik awalnya.
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

#### Rekomendasi Beli (`/rekomendasi`)
Papan kandidat beli se-pasar: tiap baris membawa **grade** (A/B/C), skor, **zona
entry**, **stop**, **target**, **R/R**, dan **ukuran posisi** (% modal dari
risiko 1% per posisi). Filter grade (A saja / B ke atas / semua) dan jumlah baris.
**Grade = peringkat relatif di dalam pool hari itu** (A 2% · B 10% · C 25%
teratas), bukan probabilitas dan bukan ambang skor absolut.

Di atasnya ada **strip lapisan** yang menyebut lapisan mana yang ikut
menggerakkan skor: komposisi skor datang dari walk-forward (semua komponen yang
lolos gate saat ini berbobot penalti), sementara **faktor IC** dan **aliran
broker** hanya aktif bila lolos gate IC — kalau belum, keduanya tidak ikut dan
halamannya bilang begitu, bukan menampilkan skor rekaan. Bukti **pola smart
money** ditampilkan sebagai alasan/peringatan per emiten, tapi belum menimbang
skor karena `foreign_net` baru tersedia ~50 sesi (di bawah jendela train).

Di bawah papan: **Track Record Kandidat** — seberapa sering kandidat benar-benar
berbuah, dipisah per grade dan horizon (5/10/21 hari), termasuk abnormal return
vs pasar. Ringkasnya diukur, bukan diklaim. Tiap kandidat bisa diklik ke Ruang
Keputusan atau detail teknikal.

> Alat bantu riset, bukan rekomendasi keuangan. Kandidat tanpa level stop yang
> bisa dihitung tidak ditampilkan.

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

#### Faktor & Kalibrasi (`/faktor`)
Registry faktor kuantitatif (momentum, volatilitas, likuiditas Amihud, foreign net,
ketimpangan order book, absorption, dll) dengan definisi & kalibrasinya.

### Grup: Flow

#### Radar Smart Money (`/radar`)
Papan seluruh pasar: emiten dengan **jejak aliran dana asing terkuat** dalam dua
daftar — akumulasi (net buy) & distribusi (net sell) — diurutkan per **nilai
rupiah**, dengan pilih jendela 2/5/10/21 sesi, badge streak, dan lantai
likuiditas (nilai transaksi jendela ≥ Rp 500 jt). Klik emiten → `/radar/[code]`
(jejak lengkap: verdict, pola, level, konteks sektor) lalu detail teknikal.
Di bawahnya **Pola Terkuat Hari Ini** — papan pola klasik yang menyala di sesi
terakhir, dikelompokkan **per pola** dan diurutkan berdasar kekuatan bukti
(kesempatan pola ber-catatan terkuat, mis. inisiasi volume, untuk terlihat tanpa
menunggu ia kebetulan muncul di emiten yang sedang dibuka). Tiap kelompok
membawa rekam jejaknya (persentase sesuai arah, horizon terbaik, kata keyakinan)
dan emiten yang memicunya urut |net asing|, dengan catatan jujur berapa emiten
yang disaring lantai likuiditas.
Lalu **Pola Klasik — Track Record**: seberapa sering tiap pola berhasil di
120 sesi terakhir + alpha vs pasar, jadi klaim pola bisa dicek, bukan dipercaya
buta.

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
skor keputusan backend (lapisan verdict), kartu detail emiten, dan **rotasi sektor** di
halaman Sektor — semuanya lewat satu snapshot yang sama, jadi angkanya tidak
pernah berbeda antar halaman.

> Catatan data: IDX tidak menyediakan breakdown broker **per saham** di endpoint
> gratis. Sisi per emiten karena itu memakai proksi (aliran asing bernotasi +
> ketimpangan buku intraday) dan dilabeli apa adanya; sisi struktur pasar memakai
> data firma broker asli (`research.broker_daily`).

### Grup: Sektor

#### Sektor (`/sectors`)
Analisis sektor per sektor (rata-rata %, breadth, nilai transaksi, arus asing),
plus **Rotasi Sektor — Aktivitas Broker**: rotasi dari **jejak aliran dana**
(median skor broker per sektor + arah perubahan 5/21 sesi, breadth, dan
sparkline riwayat) — sektor yang **alirannya** berbalik, meski harganya belum
bergerak.

### Detail Emiten (`/stock/[code]`)
Dibuka dengan klik ticker mana pun. Paling atas: banner **Jejak Smart Money**
(verdict hari ini + sejak kapan + ukurannya + pola + level). Tiap pola membawa
**rekam jejaknya** — badge "cerita N hari" (horizon tempat pola itu punya catatan
terbaik), persentase arah yang benar-benar sesuai pola, dan kata **keyakinan**
(tinggi/sedang/lemah); horizon selalu disebut karena tidak seragam antar pola,
dan pola diurutkan dari bukti terkuat. Verdict-nya juga diberi **konteks pasar**
(N dibuang vs M ditimbun di seluruh pasar) supaya bisa dibedakan "emiten ini
istimewa" dari "seluruh pasar sedang begitu". Lalu price history,
technical chart (OHLCV + MA/BB/RSI/MACD), broker summary per emiten, aktivitas
broker (skor aliran + riwayat driver + pembanding sektor), **Pemilik & Aksi
Pemilik** (komposisi pemegang saham dari keterbukaan IDX: free float publik,
pengendali, daftar pemilik terbesar, dan perubahan porsi vs snapshot
sebelumnya).

## Alur Data

Frontend murni presentasi. Semua kalkulasi berat ada di backend; Postgres jadi satu-
satunya sumber kebenaran; UI hanya fetch JSON lewat hook query dan render.

```mermaid
flowchart TD
  subgraph Sumber
    IDX["IDX GetIndexList / GetStockSummary<br/>via Cloudflare bypass"]
    YF["Yahoo Finance .JK<br/>fallback historis"]
  end

  subgraph Ingest["idx-scraper (Python + APScheduler)"]
    CF["cf_transport.py<br/>HTTP murni (curl_cffi); Chrome cadangan"]
    JOB["Scheduler jobs<br/>preopen / intraday / EOD"]
    RESEARCH["Research layer PIT<br/>regime, signal_log, sentiment, faktor"]
  end

  subgraph Store
    PG[("Postgres<br/>raw_eod, prices_pit, index_quotes,<br/>broker_daily, signal_log, research.*")]
  end

  subgraph API["FastAPI (read-only)"]
    EP["/api/market/*, /api/watchlist,<br/>/api/signals, /api/backtest, dll"]
  end

  subgraph Web["idx-web (SvelteKit)"]
    HOOKS["lib/hooks.svelte.ts<br/>query, refresh 30s"]
    CMP["lib/components/*"]
    PAGE["routes/*"]
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
2. **Ingest (idx-scraper)** — `cf_transport.py` default-nya menembak JSON IDX lewat HTTP murni (`curl_cffi`), tanpa browser dan tanpa kuki. Chrome persisten hanya **cadangan**: dipakai bila IDX menolak jalur HTTP, lalu JSON ditembak lewat `page.evaluate(fetch(...))` agar ikut memakai cookie yang bersih. **APScheduler** (timezone WIB) menjalankan job
   preopen / intraday / EOD. Setelah raw data masuk, **research layer point-in-time**
   menghitung regime IHSG, jejak sinyal, sentimen, dan faktor kuantitatif.
3. **Store (Postgres)** — Semua ditulis idempotent (upsert `ON CONFLICT`).
   Tabel inti: `raw_eod` (source of truth), `prices_pit`, `index_quotes` (IHSG close
   resmi IDX-live), `broker_daily`, `signal_log`, plus schema `research.*`. Timezone
   di-set `Asia/Jakarta`.
4. **API (FastAPI read-only)** — Hanya membaca dari DB, **nol kalkulasi**. Expose
   endpoint `/api/*` lewat connection pool (autocommit sebelum `SET time zone`).
5. **Web (idx-web)** — `lib/hooks.svelte.ts` fetch JSON lewat hook query sendiri (auto-refresh 30 detik),
   diteruskan ke `lib/components/*`, dirakit di `web/src/routes/*`. Frontend murni presentasi.

---

## Konvensi frontend (nyata, bukan agen otonom)

Tidak ada "agen" otonom di repo ini - aturan di bawah ditegakkan lewat struktur
kode, satu gerbang CI, dan review manual.

| Peran | Wujud nyata |
|-------|-------------|
| **Batas presentasi** | Presentasi murni: nol kalkulasi bisnis di web. Semua hitungan di backend FastAPI; UI mengambil JSON lewat helper query di `web/src/lib/hooks.svelte.ts` (auto-refresh 30 detik) lalu render. |
| **Design system** | Token di `web/src/app.css` (`--accent`, `--bg`/`--bg-elev`/`--border`, `--up`/`--down`/`--warn`/`--muted`) + primitif bersama: `.card`/`.card-hover`, `.badge`, `.btn`/`.btn-ghost`/`.btn-primary`, `.nav-link`, `.data-table`, `.skeleton`, `.gradient-text`, `.fade-up`. |
| **Komponen bersama** | `Card`, `EmptyState`/`ErrorState`/`Skeleton`, `InfoHint`, `LastUpdated`, `RegimeBanner`, `Sidebar`/`Topbar`, `TickerLogo` di `web/src/lib/components/`; tipe mirror backend di `web/src/lib/types.ts`, klien fetch di `web/src/lib/api.ts`. |
| **Aksesibilitas** | `aria-label` / `aria-hidden` / `aria-current` / `aria-modal` / `role` dipakai di nav, dialog mobile, dan tombol ikon; kontras dari token `app.css`. |
| **Kualitas otomatis** | Satu gerbang CI (`.github/workflows/ci.yml`): `npm ci` -> `svelte-check` -> `vite build` -> Playwright (47 tes, dua viewport). |
| **"No AI slop"** | Checklist review manual: hindari hero generik, ikon seragam, copy placeholder, dan komponen hasil salin tanpa adaptasi. |

### Evaluasi & kalibrasi (di backend, bukan frontend)

Peran "Trainer" (Evaluation / Feedback Loop / Calibration) tidak ada sebagai kode
frontend. Yang mengukur kualitas keputusan ada di backend:
`research/signal_log.py` (track record sinyal), `research/recommendation_log.py`
(track record kandidat beli), dan track record pola `smart_money` - semuanya
mengukur outcome forward + abnormal vs pasar supaya klaim bisa dicek, bukan
dipercaya. Di sisi frontend, gerbang otomatisnya `svelte-check`, `vite build`,
dan suite Playwright.

---

## Menjalankan frontend

1. Pastikan backend `idx-scraper` hidup di alamat `PUBLIC_API_BASE_URL`.
2. Dev: `cd web && npm run dev` -> <http://localhost:3100>.
3. Produksi lokal: `cd web && npm run build`, lalu
   `node deploy/serve.mjs 3000 build` -> <http://localhost:3000>. Task
   `IDX-Web` menjalankan jalur yang sama lewat `scripts/start-web.bat`.
4. Kalau memakai port selain 3000/3100, tambahkan ke `IDX_API_CORS_ORIGINS` di
   backend.

---

## Struktur

- `web/` - app SvelteKit (produksi)
  - `web/src/routes/` - 19 rute (`+page.svelte` per halaman, `+error.svelte` untuk halaman galat)
  - `web/src/lib/api.ts` - klien fetch bertipe
  - `web/src/lib/hooks.svelte.ts` - 48 hook query (auto-refresh 30 detik)
  - `web/src/lib/types.ts` - mirror skema Pydantic backend
  - `web/src/lib/format.ts` - format angka/persen/IDR `id-ID`
  - `web/src/lib/components/` - 43 komponen (MarketOverview, TechnicalChart, WatchlistTable, dan seterusnya)
  - `web/e2e/` - suite Playwright
  - `web/deploy/serve.mjs` - server statis tanpa dependensi
  - `web/docs/` - TASKS, PARITAS, HASIL-UKUR, DEPLOY
- `app/`, `components/`, `lib/`, `public/`, `e2e/` - app Next lama (arsip rujukan)
- `scripts/start-web.bat`, `scripts/restart-web.ps1` - launcher task `IDX-Web` (:3000)

---

## Chat Commands

Perintah singkat buat nyuruh AI jalanin project ini. Tinggal copy-paste di chat:

| Perintah | Yang dijalankan |
|---|---|
| `jalanin web` | `cd web && npm run dev` (SvelteKit, :3100) |
| `jalanin web produksi` | `cd web && npm run build` lalu `node deploy/serve.mjs 3000 build` |
| `jalanin web + backend` | dev server web + `python -m idx_scraper.cli serve` di idx-scraper |

> Frontend butuh backend hidup di `localhost:8000`. Tanpa backend, halaman tetap
> terbuka dan menampilkan empty/error state, bukan data.

Full change history for both repos: see `../idx-scraper/AUDIT.md`.

*Terakhir diperbarui: 2026-10-24 - migrasi SvelteKit selesai, app Next diarsipkan.*
