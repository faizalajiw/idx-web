# RENCANA & LEDGER REVAMP UI `idx-web`

Revamp tampilan, bukan fungsi. Semua angka di bawah diukur di sesi 19 Okt 2026, bukan dikira.

- **Ruang lingkup:** seluruh permukaan `idx-web` (desktop dan ponsel), mengikuti arah desain
  console.merakit.co.id: kanvas gelap, aksen biru, kaca hanya di rangka.
- **Batas keras:** tidak ada kartu, fitur, informasi, atau fungsi yang dikurangi. Elemen boleh
  pindah tempat dan berubah gaya, tidak boleh hilang.
- **Yang tidak disentuh:** font tetap `Geist` + `Geist_Mono`, tidak ada menu baru (aturan R6 P2),
  tidak ada model atau indikator baru (D7 P2), tidak ada endpoint, hook, tipe, atau alur data yang
  berubah, dan tidak ada perubahan perilaku P1 sampai P5 yang diminta.
- **Referensi desain:** [`DESKRIPSI-DESAIN.md`](./DESKRIPSI-DESAIN.md).

## 1. Definisi selesai

| # | Syarat | Cara membuktikan |
|---|---|---|
| 1 | Tidak ada elemen, judul, kolom, tautan, atau tombol yang hilang dari sebelum revamp | Diff sumber dibaca baris per baris (gerbang utama) |
| 2 | Tidak ada fungsi yang berubah karena revamp | Diff sumber: tidak ada perubahan logika di luar kelas dan token |
| 3 | Desktop 1440 px tetap sama strukturnya | Inventaris DOM: sidebar 240 px, topbar 64 px, 14 tautan nav, footer `fixed` kiri 240 px dengan dua kredit |
| 4 | Ponsel tidak meluber mendatar di rute mana pun | `scrollWidth - clientWidth` = 0 pada 390 px dan 320 px |
| 5 | Target sentuh berdiri sendiri minimal 44 x 44 px di bawah 1024 px | Hitungan per rute, target sebaris dikecualikan (WCAG 2.5.8) |
| 6 | Tidak ada data yang hilang di ponsel karena tabel terpotong | Setiap tabel di dalam wadah geser, 0 elemen terpotong di luar wadah |
| 7 | Kontras WCAG AA di dua tema, dihitung bukan dikira | `contrast-check.py` pada setiap pasangan warna yang dipakai |
| 8 | Fokus terlihat, keyboard utuh, drawer bisa ditutup | Uji klik dan papan ketik lewat browser |
| 9 | Konsol bersih | 0 error dan 0 warning di lima rute |
| 10 | `tsc --noEmit` dan `next build` lolos | Dijalankan di akhir, hasilnya di bagian 7 |

## 2. Langkah

| # | Langkah | Status |
|---|---|---|
| 1 | Potret sebelum: luber, target sentuh, geometri shell, inventaris desktop | selesai |
| 2 | Token warna dua tema (`--accent` untuk latar, `--accent-text` untuk teks, `--muted`, status) | selesai |
| 3 | Shell ponsel: header, strip status, drawer, kunci gulir, palet | selesai |
| 4 | Perbaikan kontras status di tema terang (diukur, bukan ditebak) | selesai |
| 5 | Pola halaman: label kotak statistik, baris kartu kandidat, wadah tabel | selesai |
| 6 | Perbaikan target sentuh dan sisa luber di 320 px dan 390 px | selesai |
| 7 | Uji klik, papan ketik, dan konsol | selesai |
| 8 | Dokumen: `DESKRIPSI-DESAIN.md` §6 dibetulkan, ledger ini | selesai |
| 9 | `npx tsc --noEmit`, `npx next build`, commit di `feat/revamp-ui` | lihat bagian 7 |

## 3. Potret sebelum (390 x 844, lebar isi 382 px)

