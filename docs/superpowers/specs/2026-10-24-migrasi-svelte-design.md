# Migrasi idx-web ke SvelteKit: dokumen desain

<!-- arsip: catatan historis; path dan perintah di dalamnya merujuk kondisi saat ditulis -->

Tanggal: 2026-10-24
Status: draft untuk disetujui pemilik
Repo: `idx-web`. Kerja di subfolder `web/` di branch `svelte`; `main` tetap melayani :3000 sampai cutover.

## 1. Tujuan dan alasan

Website ini akan dipublish ke VPS. Sasaran akhirnya halaman yang ringan dan bisa dilayani tanpa proses Node, plus perawatan yang tidak bergantung pada churn Next.

Keadaan sekarang, terukur:

- Next 16.3.5 dipakai sebagai router dan bundler saja. Tidak ada `app/api`, tidak ada `"use server"`, tidak ada `generateMetadata`, tidak ada ISR, tidak ada middleware.
- 59 dari 68 file halaman/komponen ber-`"use client"`. Semua data diambil browser dari FastAPI lewat SWR.
- Berat terbesar bukan framework: `react-dom` 523,5 KB mentah, `recharts` (UMD, termasuk d3) 491,2 KB mentah.
- Build produksi pernah jalan (20 Okt 2026, exit 0, 21 rute ter-generate) tetapi hanya untuk verifikasi. Tidak ada yang pernah dilayani dari hasil build, angka byte per rute tidak pernah dicatat, dan artefaknya sudah tertimpa `next dev`.

Karena itu migrasi ini bukan pindah SSR ke SSR. Ini pindah router dan bundler, sekaligus membuang pustaka chart yang berat.

Hosting seluruh stack (API, Postgres, scraper) ke VPS adalah proyek terpisah dan di luar dokumen ini.

## 2. Sasaran yang bisa diukur

1. Paritas 19 rute: setiap elemen yang ada sekarang tetap ada (teks, kartu, kolom tabel, chip, tautan, tombol, ikon, badge status, empty/loading/error state, shortcut keyboard).
2. First-load JS per rute masuk anggaran, diukur setelah build produksi:
   - shell (semua rute): ≤ 65 KB gzip (semula 60 KB; dinaikkan 2026-10-24
     berdasarkan pengukuran, lihat §11.8)
   - halaman tabel/daftar: ≤ 120 KB gzip
   - halaman dengan chart: ≤ 180 KB gzip
3. First-load turun minimal 30% dibanding baseline Next yang diukur di fase 1 pada rute yang sama.
4. Nol dependensi chart, nol runtime React di bundel.
5. 45 tes e2e lama tetap lulus setelah disesuaikan, ditambah tes untuk shell, tema, dan anggaran byte.
6. Output build statis: nginx cukup, tanpa proses Node untuk web.
7. Perilaku backend (API, DB, scraper, job terjadwal) tidak berubah sama sekali.

## 3. Bukan sasaran

- Memindahkan API, Postgres, atau scraper ke VPS.
- Redesign visual. Ini port, bukan revamp. Tata letak, warna, copy, dan kepadatan tetap.
- Fitur, halaman, atau endpoint baru.
- Mengganti FastAPI, kontrak API, atau skema DB.
- SSR, SEO publik, autentikasi, multi-user.

## 4. Anti-sasaran (dianggap gagal walau teknis jalan)

1. Ada satu elemen UI hilang atau berpindah tanpa alasan, termasuk state kosong dan keadaan error.
2. First-load JS tidak turun minimal 30% dibanding baseline Next di rute yang sama.
3. Satu data yang sama diambil dua kali dalam satu halaman.
4. Cutover mengganggu job EOD, API, atau notifikasi.
5. Kode Svelte meniru pola React (state global besar, efek berantai) sehingga lebih sulit dirawat daripada yang sekarang.
6. Preferensi pengguna hilang, termasuk tema, state sidebar, dan empat angka portofolio di localStorage.

## 5. Batasan

