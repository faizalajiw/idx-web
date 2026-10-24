# Sentimen (`/sentimen`)

## 1. Ringkasan Fungsi
Membaca suasana pasar dari data yang sudah ada: arus asing, ketimpangan buku order intraday, dan breadth. Menghasilkan gauge pasar (suhu pasar) dan dua daftar emiten, akumulasi dan distribusi, yang tampil berdampingan. Pengguna: trader yang ingin tahu apakah pasar sedang optimis atau pesimis. Tidak ada sumber berita atau scraping baru.

## 2. Route & Berkas
- URL: `/sentimen` → [`routes/sentimen/+page.svelte`](../web/src/routes/sentimen/+page.svelte)
- Hook: `useSentiment(limit=15)` ([hooks.svelte.ts](../web/src/lib/hooks.svelte.ts), refresh 300 detik, tanpa retry saat error)
- Tipe: `SentimentResponse`, `SentimentItem`, `SentimentMarket` ([lib/types.ts](../web/src/lib/types.ts))
- Backend: `GET /api/sentiment?limit=15` ([app.py](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_sentiment` ([analytics.py](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research/sentiment.compute` ([research/sentiment.py](../../idx-scraper/src/idx_scraper/research/sentiment.py))

## 3. Tata Letak Halaman

Urutan dari atas ke bawah:

1. **Header**: judul "Sentimen Pasar", keterangan singkat, jam update (`LastUpdated`), dan badge label pasar (RISK-ON / NETRAL / RISK-OFF) di kanan.
2. **Baris 1, dua kolom**
   - Kiri: kartu **Suhu Pasar**. Berisi gauge skor 0–100 dan tiga bar komponen dari tengah (Lebar pasar, Gerak IHSG, Arus asing).
   - Kanan: empat kotak statistik (Dianalisis, Akumulasi, Distribusi, Netral), lalu kartu **Breadth & Aliran** berisi bar naik/stagnan/turun dan tiga angka (IHSG, Porsi asing, Asing/nilai).
     - Setiap kotak punya ikon Lucide dan warna sendiri lewat `--stat-c`: Dianalisis (`BarChart3`, biru aksen), Akumulasi (`TrendingUp`, hijau), Distribusi (`TrendingDown`, merah), Netral (`Minus`, abu-abu).
     - Kotak memakai kelas `.stat-box` di [app.css](../web/src/app.css). Latar memakai tint 9% dari warna kotak, dan garis atas serta border saat hover memakai warna yang sama.
3. **Baris 2, dua kolom (xl ke atas)**: kartu **Akumulasi** dan kartu **Distribusi**. Tidak ada tab; keduanya terlihat sekaligus. Klik emiten untuk membuka alasan sinyal.
4. **Baris 3, dua kolom**: kartu **Bobot Skor Emiten** dan kartu **Catatan** (disclaimer dari backend, atau peringatan bila orderbook tidak tersedia).

Komponen internal di file yang sama: `ScoreGauge`, `ComponentBar`, `BreadthBar`, `Stat`, `SideCard`, `SentimentList`.

### Suhu Pasar (gauge)
| Field | Isi |
|---|---|
| Komponen | `ScoreGauge` + `ComponentBar` di kartu Suhu Pasar |
| Fungsi | Skor suasana pasar 0–100. Jarum ke kanan = optimis. |
| Sumber data | `market.score`, `market.label`, `market.components` |
| Rumus/Logika | Tiga komponen dalam rentang −1..+1 digabung dengan bobot, lalu `score = 50 + 50 × gabungan`. Bobot: lebar pasar 0.45, gerak IHSG 0.30, arus asing 0.25. Bobot dinormalisasi ulang bila ada komponen yang kosong. |
| Komponen pasar | Lebar pasar = 2 × breadth naik − 1. Gerak IHSG = persen IHSG ÷ 1,5 (dibatasi ±1). Arus asing = 2 × porsi saham dengan arus asing positif − 1. |
| Ambang label | ≥ 60 RISK-ON; ≤ 40 RISK-OFF; selain itu NETRAL. |
| Periode/Window | Snapshot hari bursa terakhir yang lengkap (`as_of`) |
| Empty/Loading/Error | Skeleton saat memuat. Error: `ErrorState` dengan pesan dari hook. Nilai kosong: skor 50 dan label NETRAL. |

### Breadth & Aliran
| Field | Isi |
|---|---|
| Komponen | Kartu "Breadth & Aliran", `BreadthBar`, `Stat` |
| Fungsi | Jumlah saham naik, stagnan, dan turun; IHSG; porsi asing; asing terhadap total nilai |
| Sumber data | `market.up`, `market.flat`, `market.down`, `market.index_percent`, `market.foreign_breadth`, `market.foreign_to_value` |
| Interaksi | Hover tooltip pada kotak "Porsi asing" |

### Akumulasi & Distribusi
| Field | Isi |
|---|---|
| Komponen | Dua instance `SideCard` (`side="akumulasi"` dan `side="distribusi"`) |
| Fungsi | Akumulasi: emiten dengan skor ≥ 0,15 (arus asing peringkat atas dan/atau bid lebih tebal). Distribusi: skor ≤ −0,15 (arus asing peringkat bawah dan/atau offer lebih tebal). |
| Sumber data | `accumulation` dan `distribution` pada respons |
| Rumus/Logika | Skor emiten −1..+1 = rata-rata berbobot dari persentil arus asing (bobot 0.40), ketimpangan buku (0.35), dan absorpsi buku (0.25). Bobot dinormalisasi bila ada yang kosong. Label: ≥ 0,40 AKUMULASI KUAT; ≥ 0,15 AKUMULASI; simetris untuk distribusi (≤ −0,40 DISTRIBUSI KUAT; ≤ −0,15 DISTRIBUSI); selain itu NETRAL. Hanya emiten dengan nilai transaksi ≥ Rp 1 miliar. Diurutkan dari |skor| terbesar, dibatasi `limit` (15) per sisi. |
| Interaksi | Klik baris → buka panel: persentil asing, imbalance OB, serapan OB, dan daftar alasan. Hanya satu baris terbuka per kartu. Kunci expand dibedakan per sisi, jadi membuka satu kartu tidak menutup kartu lain. |
| Empty/Loading/Error | Skeleton (6 baris). Kosong: "Tidak ada emiten dengan sinyal akumulasi/distribusi." |

### Bobot Skor Emiten
| Field | Isi |
|---|---|
| Komponen | Kartu "Bobot Skor Emiten" |
| Sumber data | `weights` pada respons (arus asing 40%, ketimpangan buku 35%, absorpsi buku 25%) |
| Catatan | Hanya menjelaskan bobot skor per emiten. Bobot skor pasar ada di bagian Suhu Pasar. |

### Catatan
| Field | Isi |
|---|---|
| Komponen | Kartu "Catatan" |
| Fungsi | Menampilkan peringatan bila `orderbook_available = false` (sinyal memakai arus asing dan breadth sebagai proksi). Menampilkan `disclaimer` dari backend. |

## 4. Data Flow (end-to-end)
```
latest_pit.foreign_net + research.orderbook (intraday, tertutup close T) + index_quotes
  → research/sentiment.compute → cache 1 jam (analytics)
  → GET /api/sentiment?limit=15 → useSentiment (300 s) → Suhu Pasar + Breadth + dua daftar
```

## 5. Cara Pengambilan / Update Data
- **On-demand** dengan cache `sentiment:{limit}` 1 jam (`_RESEARCH_TTL`, analytics.py).
- **Sumber orderbook**: diisi capture intraday (lihat [README](../../idx-scraper/README.md) bagian scheduler: `intraday`, interval 60 detik).
- **Refresh UI**: auto-refresh 300 detik; data tetap sampai cache 1 jam habis.
- **Reset cache**: `POST /api/cache/clear`.
- **Idempotensi**: deterministik dari data tersimpan.
- **Pemilihan hari**: hari EOD terakhir yang minimal 50% barisnya punya nilai transaksi. Hari parsial dilewati.
- **Fallback**: bila `orderbook` gagal, `ob_by_code` kosong dan sentimen hanya dari arus asing dan breadth (warning di log).

## 6. Dependensi & Relasi Menu
- Memakai data [Foreign Flow](foreign-flow.md) dan indeks dari [Dashboard](dashboard.md).
- Daftar emiten dapat dibuka ke halaman detail emiten (`/stock/[code]`).
- Sumber untuk [Ruang Keputusan](ruang-keputusan.md) (sentimen satu emiten lewat `items`).

## 7. Catatan Batasan & Edge Case
- Snapshot intraday hari T ditutup pada close T; tidak ada look-ahead.
- Sentimen bukan berita: tidak ada headline atau media sosial.
- Tanpa capture order-book, gauge tetap tampil dengan komponen lebih sedikit, dan kartu Catatan menampilkan peringatan.
- Emiten tanpa data buku dan arus asing dilewati, bukan diisi nol.
- Cache 1 jam: angka bisa tertinggal hingga 1 jam.
- Daftar akumulasi dan distribusi dibatasi 15 per sisi. Jumlah total tiap sisi ada di kotak statistik, bukan di daftar.
- Tidak ada tab. Pada layar di bawah `xl`, kedua kartu tersusun vertikal.