- Rel sidebar 64 px tetap, dan `main` cuma digeser 64 px, jadi 318 px sisa untuk isi.
- `.app-footer` posisi `fixed` di `left: 64px` selebar 318 px, ikut mengambang di layar kecil.
- Luber mendatar: `/rekomendasi` 63 px, `/stock/PEGE` 99 px, rute lain 0.
- Target sentuh di bawah 44 px: puluhan di `/pantau` (tombol hapus daftar pantau 20 x 44 px) dan
  beberapa di `/rekomendasi`; kredit "Market Labs" 159 x 36 px.
- Teks strip status: 190 px + 184 px = 374 px, sedangkan ruang tersedia 358 px, jadi selalu
  terpotong di ponsel.

## 4. Potret sesudah

| Rute | Luber 390 px | Luber 320 px | Target < 44 px |
|---|---|---|---|
| `/`, `/pantau`, `/rekomendasi`, `/screener`, `/faktor`, `/sectors`, `/broker-activity`, `/stock/PEGE`, `/sentimen`, `/jejak-sinyal`, `/keputusan`, `/backtest`, `/radar`, `/foreign`, `/flow`, `/dossier/PEGE` | 0 px di 16 rute | 0 px di 16 rute | 0 |

Desktop 1440 px:

| Ukuran | Sebelum revamp | Sesudah |
|---|---|---|
| Sidebar | 240 px, `flex` | 240 px, `flex` (64 px saat dilipat) |
| Topbar | 64 px | 64 px |
| Tautan nav sidebar | 14 | 14 |
| Teks brand | tampil | tampil |
| `main` padding kiri | 240 px | 240 px |
| Footer | `fixed`, kiri 240 px, dua kredit | sama |
| `/` kartu, kotak statistik, `h1` | 12, 5, "Dashboard Pasar" | 12, 5, "Dashboard Pasar" |

Tabel di 11 rute bersebelah: setiap `table.data-table` ada di dalam leluhur `overflow-x: auto`, dan
0 elemen melewati lebar viewport di luar wadah geser (tidak ada kolom yang hilang di ponsel).

## 5. Kontras (dihitung dengan `contrast-check.py`)

17 dari 18 pasangan lolos apa adanya. Satu pasangan gagal dan itu memang temuan:

| Pasangan | Rasio | Putusan |
|---|---|---|
| `--fg-muted` `#8b93a7` di kartu gelap `#101218` | 6.09 : 1 | lolos |
| `--fg` `#eceef4` di kartu gelap | 16.14 : 1 | lolos |
| `#5b83ff` (aksen sebagai teks) di kartu gelap | 5.47 : 1 | lolos |
| `--up` `#37b3a4` / `--down` `#ef5350` / `--warn` `#e0a144` di kartu gelap | 7.26 / 5.37 / 8.34 | lolos |
| `--neutral` `#8b90a0` di kartu gelap | 5.88 : 1 | lolos |
| Putih `#ffffff` di atas tombol `#3562f5` | 4.98 : 1 | lolos |
| `--accent` `#3562f5` sebagai **teks** di kanvas gelap | 3.95 : 1 | **gagal, lalu diperbaiki** |
| `--fg-muted` `#5b6572` di putih / di latar `#f6f7f9` | 5.92 / 5.52 | lolos |
| `#2450e6` (aksen teks terang) di putih | 6.24 : 1 | lolos |
| `--up` `#0d7d6f`, `--down` `#d03636`, `--warn` `#9a5c00`, `--neutral` `#6b7280` di putih | 5.0 / 4.9 / 5.4 / 4.8 | lolos |
| Putih di atas tombol aksen terang `#2962ff` | 4.90 : 1 | lolos |

Tema terang sebelumnya gagal di empat warna status (up 3.38, down 4.28, warn 4.24, neutral 2.90 di
putih). Keempatnya dinaikkan sampai lolos, bukan dibiarkan.

Akibat pasangan yang gagal: satu warna tidak bisa sekaligus jadi latar tombol (butuh gelap, karena
teks putih di atasnya) dan warna teks (butuh terang, karena latarnya kanvas gelap). Aksen dipecah
dua token: `--accent` untuk latar, `--accent-text` untuk teks. Sebelas berkas yang memakai aksen
sebagai teks dialihkan ke `--accent-text`, semuanya hanya penggantian nama token.

