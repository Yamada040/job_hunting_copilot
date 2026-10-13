import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });
// 同じ企業名を使うので、同時に登録して 409 にならないよう順番に実行する
test.describe.configure({ mode: "serial" });

const company = `即分析商事-${Date.now()}`;

// E2E のバックエンドにはAIのキーが無く、分析の結果は出ないので、分析を頼んだところまでを確かめる
test("ホームで企業名を入れると、企業を登録してAI企業分析を始め、その企業の画面へ移る", async ({ page }) => {
  await page.goto("/dashboard");
  const analysis = page.waitForRequest(
    (r) => r.method() === "POST" && /\/v1\/companies\/[^/]+\/analysis$/.test(r.url()),
  );
  await page.getByLabel("AI企業分析").fill(company);
  await page.getByLabel("AI企業分析").press("Enter");

  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}#ai-analysis$/);
  await expect(page.getByLabel("企業名", { exact: true })).toHaveValue(company);
  expect((await analysis).url()).toContain(page.url().match(/companies\/([0-9a-f-]{36})/)![1]);
});

test("登録済みの企業名を入れると、登録し直さずにその企業の画面へ移る", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByLabel("AI企業分析").fill(company);
  await page.getByLabel("AI企業分析").press("Enter");
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}#ai-analysis$/);
  const url = page.url();

  await page.goto("/dashboard");
  await page.getByLabel("AI企業分析").fill(company);
  await page.getByLabel("AI企業分析").press("Enter");
  await expect(page).toHaveURL(url);
});

test("ホームの「AI分析がまだの企業」から、画面を移らずに分析を始められる", async ({ page }) => {
  const name = `その場分析商事-${Date.now()}`;
  await page.goto("/companies/new");
  await page.getByLabel("企業名", { exact: true }).fill(name);
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}$/);

  await page.goto("/dashboard");
  const row = page.getByRole("listitem").filter({ hasText: name });
  const analysis = page.waitForRequest(
    (r) => r.method() === "POST" && /\/v1\/companies\/[^/]+\/analysis$/.test(r.url()),
  );
  await row.getByRole("button", { name: "分析" }).click();
  await analysis;
  await expect(page).toHaveURL(/\/dashboard$/);
  // AIのキーが無いので失敗し、その行に理由が出る
  await expect(row.getByRole("alert")).toBeVisible();
});
