import { expect, test } from "@playwright/test";

/**
 * Paritas halaman galat Next (`app/not-found.tsx` + `app/error.tsx`) dan bentuk
 * URL aliran dana (`/flow/<kode>`, bukan `/flow?code=`).
 */

test("rute tak dikenal menampilkan halaman tidak ditemukan", async ({ page }) => {
	const balasan = await page.goto("/halaman-yang-tidak-ada");

	// Fallback SPA tetap membalas 200; status 404 hidup di sisi klien.
	expect(balasan?.status()).toBe(200);
	await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Kembali ke beranda" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Kembali", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: /^Ganti ke tema/ }).first()).toBeVisible();
});

test("form /flow berpindah ke /flow/<kode>", async ({ page }) => {
	await page.goto("/flow");
	await page.getByLabel("Kode emiten").fill("bbri");
	await page.getByRole("button", { name: "Lihat" }).click();

	await expect(page).toHaveURL(/\/flow\/BBRI$/);
});
