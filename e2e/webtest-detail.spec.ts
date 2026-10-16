import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test("Webテストは解答後にだけ正解と解説を表示し、問題を編集できる", async ({ page }) => {
  const stamp = Date.now();
  const title = `詳細確認-${stamp}`;
  const explanation = `解説-${stamp}`;

  await page.goto("/webtests/new");
  await page.getByLabel("タイトル").fill(title);
  await page.getByLabel("問題文").fill("1 + 1 は？");
  await page.getByLabel("選択肢（改行区切り）").fill("1\n2");
  await page.getByLabel("正解").fill("2");
  await page.getByLabel("解説（任意）").fill(explanation);
  await page.getByRole("button", { name: "保存する" }).click();
  await page.getByRole("link", { name: title }).click();

  await expect(page.getByText("解答を送信すると解説を確認できます。")).toBeVisible();
  await expect(page.getByText(explanation)).toHaveCount(0);
  await expect(page.getByText("正解: 2")).toHaveCount(0);

  await page.getByLabel("解答", { exact: true }).selectOption("2");
  const [answerResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/attempts") && response.request().method() === "POST"),
    page.getByRole("button", { name: "解答を送信" }).click(),
  ]);
  expect(answerResponse.ok()).toBe(true);
  await expect(page.getByText("正解: 2")).toBeVisible();
  await expect(page.getByText(explanation)).toBeVisible();

  await page.getByRole("button", { name: "問題を編集" }).click();
  await page.getByLabel("問題文").fill("1 + 2 は？");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("1 + 2 は？")).toBeVisible();
});