- Dev di Windows, Node 24.22.1 (nvm), SvelteKit 3.1.x, Vite 8, Svelte 5.57, TypeScript 6 (minimum SvelteKit 3).
- Tailwind 4 lewat `@tailwindcss/vite`. Token dan komponen CSS di `app/globals.css` (717 baris) dipindah apa adanya, termasuk blok `@custom-variant dark`.
- Font Geist dan Geist Mono di-host sendiri. Tanpa Google Fonts saat runtime.
- CORS FastAPI hanya mengizinkan `localhost:3000` dan `localhost:3100`. App baru jalan di :3100 selama masa paralel, dan rehearsal produksi juga di :3100, bukan :4173.
- `next build` dilarang selama `next dev` hidup di :3000. Kalau baseline Next perlu build ulang, jalur resminya `_stop-web.flag` + `Start-ScheduledTask IDX-Web` (dipakai 20 Okt), dan itu butuh izin pemilik karena :3000 berhenti beberapa menit.
- App baru tidak menyentuh `.next`.
- Penghapusan berkas, branch, atau worktree menunggu konfirmasi pemilik.
- Repo `idx-web` yang dipakai, bukan repo baru, supaya riwayat dan tes tetap satu tempat.

## 6. Arsitektur target

### 6.1 Tata letak repo

App baru berdiri sendiri di subfolder `web/` di dalam repo `idx-web`:

```
idx-web/
  app/ components/ lib/ e2e/     <- app Next, tetap melayani :3000
  package.json                   <- tetap manifest Next sampai cutover
  web/
    package.json                 <- manifest SvelteKit, lockfile sendiri
    src/routes/                  <- 19 rute
    src/lib/                     <- api, types, hooks, query, charts
    static/fonts/
    e2e/, playwright.config.ts   <- tes app baru
    docs/                        <- PARITAS.md, HASIL-UKUR.md
```

Alasan: kedua app bisa hidup berdampingan tanpa saling menimpa, `npm run dev` di akar tetap berarti Next, dan `playwright.config.ts` akar tetap menguji :3000 sampai cutover. Saat cutover, skrip akar diarahkan ke `web/`, dan folder Next diarsipkan (tidak dihapus tanpa izin).

### 6.2 Kerangka

- SvelteKit 3 dengan `src/routes`, 19 rute, shell di `src/routes/+layout.svelte`.
- `adapter-static` dengan `fallback: 'index.html'` (SPA). `prerender = false` di root layout. Rute dinamis dilayani fallback, bukan prerender.
- Tidak memakai fitur experimental, termasuk remote functions dan async Svelte.

### 6.3 Lapisan data

- `src/lib/query.svelte.ts`: satu helper berbasis rune dengan semantik yang harus sama dengan SWR sekarang:
  - kunci cache per pasangan path dan parameter
  - dedupe permintaan yang sedang jalan
  - `refreshInterval` per hook
  - revalidate saat jendela kembali fokus
  - `mutate` setelah mutasi (watchlist, alert, jurnal)
  - abort saat komponen dilepas
  - hasil yang sama untuk error, loading, dan data kosong
- `src/lib/api.ts`: port dari `lib/api.ts` (177 baris), termasuk `ApiError` dan `parseError`. `API_BASE` dari `PUBLIC_API_BASE_URL`, default `http://localhost:8000`.
- `src/lib/types.ts`: port 1.414 baris tipe tanpa perubahan bentuk.
- Lima modul lib lain ikut diporting apa adanya: `format.ts` (71), `marketStatus.ts` (60), `portfolio.ts` (94), `brokerType.ts` (71), `tickerDomains.ts` (93).
- `src/lib/hooks/*.svelte.ts`: 48 hook yang sekarang ada (42 pembacaan `useSWR`, 6 mutasi `useCallback`), masing-masing jadi pembungkus tipis di atas helper. Nama, parameter, kunci, dan interval tidak berubah.

### 6.4 Chart

- Dua komponen SVG sendiri di `src/lib/charts/`:
  - `LineArea.svelte`: satu sampai tiga seri garis, area dengan isian gradien opsional, sumbu, grid, garis referensi, tooltip, legend.
  - `Bars.svelte`: satu sampai tiga seri batang, bertumpuk (`stackId`), nilai positif dan negatif, sumbu, tooltip, legend.
- Kebutuhan ini datang dari isi repo: `BrokerFlowCard` memakai batang bertumpuk tiga seri, `FlowTimelineCard` memakai area bergradien, `TechnicalChart` menumpuk dua area dan tiga garis pada satu sumbu (`ComposedChart`).
- Tanpa dependensi chart. Warna dari token `--chart-*` yang sudah ada, jadi ikut tema tanpa render ulang.
- Paritas chart dinilai visual (screenshot berdampingan, pemilik boleh menolak saat review fase) ditambah spot-check numerik domain sumbu pada satu set data contoh. Tidak dikejar tick-for-tick, karena Recharts memilih domain, jumlah tick, dan padding secara otomatis.

### 6.5 Shell, tema, dan aset

