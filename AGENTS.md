<!-- BEGIN:web-agent-rules -->

# App produksi ada di `web/`

Frontend yang dipakai adalah **SvelteKit 3 + `adapter-static`** di `web/`; SSR
mati, rute dinamis dilayani fallback SPA `index.html`. App Next di akar repo
diarsipkan sebagai rujukan paritas: jangan menambah fitur di sana, dan jangan
menjalankan `next dev`/`next build`. Blok aturan Next yang dulu ditulis ulang
otomatis oleh `next dev` sudah dihapus bersama app-nya.

- Data hanya dari FastAPI (`PUBLIC_API_BASE_URL`, di-*inline* saat build). Nol
  kalkulasi bisnis di web.
- Bentuk URL mengikuti app Next: `/flow/<kode>`, `/keputusan/<kode>`,
  `/radar/<kode>`, `/stock/<kode>`, `/dossier/<kode>`.
- Hook query: `web/src/lib/hooks.svelte.ts`. Klien fetch: `web/src/lib/api.ts`.
  Tipe mirror backend: `web/src/lib/types.ts`.
- Gerbang sebelum menyatakan selesai, dijalankan di `web/`: `npm run check`
  (0 error, 0 warning), `npm run build`, lalu `npx playwright test`.
- Port: :3100 dev dan preview (`strictPort`, tidak bisa bersamaan), :3000 server
  statis `node deploy/serve.mjs 3000 build` - dijalankan task `IDX-Web` lewat
  `scripts/start-web.bat`.
- Paritas adalah kriteria selesai: baca `web/docs/PARITAS.md` sebelum mengubah
  tampilan, dan catat deviasi yang disengaja di sana.

<!-- END:web-agent-rules -->

## Dokumentasi Project

- Peran agen dan framework analisis multi-agen: [docs/framework-agen.md](./docs/framework-agen.md)
- Sumber data berita: [docs/sumber-data.md](./docs/sumber-data.md)
- Peta menu dan status implementasi: [docs/README.md](./docs/README.md)