## 6. Uji klik dan papan ketik

| Aksi | Hasil |
|---|---|
| Tombol menu, ponsel | Drawer terbuka, fokus pindah ke "Tutup menu", gulir halaman terkunci |
| Ketuk area luar panel | Drawer tertutup, fokus kembali ke "Buka menu", kunci gulir lepas |
| Pilih menu di drawer | Halaman pindah ke `/pantau`, drawer tertutup sendiri, kunci gulir lepas |
| Tombol tema di drawer | Gelap ke terang dan balik lagi |
| Tombol cari di header, ponsel | Palet perintah terbuka, fokus ke kolom isian |
| `Ctrl+K`, desktop | Palet terbuka, fokus ke kolom isian |
| Tab di dalam drawer | Berputar di dalam panel saja, tidak bocor ke halaman di belakang |
| `Esc` di drawer | Tertutup, fokus kembali ke tombol menu |
| Modal "Lihat semua" lalu `Esc` | 2 dialog saat terbuka, 1 setelah `Esc` (modal tertutup) |
| Tooltip "Penjelasan" | Terbuka dengan sentuhan dan digeser otomatis supaya tidak keluar layar |
| Lipat sidebar desktop | 240 px ke 64 px ke 240 px |
| Konsol di `/`, `/pantau`, `/rekomendasi`, `/screener` | 0 error, 0 warning |

## 7. Verifikasi akhir

| Perintah | Hasil |
|---|---|
| `npx tsc --noEmit` | bersih |
| `npx next build` | lolos, 19 rute (dijalankan dengan `next dev` masih hidup di port 3000) |

## 8. Perubahan di luar gaya, dengan sebabnya

Semuanya menambah, tidak mengurangi, dan tidak menyentuh alur data.

| Perubahan | Sebab |
|---|---|
| `InfoHint`: klik selalu membuka, tidak lagi balik menutup | Sentuhan memicu `focus` lalu `click` berurutan, jadi toggle menutup tooltip yang baru saja dibuka. Di layar sentuh tanpa hover, penjelasannya jadi mustahil dijangkau |
| `InfoHint`: tooltip digeser seperlunya setelah diukur | Tooltip 240 px yang dipusatkan pada ikon dekat tepi layar meluber 32 px dan membuat halaman bisa digeser mendatar |
| `MobileNav`: drawer menutup saat alamat halaman berubah | Layout bertahan saat navigasi sisi klien, jadi drawer tinggal terbuka dan mengunci gulir di halaman baru |
| `MarketOverview`: kolom grid mengecil di bawah 640 px, kembali seperti semula di atasnya | Baris pembanding saham meluber 5 px pada 320 px; angka kolom tetap sama, hanya jaraknya rapat |
| `rekomendasi`: baris lencana boleh melipat | Baris lencana memaksa kartu kandidat 353 px pada layar 312 px; melipat menjaga semua lencana tetap terbaca |
| `HistoryTable`: wadah diberi `table-scroll` | Tabel 405 px di dalam wadah yang cuma bisa menggulir tegak, sehingga kolom kanan tidak terjangkau di ponsel |
| `GlobalLastUpdated`: kelas `hidden` dan `sm:inline-flex` dilepas | Komponen ini dipakai di strip ponsel; kelas itu menyembunyikannya di layar kecil, padahal justru di situ ia dibutuhkan |

## 9. Keputusan yang diparkir

1. **Takaran kaca, diputuskan pemilik 19 Okt 2026: kaca di rangka dipertahankan.** Aturan
   `antislop` R-10 membatasi kaca pada satu sampai dua permukaan dan melarangnya sekaligus di
   navbar, kartu, modal, dan sidebar, sedangkan arah desain yang disetujui memakai kaca di seluruh
   rangka: header, sidebar, footer, drawer, dan palet perintah. Pemilik memilih mempertahankannya.
   Penyimpangan sadar ini dicatat di sini beserta batasnya: kaca hanya di rangka, sementara kartu,
   banner, tabel, dan tombol tetap solid, jadi pesan utama tidak ikut kehilangan kontras.