- Sidebar (lebar 15rem, mode rail 4rem), drawer ponsel, topbar, footer mengalir di akhir dokumen, command palette.
- Enam kunci localStorage dipertahankan nama dan encodingnya: `ml-theme`, `ml-sidebar-collapsed`, `ml-modal`, `ml-risk-pct`, `ml-open-positions`, `ml-exposure-pct`.
- Skrip anti-FOUC di `src/app.html`, bukan di komponen.
- Ikon lewat `lucide-svelte`, hanya ikon yang dipakai.
- Font: woff2 di `static/fonts`, `@font-face` di CSS, hanya weight yang dipakai sekarang. Tanpa paket tambahan.

## 7. Inventaris yang dipindah (terukur)

| Bagian | Ukuran | Catatan |
|---|---|---|
| Halaman | 19 rute (14 statis, 5 dinamis) | `app/**/page.tsx`, 5.510 baris total |
| Komponen | 43 berkas, 6.462 baris | termasuk 7 berkas chart, 1.547 baris |
| Lib | 8 berkas, 2.502 baris | `types.ts` 1.414, `hooks.ts` 522, `api.ts` 177, sisanya 389 |
| Data hook | 48 hook (42 `useSWR`, 6 mutasi) | semua pindah, nama dan parameter tetap |
| CSS | 717 baris | token, `.card`, `.chip`, `.data-table`, rangka responsif |
| Tes | 45 tes e2e, 3 spec | `routes.spec.ts`, `layout-mobile.spec.ts`, `console.spec.ts` |
| Ops | 2 skrip generik | `start-web.bat`, `restart-web.ps1` |

## 8. Rencana fase

Setiap fase punya gate yang harus lulus sebelum fase berikutnya. Estimasi dalam sesi kerja fokus.

### Fase 0: spec dan anggaran (0,5 sesi)

- Dokumen ini disetujui.
- Anggaran byte dikunci seperti §2.
- Daftar 19 rute dan pemetaan komponen per rute ditulis di `web/docs/PARITAS.md` sebagai kerangka.
- Gate: pemilik menyetujui dokumen. Belum ada kode.

### Fase 1: fondasi dan baseline (1 sesi)

- `sv create` di `web/`, SvelteKit 3, TypeScript, Tailwind 4.
- Shell lengkap: sidebar, drawer, topbar, footer, command palette kosong, tema, skrip anti-FOUC.
- 19 rute placeholder dengan judul yang benar.
- Baseline Next diukur lebih dulu: worktree bersih dengan `npm ci` sendiri (bukan symlink `node_modules`, karena percobaan 20 Okt gagal di Turbopack), lalu `next build`. Kalau cara itu gagal, jalur cadangan `_stop-web.flag` + build di akar, maksimal 10 menit, dan hanya setelah pemilik setuju (lihat §15).
- Build Svelte, lalu ukur byte per rute dari kedua app.
- Gate: 19 rute 200 di :3100 dan judulnya benar, footer static, tanpa luber di 390 px, kontras AA di dua tema, baseline dan angka Svelte tercatat di `web/docs/HASIL-UKUR.md`.

### Fase 2: lapisan data (1 sesi)

- Port `api.ts`, `types.ts`, lima modul lib, helper query, dan 48 hook.
- Gate: satu halaman menampilkan data nyata dari :8000, satu fetch per kunci, abort saat pindah rute, error dan empty state sama seperti sekarang.

### Fase 3: pilot satu rute (0,5 sesi)

- `/sectors` end-to-end: data, tabel, kartu, tes.
- Gate: paritas elemen dengan versi Next (daftar elemen DOM dan screenshot 1440/390), tes hijau. Kalau waktu pilot meleset lebih dari dua kali estimasi, rencana fase 4 sampai 6 direvisi sebelum lanjut.

### Fase 4: 13 rute statis (2,5 sampai 3,5 sesi)

- `/`, `/screener`, `/pantau`, `/faktor`, `/sentimen`, `/radar`, `/jejak-sinyal`, `/keputusan`, `/backtest`, `/foreign`, `/broker-activity`, `/rekomendasi`, `/flow` (isinya `FlowWorkspace`).
- `/rekomendasi` dikerjakan paling akhir karena paling berat (parameter portofolio dan gerbang rezim).
- Gate per rute: checklist paritas, tes e2e, tampilan 390 px tanpa luber, tidak ada elemen hilang, dan isi khas rute muncul (bukan hanya status 200).

### Fase 5: chart (1 sampai 1,5 sesi)

