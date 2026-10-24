# Hasil ukur: Next vs SvelteKit

Tanggal: 2026-10-24
Mesin: Windows, Node 24.22.1, Chromium headless (Playwright 1.64.1), layar 1440x900.

## Metode

- Setiap rute dimuat di konteks browser baru (cache kosong), `transferSize` dari
  Resource Timing dijumlahkan: `.js`, `.css`, dan `.woff2`.
- Angka JS adalah byte terkirim (gzip dari server), bukan ukuran mentah.
- Build Next: `next build` di akar repo, lalu `next start -p 3000`, tunggu 2,5 detik
  per rute (SWR memuat data setelah render).
- Build SvelteKit: `npm run build` di `web/`, lalu `npm run preview` di :3100.
- :3000 dihentikan lewat `_stop-web.flag` + task `IDX-Web` sebelum `next build`.

## Baseline Next (halaman penuh, data nyata)

| Rute | JS (KB gzip) | CSS | Font | Total |
|---|---|---|---|---|
| `/` | 401,2 | 12,8 | 51,8 | 465,8 |
| `/sectors` | 410,9 | 12,8 | 51,8 | 475,4 |
| `/stock/BBCA` | 418,0 | 12,8 | 51,8 | 482,5 |
| `/dossier/BBCA` | 404,7 | 12,8 | 51,8 | 469,3 |
| `/keputusan/BBRI` | 401,2 | 12,8 | 51,8 | 465,8 |

Tiga belas rute statis lain berada di 401,2 KB JS karena semuanya berbagi chunk
yang sama. Rentang seluruh 19 rute: JS 401,2–418,0 KB.

## SvelteKit fase 1 (shell + halaman placeholder)

| Rute | JS (KB gzip) | CSS | Font | Total |
|---|---|---|---|---|
| 14 rute statis | 61,9 | 8,3 | 29,0 | 99,2 |
| `/stock/[code]`, `/dossier/[code]` | 62,5 | 8,3 | 29,0 | 99,7 |
| `/flow/[code]`, `/radar/[code]`, `/keputusan/[code]` | 62,1 | 8,3 | 29,0 | 99,3 |

Isi JS: runtime Svelte 18,3 + runtime SvelteKit 14,9 + node layout 8,0 +
entry dan chunk kecil sisanya. Ikon (`@lucide/svelte`) ikut ter-tree-shake ke
dalam node layout, tidak ada chunk terpisah.

## SvelteKit fase 2 (lapisan data: api + 48 hook + palet emiten)

| Rute | JS (KB gzip) | CSS | Font | Total |
|---|---|---|---|---|
| 14 rute statis | 64,2 | 8,6 | 29,0 | 101,8 |
| `/stock/[code]`, `/dossier/[code]` | 64,8 | 8,6 | 29,0 | 102,4 |

Kenaikan dari fase 1 (+2,3 KB JS, +0,3 KB CSS) berasal dari lapisan data yang
memang dipakai shell di semua rute: `api.ts`, `query.svelte.ts`, `hooks.svelte.ts`,
`format.ts`, `portfolio.svelte.ts`, dan pencarian emiten di palet.

## SvelteKit fase 8 (build produksi, semua rute lengkap)

Diukur dari `npm run build` + `npm run preview` di :3100, data nyata, konteks
browser baru per rute.

| Rute | JS (KB gzip) | CSS | Font | Total |
|---|---|---|---|---|
| `/` | 98,4 | 12,4 | 51,9 | 162,7 |
| `/stock/BBCA` | 116,0 | 12,4 | 29,0 | 157,4 |
| `/pantau` | 88,7 | 12,4 | 51,9 | 153,0 |
| `/screener` | 88,4 | 12,4 | 29,0 | 129,9 |
| `/backtest` | 92,6 | 12,4 | 29,0 | 134,0 |
| `/rekomendasi` | 92,2 | 12,4 | 29,0 | 133,6 |
| `/broker-activity` | 90,6 | 12,4 | 29,0 | 132,0 |
| `/flow` | 87,0 | 12,4 | 29,0 | 128,4 |
| `/flow/BBRI` | 87,1 | 12,4 | 29,0 | 128,5 |
| `/sectors` | 86,6 | 12,4 | 29,0 | 128,1 |
| `/foreign` | 83,1 | 12,4 | 29,0 | 124,5 |
| `/radar/BBCA` | 83,2 | 12,4 | 29,0 | 124,6 |
| `/radar` | 81,6 | 12,4 | 29,0 | 123,0 |
| `/sentimen` | 81,2 | 12,4 | 51,9 | 145,5 |
| `/keputusan/BBRI` | 79,9 | 12,4 | 29,0 | 121,4 |
| `/keputusan` | 79,7 | 12,4 | 29,0 | 121,1 |
| `/jejak-sinyal` | 78,7 | 12,4 | 29,0 | 120,1 |
| `/faktor` | 76,6 | 12,4 | 29,0 | 118,0 |
| `/dossier/BBCA` | 74,5 | 12,4 | 29,0 | 115,9 |

