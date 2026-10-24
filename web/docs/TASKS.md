# Tugas migrasi SvelteKit

<!-- arsip: catatan historis; path dan perintah di dalamnya merujuk kondisi saat ditulis -->

Branch kerja: `dev` (`main` dan `dev` bertemu di `2d94705`). App Next di akar tetap utuh sebagai rujukan; app baru di `web/`.
Dev: `cd web && npm run dev` → :3100. Rehearsal produksi: `npm run build && npm run preview`. Sajian cutover lokal: `node deploy/serve.mjs 3000 build`.

## Status per fase

| Fase | Isi | Status |
|---|---|---|
| 0 | Spec disetujui, anggaran byte, kerangka PARITAS.md | selesai |
| 1 | Fondasi: shell, 19 rute placeholder, Tailwind, adapter-static, baseline ukur | selesai |
| 2 | Lapisan data: `api.ts`, `types.ts`, 5 modul lib, helper query, 48 hook | selesai |
| 3 | Pilot `/sectors` end-to-end | selesai |
| 4 | 13 rute statis | selesai |
| 5 | Chart: `LineArea.svelte`, `Bars.svelte`, 7 pemakaian | selesai |
| 6 | 5 rute dinamis dan workspace | selesai |
| 7 | Tes e2e dan audit paritas | selesai |
| 8 | Build produksi dan paket deploy | selesai |
| 9 | Cutover :3000 | lokal selesai; VPS menunggu pemilik |
| 10 | Audit sisa migrasi: halaman galat, bentuk URL `/flow`, koreksi ikon | selesai |
| 11 | Pembersihan sisa app Next: `.next`, launcher `:3000`, CI, README/AGENTS | selesai |

## Fase 1 — selesai 2026-10-24

Dikerjakan:

- `web/` dari `sv create` (SvelteKit 3.1.0, Svelte 5.57, Vite 8.3, TS 6).
- `adapter-static` dengan `fallback: 'index.html'`; `ssr = false`, `prerender = false` di `src/routes/+layout.ts`.
- Tailwind 4 lewat `@tailwindcss/vite`; `app/globals.css` (717 baris) diporting apa adanya ke `src/app.css`.
- Font: `@fontsource-variable/geist` dan `geist-mono`, dipetakan ke `--font-geist-sans` dan `--font-geist-mono`. Deviasi dari spec §6.5 (yang merencanakan `static/fonts` manual) karena berkas woff2 Next ber-hash dan tidak bisa dipetakan ulang.
- Shell: `Brand`, `NavList`, `Sidebar`, `Topbar`, `MobileNav` (drawer + focus trap), `ThemeToggle`, `MarketBadge`, `GlobalLastUpdated`, `Footer`, `CommandPalette`, `StubPage`.
- Skrip anti-FOUC di `src/app.html`; kunci `ml-theme` dan `ml-sidebar-collapsed` sama.
- 19 rute placeholder: 14 statis + 5 dinamis.
- Ikon dari `@lucide/svelte`. Nama yang dihapus di lucide 1.x dipetakan ke padanan geometri yang sama: `Filter`→`Funnel`, `History`→`RotateCcwClock`, `Waves`→`WavesHorizontal`, `Globe2`→`Earth`.

Gate fase 1:

- 19 rute membalas 200 dan judulnya benar. Lulus.
- Footer menempel di dasar viewport saat isi pendek, di 1440 dan 390. Lulus.
- Tanpa luber horizontal di 390 px pada 19 rute. Lulus.
- Kontras AA dua tema: rasio terendah 4,51:1 (`--neutral` di atas `--bg` mode terang). Lulus.
- Drawer: fokus masuk tombol tutup, Esc menutup dan mengembalikan fokus ke tombol menu, gulir halaman terkunci. Lulus.
- Palet: Ctrl+K, filter, Esc. Lulus.
- Tema bertahan setelah muat ulang, kelas terpasang sebelum hydration. Lulus.
- Byte terukur, baseline Next ada. Lulus, catatan di `docs/HASIL-UKUR.md`.

Belum di fase 1, sengaja:

- `GlobalLastUpdated` menampilkan keadaan memuat statis sampai hook data ada di fase 2.
- Palet hanya mencari halaman, belum emiten (butuh `searchStocks`).
- Anggaran shell 61,9 KB semula lewat target 60 KB. Diputuskan 2026-10-24: anggaran dinaikkan ke 65 KB (spec §2 dan §11.8), ikon nav dipertahankan demi paritas.

