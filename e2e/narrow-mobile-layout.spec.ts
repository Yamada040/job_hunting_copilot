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
    const context = await browser.newContext({
      storageState: AUTH_STORAGE_STATE_A,
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/dashboard");

    await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await context.close();
  });
});

test.describe("スマホの幅で主要な画面を回る", () => {
  test.use({ storageState: AUTH_STORAGE_STATE_A, viewport: { width: 360, height: 800 } });

  const paths = [
    "/dashboard",
    "/es",
    "/es/new",
    "/companies",
    "/companies/new",
    "/calendar",
    "/interviews",
    "/interviews/new",
    "/webtests",
    "/webtests/new",
    "/self-analysis",
    "/aptitude",
    "/profile",
    "/contact",
  ];

  for (const path of paths) {
    test(`${path} は横にはみ出さない`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // 一覧などは読み込んでから中身が出るので、通信が落ち着いてから測る
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("下のメニューで、よく使う画面と「その他」の画面へ移れる", async ({ page }) => {
    await page.goto("/dashboard");
    const menu = page.getByRole("navigation", { name: "メインメニュー" });

    for (const [label, path] of [
      ["ES管理", "/es"],
      ["企業管理", "/companies"],
      ["カレンダー", "/calendar"],
      ["面接ログ", "/interviews"],
      ["ダッシュボード", "/dashboard"],
    ] as const) {
      await menu.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }

    await menu.getByRole("button", { name: "その他のメニュー" }).click();
    await page.getByRole("menuitem", { name: "Webテスト対策" }).click();
    await expect(page).toHaveURL(/\/webtests$/);
  });
});
