# Sumber Data Berita Market

Dokumen ini adalah daftar sumber berita dan data untuk Analis Sentimen dan Analis Berita. Peran agen ada di [framework-agen.md](./framework-agen.md).

Prioritas: pasar Indonesia lebih dulu, lalu makro global, lalu crypto dan emas sebagai pelengkap.

## 1. Pasar Indonesia (IHSG, saham, obligasi, makro BI)

| Sumber | Fokus | Catatan |
|---|---|---|
| idx.co.id | Data resmi BEI: pengumuman, laporan keuangan | Sumber primer. Diakses lewat browser (Cloudflare) |
| cnbcindonesia.com | Berita market dan analisis institusional | |
| bisnis.com | Berita pasar modal domestik | |
| kontan.co.id | Berita pasar modal domestik | |
| investor.id | Berita pasar modal domestik | |
| investing.com | Section Indonesia | |
| Pluang | Data dan berita ritel | |

## 2. Global Macro & Institutional

| Sumber | Fokus |
|---|---|
| reuters.com/markets | Berita pasar global |
| bloomberg.com | Berita pasar global |
| marketwatch.com | Berita pasar AS |
| tradingeconomics.com | Data makro: BI rate, Fed rate, inflasi |

## 3. Crypto (BTC/ETH/altcoin + sentimen)

| Sumber | Fokus |
|---|---|
| tradingview.com | Chart dan data harga |
| coindesk.com, cointelegraph.com | Berita dan analisis |
| theblock.co | Berita kelas institusional |
| coinglass.com | On-chain, funding rate, whale dan likuidasi (data, bukan berita) |
| alternative.me | Fear & Greed Index harian |

## 4. Gold / Komoditas

| Sumber | Fokus |
|---|---|
| kitco.com | Berita dan harga emas real-time. Sering di-scrape |
| goldprice.org | Harga historis dan live |
| Pegadaian Gold, UBS Gold | Harga emas domestik dan institusi |

## 5. Sentimen Sosial (untuk "whale mode" sentiment read)

| Sumber | Fokus |
|---|---|
| Threads, X, Stockbit | Saham |
| StockTwits, Reddit | Saham dan crypto global |

## Catatan

- Sebelum menambah sumber baru, cek dulu terms of service dan apakah sumber tersebut memang dipakai di kode (`idx-scraper`).
- Status scraping per sumber belum diverifikasi di dokumen ini. Tandai `[BELUM TERVERIFIKASI]` sampai ada bukti.
