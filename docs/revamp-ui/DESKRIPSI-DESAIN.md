# Deskripsi Desain: Revamp UI idx-web

<!-- arsip: catatan historis; path dan perintah di dalamnya merujuk kondisi saat ditulis -->

Acuan kode untuk revamp tampilan. Batasan yang mengikat seluruh pekerjaan:

1. **Murni sisi tampilan.** Tidak ada endpoint, hook, tipe data, alur data, atau perilaku backend yang berubah.
2. **Tidak ada yang dikurangi.** Setiap kartu, kolom, label, tombol, tautan, dan informasi yang ada sebelum revamp harus tetap ada sesudahnya. Elemen boleh pindah tempat atau berubah bentuk, tidak boleh hilang. Alat ujinya ada di bagian 6.
3. Font tidak berubah: `Geist` (400, 500) + `Geist Mono` (400), dari `next/font` di `app/layout.tsx`.

## 1. Titik berangkat (angka nyata, 19 Okt 2026)

Diukur lewat DOM pada dev server `:3000`, lebar 390 px (`document.documentElement.clientWidth` = 382).

| Rute | Geser horizontal | Elemen lewat viewport | Target sentuh < 44 px |
|---|---|---|---|
| `/` | 0 px | 0 | 15 dari 39 |
| `/rekomendasi` | 63 px | 522 | 69 dari 71 |
| `/pantau` | 0 px | 0 | 414 dari 502 |
| `/screener` | 0 px | 0 | 7 dari 13 |
| `/faktor` | 0 px | 356 | 8 dari 9 |
| `/sectors` | 0 px | 285 | 27 dari 28 |
| `/broker-activity` | 0 px | 139 | 6 dari 7 |
| `/stock/PEGE` | 99 px | 91 | 27 dari 29 |

Di semua rute: `.app-sidebar` `position:fixed` lebar 64 px, `.app-main` `padding-left:64px`, `.app-footer` `position:fixed; left:64px; width:318px`. Jadi 64 dari 382 px (17%) dipakai rail ikon tanpa label, dan footer tidak pernah menempel ke tepi layar sambil menutup baris terakhir kartu.

Temuan tambahan: `CommandPalette` hanya dibuka lewat `Ctrl/Cmd + K` (`components/CommandPalette.tsx:75`). Di layar sentuh fitur itu tidak bisa dijangkau sama sekali.

## 2. Titik henti (breakpoint)

| Lebar | Shell | Konten |
|---|---|---|
| `< 768px` | sidebar disembunyikan, diganti drawer. Header 58 px + strip status. Footer statis di ujung konten. | satu kolom, tabel pakai pola di bagian 5 |
| `768-1023px` | sama seperti mobile, tombol menu tetap ada | grid `sm:`/`md:` milik halaman tetap berlaku |
| `>= 1024px` | persis seperti hari ini: sidebar penuh 15rem, tombol lipat, rail 4rem saat dilipat, footer `fixed left:var(--rail-w)` | seperti hari ini |

`1024px` dipertahankan karena token `--rail-w`, `.app-main`, dan `.app-footer` sudah memakai ambang itu. Menambah ambang baru di tengah jalan akan membuat tiga aturan berbeda saling menimpa.

## 3. Bahasa visual

Diambil dari mockup yang sudah disetujui (`dashboard-v5-elegan.html`, `mobile-v1.html`). Angka final:

