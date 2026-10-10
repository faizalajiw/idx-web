# Foreign Flow (`/foreign`)

## 1. Ringkasan Fungsi
Peringkat emiten dengan arus beli dan jual bersih asing dalam 20 sesi terakhir. Menjawab: "asing sedang masuk atau keluar di saham mana?" Pengguna: trader dan analis yang memantau posisi asing. Data EOD.

## 2. Route & Berkas
- URL: `/foreign` → [`app/foreign/page.tsx`](../../idx-web/app/foreign/page.tsx)
- Hook: `useForeignFlow(days=20)` ([hooks.ts:195](../../idx-web/lib/hooks.ts), refresh 30 detik)
- Backend: `GET /api/foreign-flow?days=20` ([app.py:392](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_foreign_flow` ([analytics.py:250](../../idx-scraper/src/idx_scraper/api/analytics.py))

## 3. Penjelasan Per-Card / Per-Panel

### Top Net Buy
| Field | Isi |
|---|---|
| Nama card | Top Net Buy |
| Komponen | [foreign/page.tsx](../../idx-web/app/foreign/page.tsx) ~baris 100–140 |
| Fungsi | Emiten dengan akumulasi asing terbesar |
| Sumber data | `GET /api/foreign-flow` → `get_foreign_flow` ([analytics.py:250](../../idx-scraper/src/idx_scraper/api/analytics.py)); tabel `foreign_flow` / `latest_pit.foreign_net` |
| Rumus/Logika | Jumlah net asing per emiten selama 20 sesi, diurutkan menurun. Tiap baris menampilkan kode, persen, dan net (format ringkas) |
| Periode/Window | 20 sesi (subtitle "Akumulasi asing terbesar") |
| Interaksi | Klik kode → [Aliran Dana Emiten](aliran-dana-emiten.md) atau detail emiten |
| Empty/Loading/Error | Pesan kosong bila tidak ada data; skeleton saat memuat |

### Top Net Sell
| Field | Isi |
|---|---|
| Nama card | Top Net Sell |
| Komponen | [foreign/page.tsx](../../idx-web/app/foreign/page.tsx) ~baris 100–140 |
| Fungsi | Emiten dengan distribusi asing terbesar |
| Sumber data | Sama dengan Top Net Buy |
| Rumus/Logika | Urutkan net asing menaik (paling negatif) |
| Periode/Window | 20 sesi (subtitle "Distribusi asing terbesar") |
| Interaksi | Klik kode → detail |
| Empty/Loading/Error | Sama dengan Top Net Buy |

## 4. Data Flow (end-to-end)
```
Ingest EOD asing (Postgres: foreign_flow, latest_pit.foreign_net)
  → analytics.get_foreign_flow (20 sesi)
  → GET /api/foreign-flow?days=20 → useForeignFlow (30 s) → dua kartu
```

## 5. Cara Pengambilan / Update Data
- **On-demand** dengan cache in-process; data dasar diisi job pipeline `refresh_s2` (16:05 WIB) dan `refresh_s2_late` (16:20 WIB).
- **Refresh UI**: SWR 30 detik; data tetap EOD sehingga tidak berubah intraday.
- **Reset cache**: `POST /api/cache/clear` ([app.py:516](../../idx-scraper/src/idx_scraper/api/app.py)).
- **Idempotensi**: net dihitung ulang dari data tersimpan; deterministik.
- **Fallback**: tidak ada sumber alternatif; kosong bila data asing belum diisi.

## 6. Dependensi & Relasi Menu
- Sumber untuk [Radar Smart Money](radar-smart-money.md) dan [Sentimen](sentimen.md).
- Detail per emiten di [Aliran Dana Emiten](aliran-dana-emiten.md) dan [Halaman Detail Emiten](halaman-detail.md).

## 7. Catatan Batasan & Edge Case
- Hanya 20 sesi; ubah parameter `days` di backend bila perlu rentang lain.
- Data EOD: tidak mencerminkan transaksi intraday.
- [BELUM TERVERIFIKASI] Baris tabel dan kolom persis yang dibaca `get_foreign_flow` (analytics.py:250–317).
