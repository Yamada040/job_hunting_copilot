import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("dialog").filter({ hasText: "LEVEL UP" }), async (dialog) => {
    await dialog.getByRole("button", { name: "閉じる" }).click();
  });
});

test("企業の詳細から、その企業を選んだ状態でESと予定を作ると、詳細の欄に出る", async ({ page }) => {
  const stamp = Date.now();
  const company = `ひも付け商事-${stamp}`;

  await page.goto("/companies/new");
  await page.getByLabel("企業名").fill(company);
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}$/);
  const companyUrl = page.url();
  await expect(page.getByText("この企業のESはまだありません")).toBeVisible();

  await page.getByRole("link", { name: "ESを作成する" }).click();
  await expect(page).toHaveURL(/\/es\/new\?companyId=/);
  await expect(page.getByLabel("企業", { exact: true })).toHaveValue(company);
  await page.locator('input[name="title"]').fill(`ひも付けES-${stamp}`);
  await page.getByRole("button", { name: "下書きとして保存" }).click();
  await expect(page).toHaveURL(/\/es\/[0-9a-f-]{36}$/);

  await page.goto(companyUrl);
  await expect(page.getByRole("link", { name: new RegExp(`ひも付けES-${stamp}`) })).toBeVisible();

  await page.getByRole("button", { name: "予定を追加する" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("タイトルを追加").fill(`ひも付け面接-${stamp}`);
  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`ひも付け面接-${stamp}`) })).toBeVisible();
});
