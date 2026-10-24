import adapter from '@sveltejs/adapter-static';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Selama masa paralel app baru dilayani di :3100 (CORS API hanya mengizinkan
	// :3000 dan :3100). strictPort: jangan diam-diam pindah port.
	server: { port: 3100, strictPort: true },
	preview: { port: 3100, strictPort: true },
	// Vite hanya meng-inline variabel berawalan VITE_ secara bawaan, sedangkan
	// alamat API memakai awalan PUBLIC_ (lihat `.env.example`). Tanpa baris ini
	// `import.meta.env.PUBLIC_API_BASE_URL` selalu undefined dan build produksi
	// diam-diam memakai localhost:8000.
	envPrefix: ['VITE_', 'PUBLIC_'],
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// SPA: satu index.html sebagai fallback, tanpa proses Node di server.
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