## Fase 2 — selesai 2026-10-24

Dikerjakan:

- `src/lib/types.ts` (1.414 baris) dan `format.ts`, `brokerType.ts`, `tickerDomains.ts` disalin apa adanya; komentar sesi `marketStatus.ts` yang rusak encoding di sumber ditulis ulang.
- `src/lib/api.ts`: `API_BASE` dari `import.meta.env.PUBLIC_API_BASE_URL` (fallback `http://localhost:8000`), `fetcher` menerima `AbortSignal`; sisanya sama dengan app Next.
- `src/lib/portfolio.svelte.ts`: satu `$state` modul untuk empat angka pemilik (sebelumnya tiap komponen punya salinan sendiri), `hydrate()` sekali saat hook pertama dipakai.
- `src/lib/query.svelte.ts`: cache per kunci, dedupe 1 detik, auto-refresh per entri, revalidate saat fokus/online, `keepPreviousData`, `mutateKey`, `mutateMatch`, abort saat pelanggan terakhir lepas.
- `src/lib/hooks.svelte.ts`: 48 hook, nama dan kunci sama dengan `lib/hooks.ts`; parameter yang bisa berubah diterima sebagai nilai atau getter.
- `GlobalLastUpdated` memakai `useMarketOverview` sungguhan; `LastUpdated.svelte` diporting (sesi bursa + jam backend, fallback jam browser).
- `CommandPalette` mencari emiten lewat `/api/search` (debounce 250 ms), hasil emiten tampil di atas halaman, Enter membuka `/stock/<kode>`.

Gate fase 2:

- `npm run check` 0 error 0 warning.
- Badge topbar menampilkan "Dimuat 24 Okt 2026 13.10.41" dari `/api/market/overview` nyata. Lulus.
- Palet: ketik `BBRI` → satu baris `/stock/BBRI`, Enter membuka halaman saham. Lulus.

## Fase 3 — selesai 2026-10-24

Dikerjakan:

- Komponen bersama: `Card` (`title` boleh string atau snippet), `InfoHint` (tooltip yang digeser agar tidak keluar layar), `Skeleton`, `EmptyState`, `ErrorState` (label tombol berubah jadi "Coba sekali lagi" bila percobaan terakhir > 10 detik), `FreshnessBadge` (tiga status, basis panel/indeks), `RegimeBanner` (ADX, DI, volatilitas, gerbang rezim), `SectorRotationTable` (kartu sektor + sparkline SVG sendiri).
- Halaman `/sectors`: banner rezim, rotasi sektor, peta sektor 6 kolom dengan heatmap `color-mix`, catatan kaki mapping sektor.

Gate fase 3 (dibandingkan langsung dengan `next start -p 3000`):

- Judul, subjudul, tiga heading kartu, enam label kolom tabel sama.
- 23 kartu rotasi dan 23 baris tabel di kedua app; nilai sel identik (Konglomerat +5,91% / 43,62 M / 8,12 Jt / WMPP +18,18% dan seterusnya).
- `scrollWidth` sama: 1432 di viewport 1440, 382 di 390 (tanpa luber horizontal).
- Tanpa error konsol di :3100.
- Tema terang tampil benar (latar terang, kartu putih, badge tetap terbaca).
- `npm run check` 0 error 0 warning.

Bukti tangkapan layar: `docs/bukti/fase3-next-sectors-1440.png`, `fase3-svelte-sectors-1440.png`, varian `-390` dan `-1440-light`.

## Fase 5 — selesai 2026-10-24

Dua komponen SVG menggantikan Recharts:

- `LineArea.svelte`: garis/area, kisi horizontal, label Y mengikuti lebar label terpanjang, label X dihitung dari perkiraan lebar teks (tidak bertumpuk, ujung kiri/kanan tidak terpotong), garis referensi, legenda HTML, tooltip kursor.
- `Bars.svelte`: batang tunggal berwarna per titik, batang bertumpuk, mode `normalize` (porsi 0–100%), garis nol, tooltip dengan `footer` untuk label tambahan.

Tiga bug ditemukan lewat tangkapan layar, bukan lewat `npm run check`:

