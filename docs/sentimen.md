# Sentimen (`/sentimen`)

## 1. Ringkasan Fungsi
Membaca suasana pasar dari data yang sudah ada: arus asing, ketimpangan buku order intraday, dan breadth. Menghasilkan gauge pasar dan daftar emiten akumulasi/distribusi. Pengguna: trader yang ingin tahu apakah pasar sedang optimis atau pesimis. Tidak ada sumber berita atau scraping baru.

## 2. Route & Berkas
- URL: `/sentimen` → [`app/sentimen/page.tsx`](../../idx-web/app/sentimen/page.tsx)
- Hook: `useSentiment(limit=15)` ([hooks.ts:204](../../idx-web/lib/hooks.ts), refresh 300 detik)
- Backend: `GET /api/sentiment?limit=15` ([app.py:574](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_sentiment` ([analytics.py:1984](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research/sentiment.compute` ([research/sentiment.py](../../idx-scraper/src/idx_scraper/research/sentiment.py))

## 3. Penjelasan Per-Card / Per-Panel

### Gauge Pasar
| Field | Isi |
|---|---|
| Nama card | Gauge Pasar |
| Komponen | [sentimen/page.tsx](../../idx-web/app/sentimen/page.tsx) ~baris 154–190 |
| Fungsi | Skor suasana pasar 0–100 (jarum ke kanan = optimis) |
| Sumber data | `GET /api/sentiment` → `sentiment.compute(dsn, index_pct, ob_by_code, limit)` ([research/sentiment.py](../../idx-scraper/src/idx_scraper/research/sentiment.py)); `index_pct` dari `_latest_index` ([analytics.py](../../idx-scraper/src/idx_scraper/api/analytics.py)); `ob_by_code` dari `research.orderbook` |
| Rumus/Logika | Gabungan arus asing (`latest_pit.foreign_net`), ketimpangan & absorpsi buku order, dan breadth; dinormalisasi ke 0–100 [BELUM TERVERIFIKASI bobot komponen] |
| Periode/Window | Snapshot hari bursa terakhir (`as_of`) |
| Interaksi | Hover tooltip (info) |
| Empty/Loading/Error | Skeleton; ErrorState "Pastikan backend & database hidup" |

### Akumulasi
| Field | Isi |
|---|---|
| Nama card | Akumulasi |
| Komponen | [sentimen/page.tsx](../../idx-web/app/sentimen/page.tsx) ~baris 191–201; `SentimentList` |
| Fungsi | Emiten dengan arus asing peringkat atas dan/atau bid lebih tebal dari offer |
| Sumber data | Field `accumulation` pada respons `/api/sentiment` |
| Rumus/Logika | Skor emiten −1..+1 dari komponen sentimen; ambil `limit` teratas |
| Periode/Window | Snapshot hari terakhir |
| Interaksi | Klik emiten → detail |
| Empty/Loading/Error | "Tidak ada emiten dengan sinyal akumulasi." |

### Distribusi
| Field | Isi |
|---|---|
| Nama card | Distribusi |
| Komponen | [sentimen/page.tsx](../../idx-web/app/sentimen/page.tsx) ~baris 202–212 |
| Fungsi | Emiten dengan arus asing peringkat bawah dan/atau offer lebih tebal dari bid |
| Sumber data | Field `distribution` |
| Rumus/Logika | Skor terendah dari komponen yang sama |
| Periode/Window | Snapshot hari terakhir |
| Interaksi | Klik emiten → detail |
| Empty/Loading/Error | "Tidak ada emiten dengan sinyal distribusi." |

## 4. Data Flow (end-to-end)
```
latest_pit.foreign_net + research.orderbook (intraday, tertutup close T) + index_quotes
  → research/sentiment.compute → cache 1 jam (analytics)
  → GET /api/sentiment?limit=15 → useSentiment (300 s) → gauge + dua daftar
```

## 5. Cara Pengambilan / Update Data
- **On-demand** dengan cache `sentiment:{limit}` 1 jam (`_RESEARCH_TTL`, analytics.py:37).
- **Sumber orderbook**: diisi capture intraday (lihat [README](README.md) bagian scheduler: `intraday`, interval 60 detik) [BELUM TERVERIFIKASI job persis].
- **Refresh UI**: SWR 300 detik; data tetap sampai cache 1 jam habis.
- **Reset cache**: `POST /api/cache/clear`.
- **Idempotensi**: deterministik dari data tersimpan.
- **Fallback**: bila `orderbook` gagal, `ob_by_code` kosong dan sentimen hanya dari arus asing dan breadth (warning di log).

## 6. Dependensi & Relasi Menu
- Memakai data [Foreign Flow](foreign-flow.md) dan indeks dari [Dashboard](dashboard.md).
- Daftar emiten dapat dibuka ke [Halaman Detail Emiten](halaman-detail.md).

## 7. Catatan Batasan & Edge Case
- Snapshot intraday hari T ditutup pada close T; tidak ada look-ahead.
- Sentimen bukan berita: tidak ada headline atau media sosial.
- Tanpa capture order-book, gauge tetap tampil dengan komponen lebih sedikit.
- Cache 1 jam: angka bisa tertinggal hingga 1 jam.
