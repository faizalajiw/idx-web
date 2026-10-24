import { expect, test } from '@playwright/test';

import { RUTE } from './rute';

/**
 * Tidak ada luber horizontal di 390 px.
 *
 * Cacat yang dijaga: `/stock/PEGE` pernah luber 33 px karena satu angka panjang
 * di tabel. Beda satu piksel diberi toleransi karena pembulatan subpiksel.
 */
for (const rute of RUTE) {
	test(`${rute} tidak luber horizontal`, async ({ page }) => {
		await page.goto(rute);
		await page.locator('h1').first().waitFor();
		// Data dimuat klien sesudah HTML pertama; beri satu ketukan supaya tabel
		// yang baru terisi ikut diukur, bukan kerangka kosongnya.
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(400);

		const ukur = await page.evaluate(() => {
			const akar = document.documentElement;
			return { lebar: akar.clientWidth, isi: akar.scrollWidth };
		});

		expect(
			ukur.isi,
			`${rute} luber ${ukur.isi - ukur.lebar} px (isi ${ukur.isi}, layar ${ukur.lebar})`
		).toBeLessThanOrEqual(ukur.lebar + 1);
	});
}
