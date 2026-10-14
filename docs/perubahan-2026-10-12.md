# Catatan Perubahan 12 Okt 2026

Ringkasan semua perubahan pada sesi ini: halaman, dokumentasi, data, dan operasional. Diurutkan dari yang paling berdampak.

## 1. Halaman Sentimen Pasar (`/sentimen`)

- **Berkas**: `app/sentimen/page.tsx` (ditulis ulang).
- **Tata letak baru**: header, Suhu Pasar + Breadth & Aliran, Akumulasi dan Distribusi berdampingan (tab dihapus), Bobot Skor Emiten + Catatan.
- **Perbaikan kelas CSS**: kelas yang tidak ada di `globals.css` (`text-bull`, `bg-bull`, `bg-bear`, `bg-surface-2`, `text-foreground`, `stroke-bull`) diganti token yang ada (`text-up`, `bg-down`, `var(--bg-elev)`, `badge-buy`/`badge-sell`/`badge-hold`).
- **Logo emiten**: `TickerLogo` ditambahkan di daftar emiten.
- **Kunci expand**: diberi namespace `${side}:${code}` karena dua daftar tampil bersamaan.
- **Tidak berubah**: hook `useSentiment`, tipe `SentimentResponse`, endpoint backend.
- **Verifikasi**: `tsc --noEmit` lolos. Belum ada verifikasi visual di browser (mode gelap/terang, mobile).

## 2. Dossier Emiten (`/dossier/[code]`)

- **Baru**: halaman dossier per emiten dengan 7 bagian (Profil, Valuasi, Faktor & Verdict, Arus Asing, Aktivitas Broker, Sentimen, Catatan Risiko). Setiap bagian menampilkan tanggal sesinya dan penanda stale.
- **Backend**: `api/dossier.py` (gabungan, tanpa skor baru), `api/dossier_pdf.py` (PDF ReportLab). Endpoint `GET /api/stocks/{code}/dossier` dan `/dossier.pdf`.
- **Dependensi baru**: `reportlab>=4.2` di grup `api` (`pyproject.toml`).
- **Tautan masuk**: tombol Dossier di `/stock/[code]` dan di baris Screener.
- **Perbaikan selama verifikasi**: tanggal sentimen memakai tanggal buku order (8 Okt), bukan sesi 9 Okt. Objek bersarang (regime, market gauge, invalidasi) sebelumnya terbuang dan sekarang ditampilkan.
- **Verifikasi**: 32 tes pytest lolos, ruff lolos, `tsc --noEmit` lolos. Endpoint dan PDF diuji di `:8000` (PDF 200, `application/pdf`). Halaman diuji di browser: judul, 7 bagian, tanpa error console.
- Dokumen: [dossier.md](dossier.md).

## 2b. Dokumentasi

- `docs/sentimen.md`: ditulis ulang sesuai layout baru. Bobot dan ambang dicek ulang terhadap `research/sentiment.py`. Typo sudah diperbaiki.
- `docs/perubahan-2026-10-12.md`: berkas ini.

## 3. Data (database, bukan kode)

- **Kalibrasi IC**: `idx ic` dijalankan. `research.factor_ic_history` kini punya `run_date = 2026-10-09` (40 baris). Sebelumnya 2026-10-07.
- **Catatan**: semua baris IC `eligible = false` dan `weight = 0`, termasuk run sebelumnya. Bobot composite memang kosong dari awal. Belum diselidiki.
- **Cache API**: `POST /api/cache/clear` dipanggil (59 entri dihapus).

## 4. Operasional (skrip dan jadwal)

### Skrip baru
- `idx-web/scripts/start-web.bat`: menjalankan `npm run dev` ke `logs\_web.log`.
- `idx-scraper/scripts/run-hidden.vbs`: menjalankan `.bat` lewat `wscript` tanpa jendela cmd.

### Skrip yang sudah ada (dipakai, tidak diubah)
- `idx-scraper/scripts/start-serve.bat`: `idx serve` → `_serve.log`.
- `idx-scraper/scripts/start-api.bat`: uvicorn :8000 → `_api.log`.

### Task Scheduler (user biasa, tanpa admin)
| Task | Menjalankan | Jadwal |
|---|---|---|
| `IDX-Serve` | `run-hidden.vbs` → `start-serve.bat` | Senin–Jumat 08:45 WIB, saat login |
| `IDX-API` | `run-hidden.vbs` → `start-api.bat` | Senin–Jumat 08:45 WIB, saat login |
| `IDX-Web` | `run-hidden.vbs` → `start-web.bat` | Senin–Jumat 08:45 WIB, saat login |

- Task hanya jalan saat user login. Untuk jalan tanpa login, perlu hak admin.
- Shortcut Startup sempat dibuat lalu dihapus atas permintaan.

### Proses
- Proses lama (serve, API, dev server) dihentikan dan dijalankan ulang dari task.
- Port: API 8000, web 3000.

## 5. Temuan (belum diperbaiki)

1. **Capture orderbook berhenti.** Tick terakhir `research.intraday_ticks`: 30 Sep 11:14 WIB. Penyebab: `serve` tidak berjalan selama bursa 1–9 Okt (mesin reboot 11 Okt 08:46). Efek: `ob_imbalance` dan `ob_absorption` kosong, komponen buku di sentimen hilang.
2. **`/api/news/trending` 404.** Route tidak ada di repo (`app.py`, `idx-web`). Pemanggilnya dari luar repo, kemungkinan tab browser lama.
3. **`public.stock_daily` berhenti di 22 Sep.** Hanya dipakai `idx seed` (yfinance). Belum dipastikan tidak dipakai halaman.
4. **Bobot IC kosong.** Semua baris `weight = 0`, `eligible = false`.
5. **Endpoint tanpa tanggal**: `/api/screener`, `/api/valuation`, `/api/watchlist`, `/api/alerts`, `/api/backtest/config`, `/api/stocks/{code}/ownership`. Freshness hanya diverifikasi lewat harga (SEMA, IDEA, RDTX cocok dengan `latest_pit` 9 Okt).

## 6. Pengecekan yang belum dilakukan

- Tampilan `/sentimen` di browser (mode gelap/terang, mobile).
- Capture orderbook saat bursa buka (Senin 12 Okt, 09:00–16:00).
- Pengecekan UI untuk semua menu (sejauh ini hanya API).

## 7. Berkas sementara (di luar repo)

- `C:\Users\faiza\AppData\Local\Temp\opencode\diag_intraday.py`
- `C:\Users\faiza\AppData\Local\Temp\opencode\diag_ticks.py`

Bisa dihapus kapan saja. Tidak dipakai aplikasi.