- `LineArea.svelte` dan `Bars.svelte` sesuai §6.4.
- Terapkan di 7 berkas: `BrokerActivityCard`, `BrokerFlowCard`, `EquityCurveChart`, `FlowTimelineCard`, `ForeignFlowCard`, `TechnicalChart`, dan chart di `/foreign`.
- Gate: data sama, sumbu dan domain sama pada data contoh, batang bertumpuk dan area bergradien bekerja, dua tema benar, tambahan JS dalam anggaran, screenshot berdampingan disetujui.

### Fase 6: 5 rute dinamis (1 sesi)

- `/stock/[code]`, `/dossier/[code]`, `/flow/[code]`, `/radar/[code]`, `/keputusan/[code]`, termasuk `DecisionWorkspace`.
- Gate: deep link, back/forward, parameter berubah tanpa memuat ulang seluruh halaman.

### Fase 7: tes dan audit paritas (1 sesi)

- 45 tes e2e dipindah ke `web/e2e`, selector memakai role dan label.
- Tes baru: shell, tema tanpa FOUC, footer, dan anggaran byte.
- Sumber utama paritas adalah checklist 19 rute di `web/docs/PARITAS.md`. Audit `docs/revamp-ui/RENCANA.md` §11 dipakai sebagai pelengkap (luber, target sentuh, kontras, console, tsc), bukan sebagai daftar elemen.
- Gate: semua tes hijau, checklist paritas 19 rute tuntas, daftar elemen hilang kosong.

### Fase 8: build produksi dan paket deploy (1 sesi)

- Build statis final, ukur byte per rute, catat di `web/docs/HASIL-UKUR.md`.
- Konfigurasi nginx contoh: SPA fallback, cache aset ber-hash 1 tahun, brotli/gzip, proxy `/api/` ke :8000 untuk nanti.
- Rehearsal produksi di :3100 memakai `vite preview --port 3100`, supaya CORS API tetap berlaku dan data benar-benar termuat.
- Gate: build dari nol menghasilkan 19 rute dengan isi benar, angka byte sesuai anggaran, rehearsal di :3100 memuat data.

### Fase 9: cutover lokal (1 sesi)

- Task `IDX-Web` menunjuk app baru di :3000. Mode yang dipakai sama seperti sekarang: dev server (`npm run dev` di `web/`), bukan server statis, supaya perilaku harian tidak berubah dan `restart-web.ps1` tetap bekerja.
- `start-web.bat` disesuaikan (cwd `web/`), log launcher tetap mencatat npm dan node.
- App lama diarsipkan, tidak dihapus tanpa izin.
- Gate: 24 jam jalan, 19 rute 200 dengan isi benar, EOD job tidak terganggu, `restart-web.ps1` masih bekerja.

Total: 10,5 sampai 12 sesi, sekitar 42 sampai 52 jam eksekusi, ditambah 30 sampai 60 menit review pemilik per fase.

## 9. Cara membuktikan "tidak ada elemen hilang"

- Untuk setiap rute, ekstrak daftar elemen dari halaman Next sekarang: teks judul, label kolom tabel, tombol, tautan, chip, badge, ikon bermakna, dan state kosong.
- Simpan sebagai checklist per rute di `web/docs/PARITAS.md`.
- Sesudah port, ekstrak ulang dari halaman Svelte dan bandingkan daftarnya, bukan mengandalkan ingatan.
- Screenshot 1440x900 dan 390x844 untuk setiap rute, sebelum dan sesudah, disimpan di `web/docs/bukti/`.
- Catatan penting: dengan SPA fallback, semua path membalas 200, termasuk path salah ketik. Karena itu setiap gate rute harus memeriksa judul atau isi khas rute, bukan hanya status HTTP.
- Rujukan tambahan: audit 16 rute di `docs/revamp-ui/RENCANA.md` §11.

## 10. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Detail chart tidak sama (skala, tick, tooltip) | Paritas gagal, pengguna melihat angka berbeda | Batasi ke bentuk yang ada, domain sama pada data contoh, screenshot pembanding, pemilik menyetujui |
| Semantik SWR (dedupe, fokus, interval) tidak persis sama | Fetch ganda, data basi, beban API naik | Helper diuji unit sebelum dipakai 48 hook, pilot satu rute lebih dulu |
| Selector e2e bergantung struktur React | 45 tes merah, waktu habis untuk perbaikan | Tes memakai role dan label, dijalankan setiap fase |
| SvelteKit 3 baru rilis 1 Oktober 2026 | Bug framework di tengah jalan | Pin versi minor, tanpa fitur experimental, catat versi di README |
| Byte tidak turun sesuai anggaran | Tujuan utama gagal | Chart SVG, code splitting per rute, ukur tiap fase bukan di akhir |
| Port kehilangan detail UI | Anti-sasaran nomor 1 | Checklist DOM per rute, screenshot berdampingan |
| Waktu fase 4 melar | Jadwal mundur | Pilot fase 3 sebagai kalibrasi, rute dikerjakan satu per satu dengan gate |
| Baseline build mengganggu :3000 | Web mati beberapa menit | Worktree bersih dengan `npm ci` lebih dulu, jeda hanya jalur cadangan dan butuh izin |

