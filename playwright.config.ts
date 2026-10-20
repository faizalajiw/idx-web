import { defineConfig, devices } from "@playwright/test";

/**
 * Tes regresi papan (bentuk halaman, bukan isi datanya).
 *
 * `baseURL` memakai `localhost`, bukan `127.0.0.1`: CORS API hanya mengizinkan
 * `http://localhost:3000`, jadi halaman di 127.0.0.1 tidak pernah memuat data.
 *
 * `webServer` memakai dev server yang sudah hidup (`reuseExistingServer`), dan
 * hanya menyalakannya sendiri kalau :3000 kosong. Aturan repo tetap: jangan
 * `next build` selama `next dev` hidup.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Dev server mengompilasi saat diminta; dua pekerja cukup. Lebih dari itu
  // saling menunggu kompilasi dan hasilnya lebih lambat, bukan lebih cepat.
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /layout-mobile\.spec\.ts/,
    },
    {
      name: "mobile-390",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
      testMatch: /(routes|layout-mobile)\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
