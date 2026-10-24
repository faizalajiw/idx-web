# Dossier Emiten (`/dossier/[code]`)

## 1. Ringkasan Fungsi
Satu halaman ringkasan analisis per emiten, dengan export PDF. Setiap bagian menampilkan tanggal sesi datanya, dan ditandai bila lebih lama dari sesi terakhir pasar. Dossier tidak menghitung skor baru: semua isi berasal dari endpoint dan fungsi analitik yang sudah ada. Pengguna: pemakaian pribadi.

## 2. Route & Berkas
- URL: `/dossier/[code]` → [`routes/dossier/[code]/+page.svelte`](../web/src/routes/dossier/[code]/+page.svelte)
- Hook: `useStockDossier(code)` ([hooks.svelte.ts](../web/src/lib/hooks.svelte.ts)), refresh 300 detik
- Tipe: `StockDossier`, `DossierSection` ([types.ts](../web/src/lib/types.ts))
- Tautan masuk: tombol **Dossier** di header `/stock/[code]` dan di baris Screener
- Unduh PDF: `GET /api/stocks/{code}/dossier.pdf` (tombol "Unduh PDF")

## 3. Bagian Dossier
Sumber: [`dossier.py`](../../idx-scraper/src/idx_scraper/api/dossier.py) `build_dossier` (baris 95–144).

| Bagian | Sumber (fungsi backend yang dipakai ulang) | Tanggal sesi | Alasan |
|---|---|---|---|
| Profil | `research.latest_pit` + `sector_map.sector_for` | sesi terakhir | nama/sector berasal dari PIT, bukan kolom sendiri |
| Valuasi | `analytics.get_valuation` (hanya emiten di daftar undervalued/overvalued) | sesi terakhir | baris valuasi tidak membawa tanggal |
| Faktor & Verdict | `analytics.get_stock_decision` → `hold_check` | sesi terakhir | hasil perhitungan sesi berjalan |
| Arus Asing | `analytics.get_stock_foreign_flow` | **`date` dari respons** | satu-satunya bagian dengan tanggal miliknya |
| Aktivitas Broker | `analytics.get_stock_broker_activity` | sesi terakhir | `as_of` ikut sesi EOD terakhir |
| Sentimen | `get_stock_decision` → `sentiment` + `_latest_orderbook_factors` | **tanggal buku order** (`orderbook_date`) | buku bisa tertinggal dari arus asing |
| Catatan Risiko | `get_stock_decision` → `regime`, `market_gauge`, `events`, `invalidation` | sesi terakhir | konteks pasar sesi berjalan |

## 4. Logika Kesegaran
- `latest_session` = `max(trade_date)` dari `research.latest_pit` (`latest_session_date`).
- Bagian `stale = true` bila `session_date` lebih lama dari `latest_session`, atau tanpa tanggal (`mark_stale`).
- Sentimen memakai tanggal buku order, bukan sesi. Bila buku tidak ada (`ob_imbalance` dan `ob_absorption` keduanya null), bagian dianggap stale.
- Satu bagian yang gagal diberi `error`; bagian lain tetap tampil. Dossier tidak pernah gagal seluruhnya.
- `stale_sections` = daftar kunci bagian yang stale, dipakai untuk peringatan di atas kartu.

## 5. Render Data per Bagian
Data bagian dirender dengan aturan yang sama di web dan PDF: objek bersarang ditampilkan, bukan dibuang.

- **Web** ([+page.svelte](../web/src/routes/dossier/[code]/+page.svelte), `ScalarRows`): skalar → tabel dua kolom; objek bersarang → sub-grup berlabel; daftar teks (alasan, dll.) → butir penuh lebar; daftar objek → jumlah item.
- **PDF** ([dossier_pdf.py](../../idx-scraper/src/idx_scraper/api/dossier_pdf.py), `_scalar_rows`): skalar → baris tabel; objek bersarang → diratakan dengan prefiks (mis. `regime adx`); daftar teks → digabung `"; "`; daftar objek → jumlah item.
- Kartu Valuasi kosong dan tidak masuk daftar valuasi = pesan khusus, bukan keadaan galat.

## 6. Berkas Backend
- [`dossier.py`](../../idx-scraper/src/idx_scraper/api/dossier.py): susun dossier, aturan stale.
- [`dossier_pdf.py`](../../idx-scraper/src/idx_scraper/api/dossier_pdf.py): render PDF (ReportLab, dependensi grup `api` di `pyproject.toml`).
- Endpoint di [`app.py`](../../idx-scraper/src/idx_scraper/api/app.py): `/api/stocks/{code}/dossier` dan `/dossier.pdf`.
- Tes: `tests/test_dossier.py` (aturan stale), `tests/test_dossier_pdf.py` (format nilai, objek bersarang, PDF valid).

## 7. Verifikasi (2026-10-12)
- `pytest tests/test_dossier.py tests/test_dossier_pdf.py tests/test_sentiment.py` → 32 lolos; `ruff` lolos; `tsc --noEmit` lolos.
- Endpoint diuji di `:8000`: dossier OK, PDF `200 application/pdf`.
- Halaman diuji di browser (BBRI dan SEMA): judul, tujuh bagian, tautan dari Screener dan `/stock/[code]`, tanpa error console.
- Contoh: BBRI `stale_sections = ["sentimen"]` karena buku order 8 Okt vs sesi 9 Okt.

## 8. Batasan
- Tidak ada skor beli baru. Bobot IC masih kosong (`eligible = false`), sehingga skor belum bisa dijadikan dasar keputusan.
- Valuasi kosong bila emiten tidak masuk daftar undervalued/overvalued pada sesi itu. Itu bukan galat.
- Data orderbook berhenti di 8 Okt sampai capture berjalan lagi.
- Daftar teks dan daftar objek diringkas sebagai jumlah item di web; isi lengkapnya tidak dipetakan per bagian.
- Isi PDF adalah ringkasan data, bukan rekomendasi.
