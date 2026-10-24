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

## Checklist elemen (diisi per rute)

Template yang dipakai untuk setiap rute:

- Judul dan subjudul
- Kartu dan urutannya
- Label kolom tabel
- Tombol, tautan, ikon bermakna
- Chip, badge, penanda status
- State kosong, memuat, error
- Perilaku khusus (shortcut, drawer, filter)