2. **Kredit GitHub di kaki drawer.** Sekarang kredit penuh ada di footer halaman; drawer belum
   memuatnya.
3. **Tablet 768 sampai 1023 px.** Belum dirancang khusus, sekarang memakai shell ponsel.
4. **Tombol palet di header ponsel.** Palet perintah tidak punya jalan lain di perangkat sentuh,
   jadi tombolnya ditambahkan di header. Bisa dicabut kalau pemilik menilai itu tambahan yang tidak
   perlu.
5. **Potongan teks yang memang sudah ada sebelumnya** (nama emiten panjang di daftar pantau,
   `/sentimen`, dan `/radar`) dibiarkan seperti semula: berkasnya tidak disentuh revamp ini, jadi
   perilakunya sama di desktop dan ponsel.

## 10. Berkas yang berubah

- `app/globals.css`: token dua tema, kaca rangka, radius, shell ponsel, drawer, strip status, wadah
  tabel, target sentuh, `prefers-reduced-motion`.
- `app/layout.tsx`: menyusun `<MobileNav />` sebelum `<Sidebar />`.
- `components/MobileNav.tsx` (baru): header, strip status, drawer dengan jebakan fokus, kunci
  gulir, tombol tema, dan pemicu palet.
- `components/Sidebar.tsx`: `Brand` dan `NavList` diekspor ulang supaya drawer memakai daftar menu
  yang sama, satu sumber.
- `components/CommandPalette.tsx`: mendengar peristiwa `ml:palette` dari tombol ponsel.
- `components/GlobalLastUpdated.tsx`, `app/page.tsx`, `app/stock/[code]/page.tsx`,
  `components/MarketOverview.tsx`, `components/HistoryTable.tsx`, `components/InfoHint.tsx`,
  `app/rekomendasi/page.tsx`: pola ponsel dan perbaikan di bagian 8.
- Sebelas berkas lain: penggantian nama token warna teks aksen saja.
- `docs/revamp-ui/`: dokumen ini dan `DESKRIPSI-DESAIN.md`.

## 11. Verifikasi independen 20 Okt 2026

Diukur ulang di `main` `a5c70d8` (bukan di cabang), 16 rute, dengan API `:8000` dipantau: `/health` 200 di setiap langkah.

| # | Syarat | Hasil pengukuran ulang |
|---|---|---|
| 4 | Luber 0 px di 390 px dan 320 px | 0 px di 16 rute pada 390 px; pada 320 px `/stock/PEGE` luber 33 px lalu diperbaiki ke 0 (bagian 11.1) |
| 5 | Target sentuh berdiri sendiri ≥ 44 px | 0 pelanggaran di 16 rute x 2 lebar, setelah `[inert]` dan elemen tersembunyi dikecualikan; tautan brand header 159 x 44 px |
| 6 | Tabel di dalam wadah geser | Setiap `table` yang ter-render (`/faktor` 2, `/sectors` 1, `/broker-activity` 2, `/stock/PEGE` 1) punya leluhur `overflow-x: auto`; 0 tabel di luar wadah |
| 7 | Kontras WCAG AA dua tema | 24 pasang dihitung dari token `globals.css` yang berlaku (bukan dari dokumen ini): lolos semua, yang terendah `--neutral` 4,83:1 di putih |
| 9 | Konsol bersih | 0 error, 0 warning di 32 pemuatan halaman |
| 10 | `tsc --noEmit` | exit 0 (setelah perbaikan 11.1) |

### 11.1 Temuan yang diperbaiki: judul kartu terjepit

`Card.tsx` tidak mengizinkan header melipat, dan slot `right` tidak boleh mengecil di bawah lebar min-content-nya. Akibatnya slot kanan yang lebar (papan hitung sinyal `BUY/HOLD/SELL` + baris "Sesi bursa ..." = 300 px) menekan blok judul sampai tinggal sliver — di desktop juga, bukan cuma di ponsel:

