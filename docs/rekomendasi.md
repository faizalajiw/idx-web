# Rekomendasi Beli (`/rekomendasi`)

## 1. Ringkasan Fungsi
Papan kandidat beli se-pasar dengan level masuk, stop, target, dan R/R, diurutkan dari bukti terkuat. Menjawab "emiten mana yang lolos gate kalkulasi hari ini, dan seberapa terbukti hasilnya". Pengguna: trader/analis. Dipakai pagi/sore setelah data EOD masuk.

## 2. Route & Berkas
- URL: `/rekomendasi` → [`app/rekomendasi/page.tsx`](../../idx-web/app/rekomendasi/page.tsx) (401 baris)
- Komponen: `LayerStrip`, `CandidateCard` (di file page), [RegimeBanner](../../idx-web/components/RegimeBanner.tsx), [States](../../idx-web/components/States.tsx), [LastUpdated](../../idx-web/components/LastUpdated.tsx)
- Hooks: `useRecommendations(limit, minGrade)` (300 s), `useRecommendationTrack()` (3600 s) ([hooks.ts](../../idx-web/lib/hooks.ts))

## 3. Penjelasan Per-Card

### Papan Kandidat
| Field | Isi |
|---|---|
| Nama card | Papan Kandidat |
| Komponen | [rekomendasi/page.tsx:330](../../idx-web/app/rekomendasi/page.tsx) (Card) + `CandidateCard` |
| Fungsi | Daftar kandidat beli: kode, grade A/B/C, entry, stop, target, R/R, alasan |
| Sumber data | `GET /api/recommendations` ([app.py:341](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.recommendations` ([analytics.py:2798](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.latest_pit`, `research.recommendation_log` (2776–2791) |
| Rumus/Logika | Gate: kandidat wajib punya stop yang dapat dihitung. Grade = peringkat relatif dalam pool hari itu: A 2% · B 10% · C 25% teratas (bukan probabilitas). Skor hanya dari lapisan lolos walk-forward |
| Periode/Window | Sesi terbaru; `limit` 10/20/50/100 baris |
| Interaksi | Filter grade (A saja / B ke atas / C ke atas); pilih jumlah baris |
| Empty/Loading/Error | Skeleton; EmptyState khusus grade A ("turunkan filter ke B/C"); ErrorState pesan backend/DB |

### Lapisan (LayerStrip)
| Field | Isi |
|---|---|
| Nama card | Strip lapisan skor (di atas papan) |
| Komponen | `LayerStrip` di [rekomendasi/page.tsx](../../idx-web/app/rekomendasi/page.tsx) |
| Fungsi | Menampilkan lapisan yang aktif/tidak lolos gate |
| Sumber data | Field `layers` dari `GET /api/recommendations` |
| Rumus/Logika | Lapisan yang belum lolos gate tidak ikut menimbang skor |
| Periode/Window | Sesi terbaru |
| Interaksi | — |
| Empty/Loading/Error | Tidak tampil bila data belum ada |

### Track Record Kandidat
| Field | Isi |
|---|---|
| Nama card | Track Record Kandidat |
| Komponen | [rekomendasi/page.tsx:397](../../idx-web/app/rekomendasi/page.tsx) |
| Fungsi | Hit-rate dan return kandidat historis ("diukur, bukan diklaim") |
| Sumber data | `GET /api/recommendations/track` ([app.py:355](../../idx-scraper/src/idx_scraper/api/app.py)) → `analytics.recommendation_track` ([analytics.py:2948](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `research.recommendation_log` (2951–2974) |
| Rumus/Logika | Return sejak tanggal rekomendasi per horizon; hit = return positif |
| Periode/Window | Horizon per log; cache 3600 s |
| Interaksi | — |
| Empty/Loading/Error | Skeleton / EmptyState bila log kosong |

## 4. Data Flow (end-to-end)
```
EOD (prices_pit) + orderbook → analytics.recommendations (gate, skor, grade)
  → research.recommendation_log (dicatat per hari)
  → GET /api/recommendations | /track → SWR → Papan Kandidat + Track Record
```

## 5. Cara Pengambilan / Update Data
- **Perhitungan**: on-demand saat request; hasil mengikuti data EOD terbaru.
- **Pencatatan**: `recommendation_log` diisi saat kalkulasi (dasar Track Record).
- **Job**: tidak ada job khusus; ikut pipeline EOD (`refresh_s2` 16:05 WIB, `refresh_s2_late` 16:20 WIB).
- **Refresh UI**: rekomendasi 300 s; track record 3600 s.
- **Idempotensi**: log dedup per (tanggal, kode) [BELUM TERVERIFIKASI — cek constraint tabel `recommendation_log`].
- **Fallback**: data kosong → EmptyState (tanpa fallback sumber lain).

## 6. Dependensi & Relasi Menu
- Input: [Screener](screener.md) (filter kandidat), [Faktor & Kalibrasi](faktor.md) (bobot).
- Output: dibaca [Ruang Keputusan](ruang-keputusan.md) dan dicatat ke [Jejak Sinyal](jejak-sinyal.md).

## 7. Catatan Batasan & Edge Case
- Bukti pola smart money ditampilkan sebagai alasan, belum menimbang skor (data belum cukup panjang).
- Grade bersifat relatif terhadap pool hari itu; tidak bisa dibandingkan antar hari sebagai probabilitas.
- Alat bantu riset, bukan rekomendasi keuangan.
