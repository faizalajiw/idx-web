import { expect, test } from "@playwright/test";

import { RUTE } from "./rute";

for (const rute of RUTE) {
  test(`${rute} balas 200 dan judulnya tampil`, async ({ page }) => {
    const balasan = await page.goto(rute);

    expect(balasan?.status(), `status ${rute}`).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}
