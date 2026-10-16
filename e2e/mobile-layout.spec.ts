import { expect, test } from "@playwright/test";

import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test("狭いスマホ幅でもヘッダーからログアウトでき、横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dashboard");

  await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