Rentang: JS **74,5-116,0 KB**, total **115,9-162,7 KB**.

## SvelteKit fase 10 (setelah halaman galat)

Fase 10 menambah `+error.svelte`. Node galat dimuat bersama shell di setiap
rute, jadi seluruh angka naik tipis. Diukur ulang dengan metode yang sama
(`npm run build`, `npm run preview` :3100, konteks baru per rute):

| Rute | JS (KB gzip) | CSS | Font | Total |
|---|---|---|---|---|
| `/` | 99,2 | 12,4 | 51,9 | 163,5 |
| `/stock/BBCA` | 116,9 | 12,4 | 29,0 | 158,3 |
| `/pantau` | 89,6 | 12,4 | 51,9 | 153,9 |
| `/screener` | 89,3 | 12,4 | 29,0 | 130,7 |
| `/backtest` | 93,5 | 12,4 | 29,0 | 134,9 |
| `/rekomendasi` | 93,0 | 12,4 | 29,0 | 134,5 |
| `/broker-activity` | 91,5 | 12,4 | 29,0 | 132,9 |
| `/flow` | 87,7 | 12,4 | 29,0 | 129,1 |
| `/flow/BBRI` | 88,0 | 12,4 | 29,0 | 129,4 |
| `/sectors` | 87,4 | 12,4 | 29,0 | 128,9 |
| `/foreign` | 84,0 | 12,4 | 29,0 | 125,4 |
| `/radar/BBCA` | 84,1 | 12,4 | 29,0 | 125,5 |
| `/radar` | 82,5 | 12,4 | 29,0 | 123,9 |
| `/sentimen` | 82,1 | 12,4 | 51,9 | 146,4 |
| `/keputusan/BBRI` | 80,8 | 12,4 | 29,0 | 122,3 |
| `/keputusan` | 80,6 | 12,4 | 29,0 | 122,1 |
| `/jejak-sinyal` | 79,6 | 12,4 | 29,0 | 121,0 |
| `/faktor` | 77,5 | 12,4 | 29,0 | 118,9 |
| `/dossier/BBCA` | 75,4 | 12,4 | 29,0 | 116,8 |

Rentang: JS **75,4-116,9 KB**, total **116,8-163,5 KB** — naik 0,8-0,9 KB per
rute dari tabel fase 8. Angka yang berlaku sekarang adalah tabel fase 10;
tabel fase 8 disimpan sebagai riwayat sebelum halaman galat ada. Selisih
terhadap Next tetap turun 70-82% (JS) dan 65-76% (total).

## Selisih

| Ukuran | Next | SvelteKit | Selisih |
|---|---|---|---|
| JS | 401,2-418,0 KB | 75,4-116,9 KB | turun 70-82% |
| CSS | 12,8 KB | 12,4 KB | turun 3% |
| Font | 51,8 KB | 29,0-51,9 KB | sama atau turun 44% |
| Total | 465,8-482,5 KB | 116,8-163,5 KB | turun 65-76% |

Selisih per rute ditentukan komponen yang dimuat rute itu: `/stock/BBCA`
menarik semua kartu emiten (chart, aliran, broker, kepemilikan, event study),
`/dossier/BBCA` hanya renderer seksi generik.

## Catatan penting

1. Shell (sidebar, topbar, drawer, footer, palet, tema) plus lapisan data
   tetap ±62-64 KB seperti fase 2; sisanya kode rute yang dimuat sesuai
   kebutuhan. Karena SPA memecah per rute, tidak ada rute yang membayar kode
   rute lain.
2. Anggaran shell dinaikkan ke **≤65 KB** gzip (keputusan pemilik 2026-10-24,
   spec §2 dan §11.8). Shell terpasang 61,9-64,2 KB, jadi masuk anggaran baru;
   33,2 KB di antaranya runtime SvelteKit 3 yang tidak bisa dipotong.
3. Biaya ikon nav terukur: 14 ikon sidebar = **9,3 KB gzip**. Percobaan build
   dengan seluruh item nav memakai satu ikon: berkas bersama tiga rute turun
   dari 112,7 KB / 34 berkas ke 103,4 KB / 22 berkas. Karena membuang ikon
   melanggar sasaran paritas (§2.1), anggaran yang dinaikkan, bukan ikonnya
   yang dipotong. Setelah halaman galat ditambahkan (fase 10), himpunan yang
   sama berukuran 113,6 KB / 36 berkas.
4. Recharts tidak lagi dimuat di mana pun. React dan react-dom tidak ada di
   bundel. Ukuran total `build/` 13,97 MB, 13,26 MB di antaranya logo emiten.
5. Angka di atas byte terkirim (gzip), bukan ukuran mentah di disk.