import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test("無いURLを開くと404の画面が出て、ホームへ戻れる", async ({ page }) => {
  const response = await page.goto("/no-such-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "ページが見つかりません" })).toBeVisible();
  await page.getByRole("link", { name: "ホームへ戻る" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("無い企業のURLを開くと、見つからないと出て一覧へ戻れる", async ({ page }) => {
  await page.goto("/companies/00000000-0000-4000-8000-000000000000");

  await expect(page.getByText("企業が見つかりません")).toBeVisible();
  await page.getByRole("link", { name: "企業の一覧へ戻る" }).click();
  await expect(page).toHaveURL(/\/companies$/);
});