1. Segmen path kedua dan seterusnya mulai dengan `L`, bukan `M` → garis RSI/Bollinger/MACD tidak tampil. Diperbaiki dengan menandai awal segmen per kelompok, bukan per indeks array.
2. Label X bertumpuk saat 476 titik data; sekarang jarak minimum dihitung dari panjang label.
3. Label Y terpotong di tepi kiri (`1,602.572` tampil `,602.572`); kolom label sekarang melebar sendiri sampai 104 px.

## Fase 4 gelombang A — selesai 2026-10-24

Rute: `/pantau`, `/screener`, `/faktor`, `/radar`, `/broker-activity`.

Komponen baru: `WatchlistTable`, `AlertRules`, `TelegramStatus`, `SmartMoneyWatchCard`, `SmartMoneyBanner`, `SmartMoneyPatternsBoard`, `SmartMoneyTrackRecordCard`, `ScreenerFactorsModal`, `BrokerActivityCard`, `BrokerFlowCard`, `FlowTimelineCard`, `TickerLogo`.

Paritas terukur terhadap `next start -p 3000` (viewport 1440): h1, daftar h2, header tabel, jumlah baris, jumlah kartu, dan `scrollWidth` identik di kelima rute; tanpa error konsol. Baris watchlist `/pantau` memilih chart dengan benar (`Technical — AADI`, 3 panel, 10 path bergaris).

`public/logos` (1002 berkas, 13,26 MB) disalin ke `web/static/logos` supaya `TickerLogo` menemukan manifest.

## Fase 4 gelombang B dan C — selesai 2026-10-24

Delapan rute terakhir, semuanya 13 rute statis kini lengkap:

- `/sentimen`: gauge suhu pasar, empat tile, breadth & aliran, akumulasi dan distribusi dengan panel rincian, bobot skor, catatan.
- `/rekomendasi`: gerbang rezim, `PortfolioStrip` (satu sumber state dengan panel rencana), `ClaimRecord`, papan kandidat dengan tiga tab, track record per horizon, lapisan skor.
- `/foreign`: posisi asing, tren harian (`Bars` warna per tanda + garis nol), daftar mover dua tab, `ForeignFlowCard` yang dipakai ulang fase 6.
- `/flow`: `FlowWorkspace` + pemilih emiten. Sejak fase 10 hanya bentuk path `/flow/<kode>`; `?code=` dihapus (Next juga tidak mendukungnya).
- `/jejak-sinyal`: tiga tab horizon, hasil beli/jual per rezim, tabel sinyal terbaru.
- `/`: hero IHSG dengan count-up, kesehatan data, suasana pasar, berita + modal, top gainers/losers, empat papan peringkat, sinyal dengan filter, chart teknikal.
- `/backtest`: form parameter lima strategi, `EquityCurveChart`, `RebalanceLedger`, lima tab hasil, tabel perbandingan biaya.
- `/keputusan`: `DecisionWorkspace code={null}` dan `PositionPlanPanel`.

Paritas terukur (1440) terhadap `next start -p 3000`: h1, daftar h2, header tabel, jumlah baris, jumlah kartu, `scrollWidth` identik di kedelapan rute; tanpa error konsol. `/` 12 kartu, `/rekomendasi` 25 kartu, `/jejak-sinyal` 40 baris di kedua app.

## Fase 6 — selesai 2026-10-24

Lima rute dinamis. Param dibaca lewat `page.params.code` di dalam `$derived`, semua hook menerima getter supaya berpindah emiten tanpa remount tetap memicu query baru.

- `/stock/[code]`: 15 kartu — smart money, rezim, chart teknikal, sinyal, aliran dana proxy, kepemilikan, arus asing, riwayat aliran, komposisi broker, aktivitas broker, event study, riwayat harga. Navigasi prev/next melingkar dari watchlist. Komponen baru: `HistoryTable`, `BrokerSummary`, `OwnershipCard`, `EventStudyCard`.
- `/dossier/[code]`: tujuh seksi (Profil, Valuasi, Faktor & Verdict, Arus Asing, Aktivitas Broker, Sentimen, Catatan Risiko), badge basi per seksi, unduh PDF.
- `/flow/[code]`: pembungkus `FlowWorkspace`.
- `/radar/[code]`: `SmartMoneyBanner` + track record, tautan silang ke detail teknikal dan arus asing.
- `/keputusan/[code]`: `DecisionWorkspace` dengan kode.