## 11. Keputusan yang sudah diambil (bisa dikoreksi pemilik)

1. SvelteKit 3 dengan `adapter-static` (SPA), bukan `adapter-node`.
2. App baru di subfolder `web/`, app Next tetap di akar sampai cutover.
3. Tanpa pustaka chart, memakai dua komponen SVG sendiri yang mendukung batang bertumpuk, area bergradien, dan beberapa seri.
4. Helper query sendiri, tanpa TanStack Query.
5. Font di-host sendiri di `static/fonts`, hanya weight yang dipakai.
6. Enam kunci localStorage tidak berubah supaya preferensi pengguna tidak hilang.
7. Cutover :3000 memakai dev server seperti sekarang; rehearsal produksi di :3100 memakai `vite preview`.
8. **Anggaran shell dinaikkan dari 60 KB ke 65 KB gzip** (keputusan pemilik,
   2026-10-24). Dasar pengukuran: shell terpasang 61,9-64,2 KB, dan 33,2 KB di
   antaranya runtime SvelteKit 3 yang tidak bisa dipotong. Satu-satunya cara
   masuk 60 KB adalah membuang ikon menu, yang melanggar sasaran §2.1 (semua
   ikon tetap ada): percobaan build menunjukkan 14 ikon nav berbiaya 9,3 KB
   gzip (112,7 KB jadi 103,4 KB pada berkas bersama). Paritas UI dipilih di
   atas angka anggaran.

## 12. Yang diserahkan ke pelaksana

- Struktur folder komponen dan penamaan berkas.
- Gaya penulisan runes dan organisasi state per halaman.
- Cara mengukur byte (log keluaran Vite atau visualizer).
- Detail implementasi SVG: pembangun path, skala, jumlah tick.
- Urutan rute di dalam fase 4 selain `/rekomendasi` yang terakhir.

## 13. Definisi selesai

- 19 rute membalas 200 di app baru dan isi khas tiap rute muncul, dengan paritas elemen yang terbukti lewat checklist dan screenshot.
- Semua tes hijau: 45 tes lama yang disesuaikan ditambah tes shell, tema, dan anggaran.
- Anggaran byte tercapai, penurunan minimal 30% terhadap baseline tercatat di `web/docs/HASIL-UKUR.md`.
- `start-web.bat`, log launcher, dan task `IDX-Web` menunjuk app baru.
- `next`, `react`, `react-dom`, dan `recharts` tidak ada lagi di dependensi app yang dilayani.
- App lama diarsipkan, tidak dihapus tanpa izin.

## 14. Di luar dokumen ini

- Hosting ke VPS: nginx, TLS, systemd, Postgres, scraper, dan risiko IP datacenter diblokir. Dibahas di spec terpisah saat waktunya.
- P7 prediktif tetap berjalan sesuai roadmap dan tidak bergantung pada migrasi ini.

## 15. Pertanyaan terbuka untuk pemilik

1. Kalau pengukuran baseline tidak bisa dilakukan di worktree bersih (misalnya `npm ci` ikut gagal), apakah :3000 boleh dimatikan sebentar lewat `_stop-web.flag`, maksimal 10 menit, di luar jam pemakaian?

## Lampiran: angka dasar

| Bahan | Angka |
|---|---|
| Berkas `.ts`/`.tsx` | 76 berkas, 14.474 baris |
| Halaman | 19 (14 statis, 5 dinamis) |
| Komponen | 43 berkas, 6.462 baris |
| Hook data | 48 (42 `useSWR`, 6 mutasi) |
| Chart | 7 berkas, 1.547 baris, tipe line, area, dan bar (termasuk tumpuk dan gradien) |
| `react-dom` production | 523,5 KB mentah |
| `recharts` UMD | 491,2 KB mentah |
| Tes e2e | 45 tes, 3 spec |
| Runtime Svelte 5 (publikasi resmi) | sekitar 3 KB gzip |
| React 19 + ReactDOM (publikasi resmi) | sekitar 45 KB gzip |
