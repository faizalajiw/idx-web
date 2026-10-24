# Checklist paritas 19 rute

Sumber Next: kolom "Berkas Next" di akar repo. Isi checklist elemen per rute
diisi saat rute itu diporting (fase 3–6), dibandingkan dengan halaman Next yang
sama, lalu dicentang di fase 7.

Cara mengisi satu baris checklist: buka halaman Next, catat teks judul, label
kolom tabel, tombol, tautan, chip, badge, ikon bermakna, dan state kosong/error.
Setelah port, ulangi dari halaman Svelte dan bandingkan daftarnya.

| Rute | Berkas Next | Komponen utama | Status |
|---|---|---|---|
| `/` | `app/page.tsx` | MarketOverview, NewsCards, TopLeadersPanel, TopBrokersPanel, SignalsPanel, MarketRegimeCard, DataHealthCard, TechnicalChart | selesai |
| `/pantau` | `app/pantau/page.tsx` | WatchlistTable, AlertRules, TelegramStatus, SmartMoneyWatchCard, TechnicalChart | selesai |
| `/screener` | `app/screener/page.tsx` | filter, tabel hasil, ScreenerFactorsModal | selesai |
| `/rekomendasi` | `app/rekomendasi/page.tsx` | PortfolioStrip, ClaimRecord, papan kandidat, track record | selesai |
| `/keputusan` | `app/keputusan/page.tsx` | DecisionWorkspace (tanpa kode) | selesai |
| `/keputusan/[code]` | `app/keputusan/[code]/page.tsx` | DecisionWorkspace | selesai |
| `/jejak-sinyal` | `app/jejak-sinyal/page.tsx` | tiga tab horizon, tabel sinyal terbaru | selesai |
| `/backtest` | `app/backtest/page.tsx` | EquityCurveChart, RebalanceLedger, form parameter | selesai |
| `/faktor` | `app/faktor/page.tsx` | tabel faktor, kalibrasi | selesai |
| `/radar` | `app/radar/page.tsx` | SmartMoneyBanner, daftar emiten | selesai |
| `/radar/[code]` | `app/radar/[code]/page.tsx` | SmartMoneyBanner, track record | selesai |
| `/foreign` | `app/foreign/page.tsx` | ForeignFlowCard, chart arus harian, daftar mover | selesai |
| `/flow` | `app/flow/page.tsx` | FlowWorkspace (tanpa kode) | selesai |
| `/flow/[code]` | `app/flow/[code]/page.tsx` | FlowWorkspace | selesai |
| `/sentimen` | `app/sentimen/page.tsx` | gauge suhu pasar, breadth, akumulasi/distribusi | selesai |
| `/broker-activity` | `app/broker-activity/page.tsx` | BrokerActivityCard, BrokerFlowCard, FlowTimelineCard | selesai |
| `/sectors` | `app/sectors/page.tsx` | SectorRotationTable, peta sektor, RegimeBanner | selesai |
| `/stock/[code]` | `app/stock/[code]/page.tsx` | TechnicalChart, HistoryTable, BrokerSummary, ForeignFlowCard, FlowTimelineCard, BrokerFlowCard, BrokerActivityCard, OwnershipCard, EventStudyCard | selesai |
| `/dossier/[code]` | `app/dossier/[code]/page.tsx` | tujuh seksi dossier | selesai |

## `/sectors`

- Judul "Analisis Sektor", subjudul "Rata-rata pergerakan, nilai transaksi, dan arus asing per sektor · <tanggal>", `LastUpdated`.
- Banner "Kondisi IHSG": badge rezim + ADX, DI +/−, volatilitas, saran taktis, gerbang rezim, `FreshnessBadge` basis indeks, `LastUpdated`.
- Kartu "Rotasi Sektor — Aktivitas Broker": 23 kartu sektor, masing-masing nama, jumlah emiten, badge fase (Akumulasi/Membaik/Memudar/Terpuruk/Stabil), median skor, Δ 5 sesi, Δ 21 sesi, breadth, sparkline; paragraf penjelas metode di bawah grid.
- Kartu "Peta Sektor": tabel 6 kolom (Sektor, Rata-rata %, Breadth, Value, Foreign Net, Top Stock), heatmap baris, bar breadth, tautan `/stock/<kode>` pada Top Stock.
- Catatan kaki klasifikasi sektor.
- State: skeleton tinggi 96 saat memuat, `EmptyState` saat kosong, `ErrorState` saat gagal, pesan "belum tervalidasi" saat rotasi belum lolos IC.

