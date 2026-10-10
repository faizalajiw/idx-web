# Aktivitas Broker (`/broker-activity`)

## 1. Ringkasan Fungsi
Peringkat emiten berdasarkan skor akumulasi broker (kombinasi faktor aliran yang lolos uji IC), disertai struktur konsentrasi broker pasar dan uji statistik faktor. Menjawab: "faktor aliran mana yang terbukti, dan emiten mana yang skornya tertinggi hari ini?" Pengguna: analis dan PM. Skor hanya tampil bila tervalidasi.

## 2. Route & Berkas
- URL: `/broker-activity` → [`app/broker-activity/page.tsx`](../../idx-web/app/broker-activity/page.tsx)
- Komponen: `FlowTimelineCard` ([components/FlowTimelineCard.tsx](../../idx-web/components/FlowTimelineCard.tsx)), `BrokerFlowCard` ([components/BrokerFlowCard.tsx](../../idx-web/components/BrokerFlowCard.tsx)), `Card`
- Hook: `useBrokerActivity(25)` ([hooks.ts:151](../../idx-web/lib/hooks.ts), refresh 300 detik); `useBrokerFlow` ([hooks.ts:117](../../idx-web/lib/hooks.ts))
- Backend: `GET /api/broker-activity?limit=25` ([app.py:234](../../idx-scraper/src/idx_scraper/api/app.py)) → `get_broker_activity` ([analytics.py:2333](../../idx-scraper/src/idx_scraper/api/analytics.py)) → `broker_activity_snapshot` ([analytics.py:2192](../../idx-scraper/src/idx_scraper/api/analytics.py))

## 3. Penjelasan Per-Card / Per-Panel

### Peringkat Skor Akumulasi
| Field | Isi |
|---|---|
| Nama card | Peringkat Skor Akumulasi |
| Komponen | [broker-activity/page.tsx](../../idx-web/app/broker-activity/page.tsx) ~baris 355–363 |
| Fungsi | Daftar emiten urut skor 0–100 dari faktor aliran yang tervalidasi |
| Sumber data | `GET /api/broker-activity` → `get_broker_activity` ([analytics.py:2333](../../idx-scraper/src/idx_scraper/api/analytics.py)); skor dari `broker_activity_snapshot` (satu sumber bersama Screener dan Ruang Keputusan) |
| Rumus/Logika | Composite faktor yang lolos gate: \|mean IC\| ≥ 0,05 dan \|ICIR\| ≥ 0,5; arah mengikuti tanda IC. Skor relatif terhadap pasar hari itu. Pilih emiten untuk timeline (klik baris) |
| Periode/Window | Lookback panel 60 hari; horizon bobot = `WEIGHT_HORIZON` |
| Interaksi | Klik baris → timeline aliran dana muncul di bawah |
| Empty/Loading/Error | Belum tervalidasi → `validated=false`, `rows` kosong, status "belum tervalidasi" |

### Uji Statistik Faktor (IC)
| Field | Isi |
|---|---|
| Nama card | Uji Statistik Faktor (IC) |
| Komponen | [broker-activity/page.tsx](../../idx-web/app/broker-activity/page.tsx) ~baris 364–373 |
| Fungsi | Faktor mana yang layak dipakai; faktor gagal tetap ditampilkan tapi tanpa bobot |
| Sumber data | `broker_activity_snapshot.factors` ← `research.factor_ic_history` (run terbaru) |
| Rumus/Logika | `ba.select_factors` (research/broker_activity.py) menerapkan gate IC |
| Periode/Window | Run IC terbaru; horizon `WEIGHT_HORIZON` |
| Interaksi | — |
| Empty/Loading/Error | Pesan "Belum ada run IC" bila tabel kosong |

### Struktur Broker Pasar
| Field | Isi |
|---|---|
| Nama card | Struktur Broker Pasar |
| Komponen | [broker-activity/page.tsx](../../idx-web/app/broker-activity/page.tsx) ~baris 374–380 |
| Fungsi | Konsentrasi transaksi per firma broker, seluruh pasar |
| Sumber data | `GET /api/broker-activity` → field `market` ← `broker_store`/`research.broker_daily` (data broker EOD asli IDX) |
| Rumus/Logika | Porsi transaksi per firma; bukan proksi |
| Periode/Window | Tanggal EOD terbaru (`market.date`) |
| Interaksi | — |
| Empty/Loading/Error | Skeleton / ErrorState "Gagal memuat struktur broker." |

### Komposisi Broker & Timeline (bagian bawah halaman)
| Field | Isi |
|---|---|
| Nama card | Komposisi Broker; Timeline Aliran Dana |
| Komponen | `BrokerFlowCard` ([BrokerFlowCard.tsx](../../idx-web/components/BrokerFlowCard.tsx)); `FlowTimelineCard` ([FlowTimelineCard.tsx](../../idx-web/components/FlowTimelineCard.tsx)) |
| Fungsi | Komposisi kategori broker; timeline skor satu emiten |
| Sumber data | `GET /api/broker-flow` ([app.py:221](../../idx-scraper/src/idx_scraper/api/app.py)); `GET /api/stocks/{code}/broker-activity` ([app.py:378](../../idx-scraper/src/idx_scraper/api/app.py)) |
| Rumus/Logika | Lihat [Aliran Dana Emiten](aliran-dana-emiten.md) |
| Periode/Window | Lookback 60 sesi (timeline) |
| Interaksi | Timeline muncul setelah klik baris di tabel |
| Empty/Loading/Error | Lihat [Aliran Dana Emiten](aliran-dana-emiten.md) |

## 4. Data Flow (end-to-end)
```
Ingest broker EOD + harga + foreign → Postgres (broker_daily, latest_pit, stock_daily)
  → research.ic.build_factor_panel (lookback 60 hari, min_history 60)
  → research.broker_activity.select_factors / latest_factor_rows / composite_scores
  → broker_activity_snapshot (cache 1 jam) → get_broker_activity
  → GET /api/broker-activity?limit=25 → useBrokerActivity (300 s) → tabel + kartu
```
Snapshot yang sama juga dipakai [Screener](screener.md) (`min_broker_score`) dan [Ruang Keputusan](ruang-keputusan.md).

## 5. Cara Pengambilan / Update Data
- **Precomputed sebagian**: data broker EOD diisi job `refresh_s2` (16:05) dan backfill broker 16:30 WIB ([cli.py](../../idx-scraper/src/idx_scraper/cli.py)). IC diisi job `daily_ic` (Senin–Jumat 06:30 WIB).
- **On-demand**: snapshot dihitung saat request pertama setelah cache kosong.
- **Reset cache**: `POST /api/cache/clear`, dipanggil setiap pipeline refresh.
- **Refresh UI**: SWR 300 detik.
- **Idempotensi**: deterministik dari data tersimpan.
- **Fallback**: tidak tervalidasi → tidak ada skor palsu; UI menampilkan status.

## 6. Dependensi & Relasi Menu
- Bergantung pada [Faktor & Kalibrasi](faktor.md) (gate IC dan bobot).
- Ditampilkan juga di [Screener](screener.md) dan [Ruang Keputusan](ruang-keputusan.md).
- Timeline membuka [Aliran Dana Emiten](aliran-dana-emiten.md).

## 7. Catatan Batasan & Edge Case
- Skor 0 tidak sama dengan "tidak ada data": emiten tanpa histori flow ≥ 21 hari tidak diberi skor.
- Tervalidasi = minimal satu faktor lolos gate; bila tidak, halaman menjelaskan alasannya (`reason`).
- Struktur broker pasar adalah data asli IDX, berlaku untuk seluruh pasar.