Paritas terukur (1440) terhadap `next start -p 3000`: h1, daftar h2, header tabel, jumlah baris (`/stock/BBCA` 26), jumlah kartu (15/7/3/2/8), judul halaman — identik di kelima rute; tanpa error konsol.

Reflow 390 px: 17 rute `scrollWidth` 382, `/keputusan` dan `/flow` 390 (tanpa scrollbar vertikal); tidak ada luber horizontal.

## Fase 7 — selesai 2026-10-24

Suite tes disalin dari app Next ke `web/e2e/` dengan baseURL `:3100`:

- `routes.spec.ts` — 14 rute statis balas 200 dan `h1` tampil (project desktop dan mobile-390).
- `layout-mobile.spec.ts` — 14 rute tidak luber horizontal di 390 px.
- `console.spec.ts` — `/`, `/rekomendasi`, `/pantau` tiga halaman tanpa galat konsol; galat jaringan diabaikan karena API bisa mati.

`npx playwright test` → **45 passed** (49,8 detik), jumlah tes sama dengan suite app Next.

Audit paritas 19 rute ada di `PARITAS.md` (tabel terukur: h1, h2, header tabel, baris, kartu, `scrollWidth`).

`@playwright/test@1.64.1` ditambahkan ke devDependencies `web/` supaya suite bisa dijalankan dari folder itu sendiri.

## Fase 8 — selesai 2026-10-24

Build produksi: `npm run build` → `web/build/`, 1097 berkas, 13,97 MB (13,26 MB
logo emiten). Tidak ada proses Node di server: `adapter-static` + `index.html`
sebagai fallback SPA.

Verifikasi terhadap hasil build, bukan dev server:

- `npm run preview` di :3100 (port sama dengan dev supaya CORS API tetap sah).
- `npx playwright test` → **45 passed** (28,2 detik, lebih cepat dari dev).
- `GET /` dan `GET /stock/BBCA` langsung dari URL → 200, bukan 404.
- Byte terkirim: lihat `HASIL-UKUR.md` — JS 74,5-116,0 KB, total 115,9-162,7 KB
  per rute; Next 401,2-418,0 KB JS.

Paket deploy:

- `web/docs/DEPLOY.md` — build, variabel `PUBLIC_API_BASE_URL` (inline saat
  build), CORS `IDX_API_CORS_ORIGINS`, urutan cutover, pemeriksaan pasca-deploy.
- `web/deploy/nginx.conf` — siap pakai: fallback `try_files`, cache immutable
  untuk `_app/immutable`, `no-cache` untuk `index.html`.
- `web/.env.example` — variabel build yang dibaca `api.ts`.

## Fase 9 — cutover lokal selesai 2026-10-24

`next start` di :3000 dihentikan, diganti sajian statis hasil build:

```bash
cd web
node deploy/serve.mjs 3000 build
```

Alasan :3000: CORS API hanya menerima `http://localhost:3000` dan
`http://localhost:3100` (`idx-scraper/src/idx_scraper/api/config.py:39`), jadi
cutover lokal harus dibuktikan di port yang terdaftar, bukan port lain.

Hasil verifikasi:

- `GET /`, `/sectors`, `/stock/BBCA`, `/dossier/BBCA`, `/flow/BBRI`,
  `/keputusan/BBRI` → 200 dengan `text/html` (SPA fallback bekerja untuk rute
  dinamis yang tidak punya berkas sendiri).
- Aset ber-hash → `Cache-Control: public, max-age=31536000, immutable`;
  `index.html` → `no-cache`; `/logos/*` → 604800 detik.
- Aset yang tidak ada di bawah `/_app/`, `/logos/`, `/fonts/` → 404, bukan
  `index.html`. Tanpa aturan ini browser menerima HTML sebagai JavaScript dan
  galat MIME muncul saat HTML basi menunjuk bundel lama.
- `HEAD /` → 200 dengan `Content-Length` benar.
- `E2E_BASE_URL=http://localhost:3000 npx playwright test` → **45 passed**
  (25,3 detik). Suite yang sama yang lulus di :3100 dan di app Next lama.