## Audit paritas 2026-10-24

Diukur langsung terhadap dua app yang hidup bersamaan (`next start -p 3000`
dan dev SvelteKit :3100), viewport 1440. Yang dibandingkan: `h1`, daftar `h2`,
header tabel, jumlah baris `tbody`, jumlah `.card`, dan `scrollWidth`.

| Rute | h1 | h2 | header tabel | baris | kartu | scrollW |
|---|---|---|---|---|---|---|
| `/` | sama | sama | - | - | 12 / 12 | 1432 / 1432 |
| `/pantau` | sama | sama | - | - | 6 / 6 | 1432 / 1432 |
| `/screener` | sama | sama | - | - | 1 / 1 | 1432 / 1432 |
| `/rekomendasi` | sama | sama | - | - | 25 / 25 | 1432 / 1432 |
| `/keputusan` | sama | sama | - | - | 2 / 2 | 1440 / 1440 |
| `/jejak-sinyal` | sama | sama | 7 kolom sama | 40 / 40 | 9 / 9 | 1432 / 1432 |
| `/backtest` | sama | sama | - | - | 7 / 7 | 1432 / 1432 |
| `/faktor` | sama | sama | sama | 42 / 42 | - | 1432 / 1432 |
| `/radar` | sama | sama | - | - | sama | 1432 / 1432 |
| `/foreign` | sama | sama | - | - | 4 / 4 | 1432 / 1432 |
| `/flow` | sama | sama | - | - | 1 / 1 | 1440 / 1440 |
| `/sentimen` | sama | sama | - | - | 6 / 6 | 1432 / 1432 |
| `/broker-activity` | sama | sama | sama | 44 / 44 | - | 1432 / 1440 |
| `/sectors` | sama | sama | 6 kolom sama | 23 / 23 | 23 / 23 | 1432 / 1432 |
| `/stock/BBCA` | sama | sama | 12 kolom sama | 26 / 26 | 15 / 15 | - |
| `/dossier/BBCA` | sama | sama | - | - | 7 / 7 | - |
| `/flow/BBRI` | sama | sama | - | - | 3 / 3 | - |
| `/radar/BBRI` | sama | sama | - | - | 2 / 2 | - |
| `/keputusan/BBRI` | sama | sama | - | - | 8 / 8 | - |

Satu selisih `scrollWidth` di `/broker-activity` (1432 vs 1440): app Next
menampilkan scrollbar vertikal, app Svelte tidak pada snapshot itu. Keduanya
tidak luber (isi <= layar).

Reflow 390 px di app Svelte: 19 rute, `scrollWidth` 382 atau 390 (sama dengan
lebar layar bila tidak ada scrollbar). Tanpa luber horizontal.

Perbedaan yang disengaja dan berlaku di semua rute:

- Judul tab `<Halaman> · Market Labs`; app Next hanya "Market Labs" kecuali
  tiga halaman yang punya metadata sendiri.
- Recharts diganti `LineArea`/`Bars`; tooltip menampilkan nama seri, bukan
  hanya label titik.
- Ikon lucide 1.x: sepuluh nama yang berganti dipetakan ke geometri yang sama
  (`Filter`→`Funnel`, `History`→`RotateCcwClock`, `Waves`→`WavesHorizontal`,
  `Globe2`→`Earth`, `AlertTriangle`→`TriangleAlert`, `CheckCircle2`→`CircleCheck`,
  `HelpCircle`→`CircleQuestionMark`, `BarChart3`→`ChartColumn`,
  `LineChart`→`ChartLine`, `Building2`→`BuildingComplex`). Dua di antaranya
  sempat salah petakan (`CircleCheckBig`, `Building`) dan dikoreksi di fase 10:
  path SVG-nya dibandingkan langsung dengan `lucide-react` 1.47.

