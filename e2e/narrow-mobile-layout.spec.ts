import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.describe("狭いスマホ幅のレイアウト", () => {
  test("LPの見出しは横にはみ出さない", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /情報過多な就活を/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("下部メニューは横にはみ出さない", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STORAGE_STATE_A, viewport: { width: 360, height: 800 } });
    const page = await context.newPage();
    await page.goto("/dashboard");

    await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await context.close();
  });
});
