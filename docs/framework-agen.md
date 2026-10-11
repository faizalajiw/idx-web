# Framework Analisis Saham Multi-Agen

Dokumen ini adalah sumber kanonik peran agen untuk Market Labs. Sumber data berita ada di [sumber-data.md](./sumber-data.md).

Framework memecah tugas trading menjadi peran khusus. Setiap peran punya input, output, dan batas kewenangan yang jelas.

## 1. Tim Analis

Analis bekerja bersamaan dengan tools masing-masing. Debat riset dimulai setelah seluruh laporan selesai.

| Peran | Tugas | Input utama | Output |
|---|---|---|---|
| Analis Fundamental | Mengevaluasi laporan keuangan dan metrik kinerja, mengidentifikasi nilai intrinsik dan red flag | Laporan keuangan (idx.co.id), rasio emiten | Laporan fundamental: nilai intrinsik, red flag |
| Analis Sentimen | Mengagregasi headline menjadi satu pembacaan sentimen jangka pendek | Headline berita, sentimen sosial | Skor sentimen harian |
| Analis Berita | Memantau berita global dan makro, menginterpretasikan dampaknya ke pasar | Berita market, data makro (BI rate, Fed, inflasi) | Ringkasan dampak peristiwa |
| Analis Teknikal | Mendeteksi pola trading dan memprediksi pergerakan harga | OHLCV, MACD, RSI | Sinyal teknikal dan level kunci |

## 2. Tim Peneliti (Researcher Team)

- Peneliti bullish dan bearish menilai secara kritis insight Tim Analis.
- Debat terstruktur menyeimbangkan potensi keuntungan dengan risiko.
- Output: rangkuman argumen bullish dan bearish dengan bukti masing-masing.

## 3. Agen Trader

- Menyusun laporan dari Tim Analis dan Tim Peneliti.
- Menentukan timing dan magnitude transaksi.
- **Batas**: hanya mengusulkan transaksi. Keputusan akhir ada di Portfolio Manager.

## 4. Manajemen Risiko dan Manajer Portofolio

- **Tim Manajemen Risiko**: terus menilai risiko portofolio (volatilitas, likuiditas, faktor risiko lain). Menyesuaikan strategi dan memberi laporan penilaian ke Portfolio Manager.
- **Manajer Portofolio**: menyetujui atau menolak proposal transaksi.
- Jika disetujui, order dikirim ke bursa simulasi dan dieksekusi.

## 5. Tim Engineering

Berjalan paralel dengan Tim Analis dan bekerja terus di background. Tugasnya menjaga data dan eksekusi tetap andal.

| Peran | Tugas |
|---|---|
| Data Engineer / Pipeline Agent | Menjaga ketersediaan dan kualitas data real-time (harga, berita, on-chain, sentimen sosial). Memastikan tidak ada data telat, hilang, atau korup sebelum masuk analisis. |
| Execution Engineer / Infra Agent | Koneksi API, latency monitoring, reliability eksekusi order. Menerjemahkan keputusan Trader Agent. |
| System Monitoring Agent | Mengawasi uptime, error rate, dan anomali output antar-agen. Memberi alert sebelum output tidak masuk akal sampai ke Portfolio Manager. |

## 6. Tim Frontend

Bertanggung jawab atas kualitas visual dan teknis antarmuka. Target: UI yang terasa dirancang dengan intensi, bukan template generik yang mudah dikenali sebagai buatan AI.

Hindari: layout kaku-simetris, gradient ungu-biru klise, kartu dengan shadow seragam, spacing "aman" tapi hambar, hero section generik, ikon dari satu library tanpa penyesuaian, dan copy placeholder yang tidak diganti.

| Peran | Tugas |
|---|---|
| UI/UX Craft Agent | Menentukan arah desain spesifik per proyek: tipografi, palet, layout sesuai konteks produk. |
| Interaction & Motion Agent | Interaksi dan transisi yang punya tujuan. State hover, loading, dan feedback harus terasa hidup. Bukan animasi dekoratif. |
| Code Quality Agent | Komponen modern yang reusable, accessible, responsive. Tidak ada kode tempelan hasil copy-paste. |
| Review/QA Agent | Audit hasil akhir dengan checklist "no AI slop": generik? elemen asal tempel? konsisten dengan identitas visual? |

## 7. Tim Trainer

Menjaga dan meningkatkan kualitas output seluruh agen (trading dan frontend) lewat iterasi, evaluasi, dan kalibrasi berkelanjutan. Tidak dideploy sekali lalu dibiarkan.

| Peran | Tugas |
|---|---|
| Evaluation Agent | Menyusun dan menjalankan test case dan benchmark untuk mengukur akurasi analisis dan konsistensi desain. Membandingkan hasil dari waktu ke waktu. |
| Feedback Loop Agent | Mengumpulkan feedback dari hasil nyata (performa trading, review desain, komplain user). Menerjemahkannya jadi penyesuaian prompt atau parameter. |
| Calibration Agent | Menyesuaikan arah strategi atau gaya (risk appetite trader, konsistensi desain) berdasarkan tren performa, agar sistem tidak drift dari tujuan awal. |

## Catatan Status

- Dokumen ini mendeskripsikan **peran**, bukan status implementasi. Status implementasi per fitur ada di [README.md](./README.md).
- Peran yang belum ada implementasinya di kode harus ditandai `[BELUM TERVERIFIKASI]` sampai dibuktikan.
