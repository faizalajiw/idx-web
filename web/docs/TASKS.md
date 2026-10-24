# Tugas migrasi SvelteKit

Branch kerja: `svelte`. App Next di akar tetap utuh; app baru di `web/`.
Dev: `cd web && npm run dev` → :3100. Rehearsal produksi: `npm run build && npm run preview`.

## Status per fase

| Fase | Isi | Status |
|---|---|---|
| 0 | Spec disetujui, anggaran byte, kerangka PARITAS.md | selesai |
| 1 | Fondasi: shell, 19 rute placeholder, Tailwind, adapter-static, baseline ukur | selesai |
| 2 | Lapisan data: `api.ts`, `types.ts`, 5 modul lib, helper query, 48 hook | selesai |
| 3 | Pilot `/sectors` end-to-end | belum |
| 4 | 13 rute statis | belum |
| 5 | Chart: `LineArea.svelte`, `Bars.svelte`, 7 pemakaian | belum |
| 6 | 5 rute dinamis dan workspace | belum |
| 7 | Tes e2e dan audit paritas | belum |
| 8 | Build produksi dan paket deploy | belum |
| 9 | Cutover :3000 | belum |

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
- Anggaran shell 61,9 KB vs target 60 KB: lewat 1,9 KB. Menunggu keputusan pemilik (naikkan ke 65 KB atau potong ikon).

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

## Aturan kerja

- Jangan jalankan `next build` di akar selama dev server :3000 hidup. Saat ini :3000 mati dan `_stop-web.flag` ada.
- Jangan sentuh API, DB, scraper, atau job terjadwal.
- Hapus berkas atau branch hanya setelah konfirmasi pemilik.