- Data nyata termuat lewat CORS :3000: dashboard menampilkan IHSG 5.439,26;
  `/stock/BBCA` 15 kartu dan 26 baris tabel; tanpa galat konsol.
- Tangkapan layar: `docs/bukti/fase9-3000-dashboard-gelap.png`,
  `-terang.png`, `fase9-3000-stock.png`.

Ikon tab (favicon): layout masih memakai logo Svelte bawaan `sv create`, dan
karena SSR mati `<link rel="icon">` baru muncul setelah hidrasi — tab tampil
tanpa ikon lebih dulu, lalu logo Svelte. Sekarang ikon Market Labs
(`app/icon.svg` di app Next) disalin ke `web/static/favicon.svg` dan dirujuk
statis dari `src/app.html`, jadi sudah ada sejak HTML pertama. Link di layout
dihapus supaya tidak ada dua permintaan. Verifikasi: `GET /favicon.svg` → 200
`image/svg+xml` 603 byte; satu elemen `link[rel=icon]` di `/` dan
`/stock/BBCA`; tidak ada lagi 404 `/favicon.ico`.

`:3100` tetap hidup sebagai cadangan (`npm run preview`). Dev harian:
`npm run dev` setelah mematikan preview, karena port dikunci `strictPort`.

Yang belum dikerjakan: cutover VPS (build dengan `PUBLIC_API_BASE_URL`, tambah
domain ke `IDX_API_CORS_ORIGINS`, arahkan root nginx ke `build/`).

Anggaran shell diputuskan 2026-10-24: naik dari 60 KB ke 65 KB gzip (spec §2,
§11.8). Shell terpasang 61,9-64,2 KB, jadi sekarang masuk anggaran. Ikon nav
dipertahankan; biayanya terukur 9,3 KB gzip untuk 14 ikon, dan membuangnya
akan melanggar sasaran paritas §2.1.

## Fase 10 — audit sisa migrasi, selesai 2026-10-24

Pemeriksaan ulang seluruh permukaan Next, bukan hanya rute yang sudah
dicentang: 43 komponen, 224 ekspor `lib/*.ts`, 48 hook beserta
`refreshInterval`, 7 endpoint, 63 selector CSS, 37 variabel CSS, `aria-label`
dan `role`, glyph ikon per berkas (63 pasang, dibandingkan lewat path SVG),
6 kunci localStorage, 1002 logo, grup menu sidebar, dan pintasan keyboard.
Hasil lengkap ada di `PARITAS.md` bagian "Audit sisa migrasi (fase 10)".

Temuan yang dikerjakan:

- `src/routes/+error.svelte` baru. Rute tak dikenal menampilkan halaman
  "Halaman tidak ditemukan" (copy `app/not-found.tsx`), error lain memakai
  copy `app/error.tsx`; tombol, aria-label, dan ThemeToggle sama.
- `FlowWorkspace` pindah ke bentuk URL path: `goto`, `action` form, dan chip
  saran memakai `/flow/<kode>`; pembacaan `?code=` di `/flow` dihapus.
- Dua ikon yang salah petakan dikoreksi: `CircleCheckBig` → `CircleCheck`
  (padanan `CheckCircle2`) dan `Building` → `BuildingComplex` (padanan
  `Building2`). Path SVG lama dan baru dibandingkan langsung.
- `web/e2e/galat-dan-flow.spec.ts` menambah 2 tes: halaman tidak ditemukan dan
  form `/flow` berpindah ke `/flow/<kode>`.

Deviasi yang diterima: `app/loading.tsx` tidak diport karena SPA tidak punya
suspense per rute; muat data ditangani skeleton di komponen. Biaya halaman
galat: 1,2 KB gzip pada muatan awal setiap rute (node `1.*.js`).

Verifikasi: `npm run check` 0 error 0 warning; `npm run build` sukses;
`E2E_BASE_URL=http://localhost:3000 npx playwright test` → **47 passed**;
suite lama app Next di akar (`npx playwright test` di `idx-web/`, baseURL
:3000) → **45 passed** terhadap build Svelte. Live: `/halaman-yang-tidak-ada`
dan `/stock/` menampilkan halaman tidak ditemukan; `/flow/BBRI` dan
`/flow?code=BBRI` masing-masing menampilkan workspace dan empty state.

## Fase 11 — pembersihan sisa app Next, selesai 2026-10-24

