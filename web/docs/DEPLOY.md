# Paket deploy

App ini build jadi berkas statis. Tidak ada proses Node di server: nginx
(atau Caddy) menyajikan `web/build/`, dan `index.html` dipakai sebagai fallback
supaya deep link seperti `/stock/BBCA` tetap terbuka walau halaman itu tidak
punya berkas sendiri.

## 1. Build

```bash
cd web
npm ci
PUBLIC_API_BASE_URL=https://api.contoh.id npm run build
```

Hasil: folder `web/build/` (~14 MB, 1097 berkas; 13,26 MB di antaranya logo
emiten).

`PUBLIC_API_BASE_URL` di-*inline* saat build, bukan dibaca saat runtime. Ganti
alamat API berarti build ulang. Tanpa variabel itu, app memakai
`http://localhost:8000`.

## 2. CORS di API

API hanya menerima origin yang terdaftar di `IDX_API_CORS_ORIGINS`
(`idx-scraper/src/idx_scraper/api/config.py:39`, bawaan
`http://localhost:3000,http://localhost:3100`). Tambahkan domain produksi tanpa
mengubah kode:

```bash
IDX_API_CORS_ORIGINS=https://pasar.contoh.id,http://localhost:3100
```

Restart layanan API setelah variabel diubah. Tanpa langkah ini halaman tampil
kerangka kosong dan konsol penuh galat CORS.

## 3. Sajikan

Salin `web/build/` ke server, lalu pakai `deploy/nginx.conf` (nginx) atau
potongan Caddy di bawah.

Caddy:

```
pasar.contoh.id {
	root * /var/www/idx-web
	try_files {path} /index.html
	file_server
	encode zstd gzip

	@immutable path /_app/immutable/*
	header @immutable Cache-Control "public, max-age=31536000, immutable"

	@html path /index.html
	header @html Cache-Control "no-cache"
}
```

Aturan cache yang penting:

| Path | Cache-Control | Alasan |
|---|---|---|
| `/_app/immutable/*` | `public, max-age=31536000, immutable` | nama berkas ber-hash; aman selamanya |
| `/index.html` | `no-cache` | rujukan ke hash terbaru, harus selalu segar |
| `/logos/*` | `public, max-age=604800` | 1002 berkas, jarang berubah |
| `/fonts/*` | `public, max-age=31536000, immutable` | |

Fallback wajib: permintaan yang tidak cocok dengan berkas apa pun harus
mengembalikan `index.html` dengan status **200**, bukan 404. Rute dinamis
(`/stock/[code]`, `/dossier/[code]`, `/flow/[code]`, `/radar/[code]`,
`/keputusan/[code]`) tidak punya berkas sendiri.

## 4. Cutover dari app Next

Urutan yang aman, tanpa jendela mati:

1. Build di mesin build, unggah `build/` ke direktori baru (mis. `/var/www/idx-web-next`).
2. Ubah `root` nginx/Caddy ke direktori baru, reload.
3. Hentikan layanan Next (`IDX-Serve` / `IDX-Web`) setelah halaman baru terbukti
   sehat. Kedua app tidak berbagi state, jadi tidak ada migrasi data.
4. Simpan direktori lama sampai satu siklus bursa berjalan normal, baru hapus.

## 5. Pemeriksaan setelah deploy

```bash
curl -sI https://pasar.contoh.id/stock/BBCA | head -1   # harus 200
curl -s  https://pasar.contoh.id/_app/immutable/ | head # pastikan cache header
```

Di browser:

1. `/` memuat angka IHSG dan berita, bukan kerangka kosong.
2. `/stock/BBCA` terbuka langsung dari URL (bukan hanya lewat klik).
3. Refresh di `/dossier/BBCA` tetap 200.
4. Tema terang/gelap bertahan setelah reload (`ml-theme` di localStorage).
5. Konsol bersih dari galat CORS dan MIME.

## 6. Yang tidak perlu di server

- Node, npm, atau proses apa pun yang tetap hidup.
- Variabel lingkungan runtime: semua sudah di-inline saat build.
- Database: app hanya memanggil API.
