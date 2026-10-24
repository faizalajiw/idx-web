# idx-web (SvelteKit)

App produksi. Menggantikan app Next di akar repo (kini arsip, tidak dijalankan).
Production: `npm run build` menghasilkan `build/` statis yang disajikan nginx
(lihat `docs/DEPLOY.md`) atau `node deploy/serve.mjs 3000 build`.

## Perintah

```sh
npm install
npm run dev       # http://localhost:3100
npm run lint      # eslint .
npm run format    # prettier --write .
npm run format:check
npm run check     # svelte-check
npm run build     # hasil di build/
npm run preview   # rehearse hasil build di :3100
```

Port dikunci di `vite.config.ts` (`strictPort`). CORS API hanya mengizinkan
`localhost:3000` dan `localhost:3100`.

E2E menjalankan `webServer` sendiri dan `reuseExistingServer` menyala, jadi kalau
:3100 sudah dipakai proses lain tes akan menguji aplikasi yang salah. Pakai port
yang disajikan dari build terbaru, misalnya server statis di :3000:

```sh
E2E_BASE_URL=http://localhost:3000 npx playwright test
```

## Struktur

```
src/app.css              port dari app/globals.css (717 baris)
src/app.html             lang="id", skrip anti-FOUC tema
src/lib/nav.ts           NAV_GROUPS: 5 grup, 14 item
src/lib/components/      shell: Sidebar, Topbar, MobileNav, CommandPalette, Footer, dll
src/routes/              19 rute (14 statis, 5 dinamis)
docs/TASKS.md            status per fase (arsip)
docs/PARITAS.md          peta rute ke berkas + deviasi yang disengaja
docs/HASIL-UKUR.md       byte Next vs SvelteKit (arsip)
docs/bukti/              tangkapan layar fase 1
```

Deploy: `adapter-static` dengan `fallback: 'index.html'`, semua rendering di
klien (`ssr = false`, `prerender = false` di `src/routes/+layout.ts`).

## Konvensi

- Alias `#lib/*` (SvelteKit 3 menghapus `$lib`). Impor modul `.ts` harus menulis
  ekstensinya: `#lib/nav.ts`, bukan `#lib/nav`.
- Ikon dari `@lucide/svelte`.
- Kunci localStorage dipertahankan dari app lama: `ml-theme`,
  `ml-sidebar-collapsed`, `ml-modal`, `ml-risk-pct`, `ml-open-positions`,
  `ml-exposure-pct`.
