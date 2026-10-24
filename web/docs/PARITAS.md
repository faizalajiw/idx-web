# Checklist paritas 19 rute

Sumber Next: kolom "Berkas Next" di akar repo. Isi checklist elemen per rute
diisi saat rute itu diporting (fase 3–6), dibandingkan dengan halaman Next yang
sama, lalu dicentang di fase 7.

Cara mengisi satu baris checklist: buka halaman Next, catat teks judul, label
kolom tabel, tombol, tautan, chip, badge, ikon bermakna, dan state kosong/error.
Setelah port, ulangi dari halaman Svelte dan bandingkan daftarnya.

| Rute | Berkas Next | Komponen utama | Status |
|---|---|---|---|
| `/` | `app/page.tsx` | MarketOverview, LatestNewsCard, TopLeadersPanel, TopBrokersPanel, SignalsPanel, TechnicalChart, MarketRegimeCard, DataHealthCard | placeholder |
| `/pantau` | `app/pantau/page.tsx` | daftar alert, form | placeholder |
| `/screener` | `app/screener/page.tsx` | filter, tabel hasil | placeholder |
| `/rekomendasi` | `app/rekomendasi/page.tsx` | parameter portofolio, gerbang rezim, tabel rekomendasi | placeholder |
| `/keputusan` | `app/keputusan/page.tsx` | DecisionWorkspace (tanpa kode) | placeholder |
| `/keputusan/[code]` | `app/keputusan/[code]/page.tsx` | DecisionWorkspace | placeholder |
| `/jejak-sinyal` | `app/jejak-sinyal/page.tsx` | riwayat sinyal | placeholder |
| `/backtest` | `app/backtest/page.tsx` | EquityCurveChart, ringkasan strategi | placeholder |
| `/faktor` | `app/faktor/page.tsx` | tabel faktor, kalibrasi | placeholder |
| `/radar` | `app/radar/page.tsx` | SmartMoneyBanner, daftar emiten | placeholder |
| `/radar/[code]` | `app/radar/[code]/page.tsx` | SmartMoneyBanner, track record | placeholder |
| `/foreign` | `app/foreign/page.tsx` | chart foreign flow, tabel | placeholder |
| `/flow` | `app/flow/page.tsx` | FlowWorkspace (tanpa kode) | placeholder |
| `/flow/[code]` | `app/flow/[code]/page.tsx` | FlowWorkspace | placeholder |
| `/sentimen` | `app/sentimen/page.tsx` | daftar berita, skor | placeholder |
| `/broker-activity` | `app/broker-activity/page.tsx` | BrokerActivityCard | placeholder |
| `/sectors` | `app/sectors/page.tsx` | SectorRotationTable, peta sektor, RegimeBanner | placeholder |
| `/stock/[code]` | `app/stock/[code]/page.tsx` | TechnicalChart, HistoryTable, BrokerSummary, ForeignFlowCard, FlowTimelineCard, BrokerFlowCard, BrokerActivityCard, OwnershipCard | placeholder |
| `/dossier/[code]` | `app/dossier/[code]/page.tsx` | tujuh seksi dossier | placeholder |

## Checklist elemen (diisi per rute)

Template yang dipakai untuk setiap rute:

- Judul dan subjudul
- Kartu dan urutannya
- Label kolom tabel
- Tombol, tautan, ikon bermakna
- Chip, badge, penanda status
- State kosong, memuat, error
- Perilaku khusus (shortcut, drawer, filter)
