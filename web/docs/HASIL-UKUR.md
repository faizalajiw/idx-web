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

## Selisih

| Ukuran | Next | SvelteKit | Selisih |
|---|---|---|---|
| JS | 401,2–418,0 KB | 61,9–62,5 KB | turun 84,5–85,2% |
| CSS | 12,8 KB | 8,3 KB | turun 35% |
| Font | 51,8 KB | 29,0 KB | turun 44% |

## Catatan penting

1. Angka SvelteKit di atas adalah **batas bawah**, bukan hasil akhir: 19 rute masih
   placeholder. Komponen halaman, hook data, dan chart ditambahkan di fase 2–6.
   Ukur ulang tiap fase; angka final dicatat di fase 8.
2. Perbandingan belum setara isi. Yang setara saat ini hanya shell (sidebar,
   topbar, drawer, footer, palet, tema), dan itu turun dari 401 KB ke 62 KB.
3. Anggaran shell di spec §2 adalah ≤60 KB; hasil 61,9 KB berarti **lewat 1,9 KB**.
   Penyebabnya runtime SvelteKit 3 (33,2 KB) yang tidak bisa dipotong, bukan kode
   aplikasi. Usul: naikkan anggaran shell ke 65 KB, atau potong ikon nav sampai
   dua. Menunggu keputusan pemilik.
4. Recharts tidak lagi dimuat di mana pun. React dan react-dom tidak ada di bundel.
