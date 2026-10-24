import { expect, test } from '@playwright/test';

/**
 * Galat jaringan bukan cacat halaman.
 *
 * Tes ini memeriksa galat JavaScript (hidrasi, baca properti `undefined`,
 * komponen meledak), bukan ketersediaan API :8000 -- kalau API masuk kriteria,
 * suite jadi merah hanya karena layanan mati atau pasar tutup.
 */
const POLA_JARINGAN = [
	'Failed to fetch',
	'Load failed',
	'net::ERR_',
	'ERR_CONNECTION_',
	'WebSocket connection to',
	'favicon'
];

const HALAMAN = ['/', '/rekomendasi', '/pantau'] as const;

for (const halaman of HALAMAN) {
	test(`${halaman} tanpa galat konsol`, async ({ page }) => {
		const galat: string[] = [];

		page.on('console', (pesan) => {
			if (pesan.type() !== 'error') return;
			const teks = pesan.text();
			if (POLA_JARINGAN.some((pola) => teks.includes(pola))) return;
			galat.push(teks);
		});
		page.on('pageerror', (e) => galat.push(`pageerror: ${e.message}`));

		await page.goto(halaman);
		await page.waitForTimeout(1500);

		expect(galat, galat.join('\n---\n')).toEqual([]);
	});
}
