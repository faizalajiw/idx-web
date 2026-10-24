import { expect, test } from '@playwright/test';

import { RUTE } from './rute';

/**
 * Setiap rute harus tampil, bukan layar kosong.
 *
 * `h1` ATAU `ErrorState` (`role="alert"`). Rute yang isinya bergantung API
 * mengembalikan ErrorState lebih dulu ketika backend mati - persis seperti app
 * Next (`app/jejak-sinyal/page.tsx` juga `return <ErrorState/>` sebelum
 * `<h1>`), jadi menuntut `h1` selalu ada berarti tes gagal di mesin tanpa
 * backend (CI). Yang dijaga tetap sama: tidak ada halaman kosong tanpa judul
 * maupun status.
 */
for (const rute of RUTE) {
	test(`${rute} balas 200 dan tampil`, async ({ page }) => {
		const balasan = await page.goto(rute);

		expect(balasan?.status(), `status ${rute}`).toBe(200);
		await expect(page.locator('h1').or(page.getByRole('alert')).first()).toBeVisible();
	});
}