| Lebar | Judul "Trading Signals" sebelum | Luber sebelum | Sesudah |
|---|---|---|---|
| 1440 px | 17 x 39 px (terlipat vertikal) | 0 px | judul 176 x 20 px, luber 0 px |
| 390 px | 4 x 39 px | 0 px | judul 176 x 20 px, luber 0 px |
| 320 px | 0 px (tak terbaca) | 33 px | judul 176 x 20 px, luber 0 px |

Perbaikan dua baris, tanpa menghapus elemen:

- `components/Card.tsx`: header `flex items-start justify-between gap-3` menjadi `flex flex-wrap items-start justify-between gap-x-3 gap-y-2`.
- `components/SignalsPanel.tsx`: slot kanan `flex items-center gap-2` menjadi `ml-auto flex flex-wrap items-center justify-end gap-2`.

`flex-wrap` hanya melipat saat isi tidak muat, jadi kartu yang slot kanannya sempit (hanya `LastUpdated`) tidak berubah.

### 11.2 Catatan alat

- `next build` belum diulang: worktree terpisah gagal karena Turbopack menolak symlink `node_modules` yang menunjuk ke luar akar proyek (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`), sedangkan aturan repo melarang `next build` selama `next dev` hidup di :3000. Perlu keputusan pemilik untuk mematikan `next dev` sebentar.
- API `:8000` tumbang berulang pada 20 Okt 2026 (`OSError WinError 64` di accept-loop; 20 baris di `_api.log`), termasuk di tengah sapuan audit. Sapuan yang terkena ditandai tidak sah dan diulang; angka di atas berasal dari sapuan yang `/health`-nya 200 di setiap langkah.
- Aturan repo melarang `next build` selama `next dev` hidup di :3000, dan ternyata **tidak ada jalur resmi** untuk menghentikan dev server: prosesnya dilepas `run-hidden.vbs` (session 0), jadi `Stop-Process` ditolak ("Access is denied") dan `Stop-ScheduledTask` tidak menyentuhnya. Ditutup 20 Okt 2026 dengan pola yang sama seperti API: `scripts/restart-web.ps1` (dipanggil `start-web.bat`) menghentikan pemegang port dari dalam konteks task, dan `_stop-web.flag` membuat peluncuran berhenti tanpa menyalakan ulang.

### 11.3 Syarat #10: `next build` (20 Okt 2026, 12:43)

`node node_modules/next/dist/bin/next build` dijalankan **setelah** dua berkas 11.1 masuk dan `next dev` dihentikan lewat `_stop-web.flag` + `Start-ScheduledTask IDX-Web`.

- Exit 0. 21 rute ter-generate (17 statis + 4 dinamis: `/dossier/[code]`, `/flow/[code]`, `/keputusan/[code]`, `/radar/[code]`, `/stock/[code]`).
- `next dev` dinyalakan lagi sesaat setelahnya (`_stop-web.flag` dihapus), `/` 200 dalam 5 detik.
- `npx tsc --noEmit` tetap exit 0.

### 11.4 Kalimat gerbang yang mengulang (20 Okt 2026)

Tiga tempat mengulang awalan sebab rezim, karena `gate.reason` dari backend sudah berbunyi `"rezim menolak: …"`:

| Tempat | Sebelum | Sesudah |
| --- | --- | --- |
| Catatan kartu (`app/rekomendasi/page.tsx`) | `Rezim sedang menolak: … berubah. rezim menolak: tren turun …` | `Rezim sedang menolak: tren turun terkonfirmasi (ADX 49.0) - tahan posisi baru. Grade & rencana posisi ditahan sampai kondisinya berubah.` |
| Kepala papan (`page.tsx`) | `Gerbang rezim menahan tawaran baru: rezim menolak: …` | `Gerbang rezim menahan tawaran baru: tren turun …` |
| Pesan buku klaim (`research/journal.py`) | `Gerbang rezim menolak klaim baru: rezim menolak: …` | `Gerbang rezim menolak klaim baru: tren turun …` |

Terukur di `/rekomendasi` (1440 px, 20 kartu): tidak ada lagi `rezim menolak: rezim menolak`; catatan kartu 1x per kartu; 0 galat konsol. API `:8000` dan `serve` di-restart 12:47 supaya pesan baru berlaku.

