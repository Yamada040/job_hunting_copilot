import { expect, test } from "@playwright/test";

// このファイルはstorageStateを使わない（未ログイン状態を検証するため）。
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("未ログイン状態でのアクセス制御", () => {
  test("保護ルート(/dashboard)へのアクセスは/loginへリダイレクトされる", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("保護ルート(/es)へのアクセスは/loginへリダイレクトされる", async ({ page }) => {
    await page.goto("/es");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("公開ページ(/login)はリダイレクトされずそのまま表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
  });

  test("公開ページ(ホーム)はリダイレクトされずそのまま表示される", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/$/);
  });
});