- Kanvas `#0a0b0f`, permukaan `#101218`, garis rambut `rgba(255,255,255,.055)`, garis tegas `rgba(255,255,255,.09)`.
- Teks utama `#eceef4`, sekunder `#8b93a7`, redup `#6d7689`.
- Aksen `#3b6bff` di satu tempat saja: butir aktif navigasi. Tidak ada aksen kedua.
- Keadaan: naik `#37b3a4`, tahan `#e0a144`. Keduanya selalu berpasangan dengan teks, tidak pernah warna saja.
- Kaca hanya di rangka: header, footer, panel drawer, palet perintah. Kadar blur 18-22 px, alpha 0.72-0.78, tepi 1 px. Kartu, banner, tabel, dan tombol tetap solid.
- Radius: 8 px kontrol kecil, 10-12 px tombol dan item nav, 14 px kartu. Tidak ada pil.
- Bayangan hanya di elemen yang benar-benar melayang: panel drawer dan palet. Kartu memakai garis rambut, bukan bayangan.
- Angka selalu `font-variant-numeric: tabular-nums` dan memakai `Geist Mono` lewat kelas `.font-num` yang sudah ada (`globals.css:151`).
- Judul halaman tetap `text-2xl font-bold tracking-tight sm:text-3xl` seperti sekarang. Di mobile ukurannya ikut lebar kontainer lewat `clamp()` (bagian 4), bukan `vw`, supaya benar di lebar berapa pun.

## 4. Shell mobile

```
[aman area atas]
[header 58px, sticky, kaca] tombol menu 44px | brand | MarketBadge | tombol cari 44px
[strip status 1 baris, tanpa garis] GlobalLastUpdated
[isi halaman, padding 16px]
[footer statis: Market Labs - 2026 + faizalajiw]
[drawer] brand + tombol tutup 44px | nav 14 item | baris ThemeToggle 44px
```

- **Tombol menu**: 44x44, `aria-label="Buka menu"`, `aria-expanded` mengikuti keadaan, `aria-controls` menunjuk panel.
- **Panel drawer**: 300 px, `max-width:85cqw`, `role="dialog"`, `aria-modal="true"`, `aria-label="Navigasi utama"`, geser `translateX` 0.22 s `cubic-bezier(.2,.7,.2,1)`.
- **Latar**: tombol penuh layar, `rgba(0,0,0,.45)` + `backdrop-filter:blur(2px)`, `aria-label="Tutup menu"`.
- **Kunci dan fokus**: saat tertutup, lapisan drawer diberi `inert` (fallback `visibility:hidden` bila `inert` tidak ada). Saat dibuka: fokus pindah ke tombol tutup, `Tab` berputar di dalam panel, `Esc` menutup, fokus kembali ke tombol menu, dan `.mscroll` milik halaman tidak bisa digulir.
- **Item nav**: tinggi minimum 44 px, ikon 17 px, label grup 10.5 px huruf besar dengan `letter-spacing:.1em`. Susunan grup dan item identik dengan `GROUPS` di `components/Sidebar.tsx:31` (14 item, 5 grup). Tidak ada item yang ditambah atau dibuang.
- **Footer**: pada `< 1024px` berhenti menjadi `fixed` dan menjadi blok biasa di ujung dokumen, jadi tidak ada isi yang tertutup. Kredit GitHub (`faizalajiw`, `https://github.com/faizalajiw`) tetap tampil di semua lebar.
- **Aman area**: `env(safe-area-inset-bottom)` pada padding footer dan panel drawer, `env(safe-area-inset-top)` pada header.

## 5. Pola tabel dan kontrol di mobile

1. **Kartu bertumpuk** untuk 1-3 baris penting: tiap baris jadi kartu, label kiri, nilai mono kanan, grid 2x2 dengan garis rambut. Dipakai pada rencana posisi di `/rekomendasi`.
2. **Wadah geser** untuk tabel padat: pembungkus `overflow-x:auto`, `-webkit-overflow-scrolling:touch`, pendar di tepi kanan sebagai penanda kolom lain, plus satu baris kecil "geser ke samping untuk kolom lain". Dipakai pada tabel `.data-table` mana pun yang lebih lebar dari layar. Isi tabel tidak dipotong, hanya bisa digeser.
3. **Target sentuh**: semua `button`, `a`, `input`, `select`, dan kotak centang yang bisa ditekan minimal 44x44 px di `< 1024px`. Kelas kecil yang sekarang di bawah ambang (`btn-sm`, tombol tutup `InfoHint` 13x13, chip baris 22 px, tautan ticker 21 px) naik tinggi atau diberi padding tembus pandang supaya kotak sentuhnya 44 px tanpa mengubah tampilan visualnya.
4. **Tidak ada geser horizontal di badan halaman**: `min-width:0` pada anak grid dan flex, `overflow-wrap:anywhere` untuk nilai panjang, dan setiap tabel selalu di dalam wadah geser.

