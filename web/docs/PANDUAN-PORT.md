# Panduan port halaman Next → SvelteKit

Dokumen kerja untuk fase 4–6. Baca ini sebelum menulis satu baris pun.

## Sumber dan tujuan

- Sumber paritas: app Next di akar repo (`app/**/page.tsx`, `components/*.tsx`).
- Tujuan: `web/src/routes/**/+page.svelte` dan `web/src/lib/components/*.svelte`.
- Salin **isi dan perilaku** halaman Next apa adanya: teks, urutan kartu, label
  kolom, tombol, tautan, badge, ikon, state kosong/memuat/error.
- Bahasa: Indonesia, gaya institusional. Teks sumber di app Next sering rusak
  encoding (`�?"`, `�?o`). Tulis ulang dengan tanda baca yang benar, jangan
  menyalin byte rusaknya.

## Contoh yang sudah jadi

- Halaman: `web/src/routes/sectors/+page.svelte`
- Kartu data + tabel + sparkline: `web/src/lib/components/SectorRotationTable.svelte`
- Chart: `web/src/lib/components/TechnicalChart.svelte`

## Aturan teknis

1. **Svelte 5 runes.** `$props()`, `$state()`, `$derived()`, `$derived.by()`,
   `$effect()`. Tidak ada `export let`, tidak ada `onMount` kecuali memang perlu
   (mis. event listener global).
2. **Impor.** Alias `$lib` tidak ada di SvelteKit 3. Pakai subpath `#lib/*`
   **dengan ekstensi**: `#lib/hooks.svelte.ts`, `#lib/types.ts`,
   `#lib/format.ts`, `#lib/components/Card.svelte`.
3. **Ikon.** `import { Bell } from "@lucide/svelte"`. Nama yang tidak ada di
   lucide 1.x dipetakan: `Filter`→`Funnel`, `History`→`RotateCcwClock`,
   `Waves`→`WavesHorizontal`, `Globe2`→`Earth`, `Building2`→`Building`,
   `AlertTriangle`→`TriangleAlert`, `CheckCircle2`→`CircleCheckBig`,
   `HelpCircle`→`CircleQuestionMark`.
4. **Komponen bersama yang sudah ada** (jangan bikin ulang, jangan ubah):
   `Card`, `InfoHint`, `Skeleton`, `EmptyState`, `ErrorState`, `FreshnessBadge`,
   `RegimeBanner`, `SectorRotationTable`, `LastUpdated`, `TechnicalChart`,
   `LineArea`, `Bars`.
   - `<Card title="..." subtitle="..." info="...">` — `title` boleh string;
     isi kartu lewat default slot (children), `right` lewat
     `{#snippet right()}…{/snippet}`.
   - `LineArea`: `labels`, `series[{name, values, color, kind:"line"|"area",
     width, dashed, fill, fmt}]`, `height`, `yDomain`, `yTicks`, `yFmt`, `xFmt`,
     `refs[{y, color, dashed, label}]`, `legend`, `xTickGap`.
   - `Bars`: `labels`, `series[{name, values, color, colors?, fmt?}]`, `height`,
     `stacked`, `normalize`, `maxBarSize`, `radius`, `refY`, `yDomain`, `yFmt`,
     `xFmt`, `legend`, `footer`, `xTickGap`.
5. **Data.** Semua hook data sudah ada di `#lib/hooks.svelte.ts`, nama dan
   kuncinya sama dengan `lib/hooks.ts` app Next. Hasilnya:
   `{ data, error, isLoading, isValidating, mutate }`.
   - Parameter yang bisa berubah: kirim getter, mis. `useTechnical(() => code)`.
   - `error` bertipe `unknown`. Pola pesan:
     `{x.error instanceof Error ? x.error.message : String(x.error)}`.
   - Mutasi: `useAddToWatchlist()`, `useRemoveFromWatchlist()`,
     `useCreateAlert()`, `useDeleteAlert()`, `useJournalHalt()`,
     `useJournalResume()` mengembalikan fungsi async.
6. **Portofolio.** `import { usePortfolio, asNumber, portfolioQuery } from
   "#lib/portfolio.svelte.ts"`. `state` adalah objek `$state` modul; `setField`
   menulis ke localStorage.
7. **Atribut DOM.** `className`→`class`, `htmlFor`→`for`, `onClick`→`onclick`,
   `onChange`→`onchange`, `onInput`→`oninput`, `onSubmit`→`onsubmit`,
   `onKeyDown`→`onkeydown`, `style={{ a: b }}`→`style="a: {b}"`,
   `dangerouslySetInnerHTML` tidak dipakai (tidak ada di halaman).
   Form: `onsubmit={(e) => { e.preventDefault(); ... }}`.
8. **Link.** `<a href="/rute">` biasa; navigasi programatik:
   `import { goto } from "$app/navigation"`.
9. **Query string / param.** `import { page } from "$app/state"` lalu
   `page.url.searchParams.get("...")` / `page.params.code`. Untuk reaktif
   terhadap perubahan, baca di dalam `$derived`.
10. **Judul halaman.**
    `<svelte:head><title>Judul · Market Labs</title></svelte:head>`.
11. **Kelas.** Salin kelas Tailwind dari Next. Kelas global (`card`, `badge
    badge-buy`, `data-table`, `btn`, `skeleton`, `text-up`, `text-down`,
    `text-muted`) sudah ada di `src/app.css`.
12. **Tanpa `"use client"`**, tanpa React, tanpa SWR, tanpa Recharts.

## Larangan

- Jangan menyentuh `src/lib/hooks.svelte.ts`, `src/lib/query.svelte.ts`,
  `src/lib/api.ts`, `src/app.css`, komponen bersama di daftar atas, atau apa pun
  di luar berkas yang ditugaskan. Kalau butuh perubahan di sana, tulis di
  laporan, jangan lakukan.
- Jangan menjalankan `npm run dev`, `npm run build`, atau `npm run preview`:
  dev server sudah hidup di :3100. Verifikasi cukup `npm run check` dari `web/`.
- Jangan `git add`, `git commit`, atau `git push`.
- Jangan menambah dependensi.

## Verifikasi wajib

1. `cd web && npm run check` → 0 error, 0 warning. Perbaiki semua temuan di
   berkas yang kamu tulis.
2. Baca ulang halaman Next dan pastikan tidak ada elemen yang hilang; tulis
   checklist singkat di laporan: judul, kartu, kolom tabel, tombol, badge,
   state kosong/error.

## Laporan akhir

Tulis ringkas: berkas yang dibuat, hook yang dipakai, komponen bersama yang
dipakai, perbedaan yang disengaja (kalau ada), dan hasil `npm run check`.