## Audit sisa migrasi (fase 10)

Pemeriksaan ulang seluruh permukaan migrasi, bukan hanya rute yang sudah
dicentang:

| Yang dibandingkan | Hasil |
|---|---|
| 43 komponen `components/*.tsx` | semuanya punya padanan Svelte (`States` dipecah jadi `EmptyState`, `ErrorState`, `Skeleton`) |
| 224 ekspor `lib/*.ts` Next | semua nama ada di `web/src/lib` |
| 48 hook + `refreshInterval` per hook | 48 lawan 48, 0 beda interval |
| Endpoint `/api/*` di `api.ts` | 7 lawan 7, sama |
| 63 selector kelas `globals.css` | 63 lawan 63, tanpa selisih |
| `var(--x)` yang dipakai | 37 dipakai, semuanya terdefinisi |
| `aria-label` + `role` | 28 label Next semua ada; dua label baru muncul setelah halaman galat diport |
| Glyph ikon per berkas | 63 berkas dibandingkan lewat path SVG: 0 glyph hilang |
| Kunci localStorage | 6 kunci sama |
| `public/logos` | 1002 berkas, termasuk `manifest.json` |
| Grup menu sidebar | 5 grup, 14 item, label dan href sama |
| Pintasan keyboard | Ctrl/Cmd+K, Esc, panah tab, Enter watchlist sama |

Temuan yang diperbaiki:

- **Halaman galat tidak ada.** Rute tak dikenal menampilkan "404 Not Found"
  polos SvelteKit, sedangkan Next punya `app/not-found.tsx` ("Halaman tidak
  ditemukan", tombol "Kembali ke beranda"/"Kembali", ThemeToggle) dan
  `app/error.tsx` ("Halaman ingin disajikan tapi kami mengalami masalah.",
  "Muat lagi"/"Kembali", aria-label "Muat ulang halaman"/"Kembali ke halaman
  sebelumnya"). Sekarang `src/routes/+error.svelte` bercabang pada
  `page.status === 404` dengan copy, tombol, dan atribut yang sama.
- **Dua bentuk URL untuk satu tampilan.** `/flow` memakai `?code=` di Svelte
  sedangkan Next memakai `/flow/<kode>`; `SmartMoneyBanner` dan `/radar/[code]`
  sudah memakai bentuk path. Form, chip saran, dan `goto` disamakan ke
  `/flow/<kode>`; pembacaan `?code=` dihapus supaya hanya ada satu bentuk.
- **Dua ikon berbeda geometri** (lihat daftar deviasi di atas).

Deviasi yang diterima:

- `app/loading.tsx` ("Menyiapkan halaman...") tidak diport. SPA tidak punya
  suspense per rute: perpindahan halaman instan dan data dimuat dengan skeleton
  di dalam komponen. Halaman `+error.svelte` yang baru menambah 1,2 KB gzip
  pada muatan awal setiap rute karena node galat dimuat bersama shell.

## Suite tes

`web/e2e/` menyalin suite app Next dengan baseURL `:3100`: 14 rute x (status
200 + h1 tampil) dan (tidak luber di 390), tiga halaman bebas galat konsol.
Fase 10 menambah `galat-dan-flow.spec.ts` (halaman tidak ditemukan, form
`/flow` berpindah ke `/flow/<kode>`). Total 47 tes, semuanya lulus.

## Checklist elemen (diisi per rute)

Template yang dipakai untuk setiap rute:

- Judul dan subjudul
- Kartu dan urutannya
- Label kolom tabel
- Tombol, tautan, ikon bermakna
- Chip, badge, penanda status
- State kosong, memuat, error
- Perilaku khusus (shortcut, drawer, filter)