## 6. Alat uji "tidak ada yang hilang"

Gerbang utama **bukan** hitungan DOM, melainkan **diff berkas sumber**. Hitungan DOM bergerak
mengikuti hangat-tidaknya cache API, jadi ia dipakai sebagai asap, bukan sebagai bukti.

1. **Gerbang utama, diff sumber.** `git diff --stat` menyebut berkas yang berubah, lalu diff-nya
   dibaca baris per baris: setiap perubahan harus berbentuk kelas CSS, nilai token, atau susunan
   shell. Tidak boleh ada blok JSX, elemen, judul kartu, kolom tabel, atau tautan yang hilang, dan
   tidak boleh ada endpoint, hook, tipe, atau alur data yang berubah. Revamp ini menyentuh
   `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/stock/[code]/page.tsx`,
   `components/Sidebar.tsx`, `components/CommandPalette.tsx`, `components/GlobalLastUpdated.tsx`,
   `components/InfoHint.tsx`, `components/MarketOverview.tsx`, `components/HistoryTable.tsx`,
   sebelas berkas pemanggil aksen (hanya nama token warna teks, jadi tidak ada kelas bukti),
   plus satu berkas baru `components/MobileNav.tsx`.
2. **Gerbang kedua, inventaris DOM saat jalan** lewat browser MCP pada 1440 px dan 390 px: `h1`,
   daftar `h2`, jumlah `.card` beserta judulnya, jumlah `.stat-box`, jumlah `table`, label tombol,
   tautan sidebar, kredit footer, dan `overflowX`. Angka sebelum dan sesudah dicatat di
   `RENCANA.md`; syaratnya **tidak turun**, bukan sama persis.
3. **Target sentuh**: di bawah 1024 px, kontrol berdiri sendiri minimal 44 x 44 px; target sebaris
   dikecualikan (WCAG 2.5.8 mengecualikan target sebaris). Diukur per rute.
4. **Tabel**: setiap `table.data-table` harus berada di dalam leluhur ber-`overflow-x: auto` (atau
   `scroll`), dan tidak boleh ada elemen yang melewati lebar viewport di luar wadah geser.
5. **Luber mendatar**: `document.scrollWidth - clientWidth` harus 0 pada 320 px (ambang reflow
   WCAG 1.4.10) dan 390 px, di semua rute.

Tidak ada skrip audit yang di-commit: pengukurannya dilakukan langsung lewat browser MCP dan angka
mentahnya ada di `RENCANA.md`. Kalau nanti perlu diulang berkala, skripnya ditulis dulu sebagai
commit sendiri, bukan diklaim ada di dokumen ini.

## 7. Kaidah yang wajib lolos sebelum dianggap selesai

- Kontras WCAG AA: 4.5:1 teks normal, 3:1 teks besar dan batas komponen, di tema gelap **dan** terang. Dihitung, bukan dikira.
- Fokus terlihat di setiap elemen interaktif, 3:1 terhadap sekitarnya, di dua tema. Tidak ada `outline:none` tanpa pengganti.
- Keadaan kosong, memuat, dan galat setiap tampilan data tetap ada dan menyebut sebab serta langkah berikutnya (`components/States.tsx` sudah punya; jangan dihapus).
- Gerak menghormati `prefers-reduced-motion`.
- Tahan zoom teks 200% pada lebar 390 px tanpa terpotong.
- `npx tsc --noEmit` dan `npx next build` lolos.
