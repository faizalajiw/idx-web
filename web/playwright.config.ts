import { defineConfig, devices } from '@playwright/test';

/**
 * Tes regresi papan untuk app SvelteKit.
 *
 * Sama isinya dengan suite app Next di akar repo: bentuk halaman, bukan isi
 * datanya. Bedanya hanya baseURL (`:3100`) dan perintah webServer.
 *
 * `baseURL` memakai `localhost`, bukan `127.0.0.1`: CORS API hanya mengizinkan
 * `http://localhost:3000` dan `http://localhost:3100`.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	workers: 2,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: [['list']],
	outputDir: 'test-results',
	use: {
		baseURL: BASE_URL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
			testIgnore: /layout-mobile\.spec\.ts/
		},
		{
			name: 'mobile-390',
			use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
			testMatch: /(routes|layout-mobile)\.spec\.ts/
		}
	],
	// Lokal: dev server (paling cepat, dan biasanya sudah hidup). CI: `preview`,
	// supaya yang diuji artefak build produksi, bukan kode hasil compile ulang.
	webServer: {
		command: process.env.E2E_SERVER_CMD ?? 'npm run dev',
		url: BASE_URL,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