Dihapus (disetujui pemilik):

- `.next/` — 2.757 berkas, 1.373 MB artefak build Next basi.
- `_stop-web.flag`, `test-results/`, `logs/` di akar repo.
- `web/src/lib/assets/favicon.svg` — logo Svelte bawaan `sv create`, tidak
  dirujuk siapa pun; favicon aktif `web/static/favicon.svg`.

Diubah supaya tidak lagi menjalankan Next:

- `scripts/start-web.bat` — masuk ke `web/`, menyajikan `build/` lewat
  `node deploy/serve.mjs 3000 build`. Guard port, flag stop/restart, cadangan
  path node nvm, dan log launcher tetap.
- `scripts/restart-web.ps1` — dokumentasi disesuaikan (yang dihentikan adalah
  pemegang port 3000, bukan `next dev`), dan folder `logs/` dibuat sendiri
  karena tidak lagi ada di repo.
- `.github/workflows/ci.yml` — `working-directory: web`; `npm ci` →
  `npm run check` → `npm run build` → Playwright. Jalan pada push ke `main`
  dan `dev`, serta semua PR. Job `next build` di akar dihapus.
- `web/playwright.config.ts` — perintah `webServer` bisa diganti lewat
  `E2E_SERVER_CMD`; CI memakainya untuk menguji `deploy/serve.mjs 3100 build`.
- `web/vite.config.ts` — `envPrefix: ['VITE_', 'PUBLIC_']`. Tanpa ini
  `import.meta.env.PUBLIC_API_BASE_URL` selalu `undefined` (Vite hanya
  meng-inline `VITE_`), jadi setiap build produksi diam-diam memanggil
  `localhost:8000` dan instruksi `DEPLOY.md` tidak berefek.
- `web/e2e/routes.spec.ts` — tes rute menerima `h1` **atau** `ErrorState`
  (`role="alert"`). Rute yang datanya dari API mengembalikan ErrorState lebih
  dulu saat backend mati (sama seperti app Next), dan CI tidak punya backend.
- `README.md` dan `AGENTS.md` — ditulis ulang untuk SvelteKit; blok aturan Next
  yang ditulis ulang `next dev` dihapus.

Verifikasi:

- `npm run check` 0 error 0 warning; `npm run build` sukses.
- Launcher diuji tiga jalur: start bersih dengan `_restart-web.flag` (flag
  dihapus, :3000 hidup), `_stop-web.flag` (server berhenti dan tidak dinyalakan
  lagi), dan instance kedua (dilewati guard-port, tetap satu listener).
- :3000 dari launcher: `/` 200, `/flow/BBRI` 200, `/halaman-yang-tidak-ada` 200
  (fallback SPA), `/favicon.svg` 200, aset `/_app/immutable/*.js` yang tidak ada
  → 404.
- `npx playwright test` **47 passed** terhadap build yang disajikan launcher
  (:3000) dan **47 passed** terhadap `node deploy/serve.mjs 3100 build` (jalur
  CI).
- Kondisi CI (backend mati) direproduksi lokal: build dengan
  `PUBLIC_API_BASE_URL=http://localhost:9` lalu jalankan suite → **47 passed**,
  dan bundel memuat `localhost:9` (bukti `envPrefix` bekerja). Build
  dikembalikan ke bawaan setelah uji.

Catatan deviasi server: `vite preview` membalas 404 untuk rute tak dikenal
(tidak ada fallback SPA), sehingga tes halaman galat gagal di sana. Karena itu
CI memakai `deploy/serve.mjs` yang perilakunya sama dengan cutover; server
produksi wajib `try_files ... /index.html` (lihat `DEPLOY.md`).

## Aturan kerja

- Frontend produksi ada di `web/` (SvelteKit). Jangan jalankan `next dev` atau
  `next build`; app Next di akar hanya arsip rujukan paritas.
- :3000 dilayani `node deploy/serve.mjs 3000 build` lewat task `IDX-Web`
  (`scripts/start-web.bat`). `_stop-web.flag` menghentikan dan menahan server
  itu sampai flag dihapus; `_restart-web.flag` memaksa restart sekali.
- Jangan sentuh API, DB, scraper, atau job terjadwal.
- Hapus berkas atau branch hanya setelah konfirmasi pemilik.
