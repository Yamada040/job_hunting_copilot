import { AI_FAILURE_MARKER } from "./support/ai";
import { expect, test } from "./support/new-user";

// AI企業分析は1人1日3回までなので、テストごとに新しいユーザーで行う（e2e/support/new-user.ts）。
// AIは偽の OpenAI 互換サーバー（e2e/fake-ai/server.mjs）が答える

test("ホームで企業名を入れると、企業を登録してAI企業分析を始め、その企業の画面に分析結果が出る", async ({
  newUserPage: page,
}) => {
  const company = "即分析商事";
  await page.goto("/dashboard");
  await page.getByLabel("AI企業分析").fill(company);
  await page.getByLabel("AI企業分析").press("Enter");

  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}#ai-analysis$/);
  await expect(page.getByLabel("企業名", { exact: true })).toHaveValue(company);
  await expect(page.getByText("E2Eの分析結果：求める人物像は、自分で考えて動ける人です。")).toBeVisible();
});

test("登録済みの企業名を入れると、登録し直さずにその企業の画面へ移る", async ({ newUserPage: page }) => {
  const company = "再分析商事";
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

test("ホームの「AI分析がまだの企業」から、画面を移らずに分析を始め、失敗はアバターが伝える", async ({
  newUserPage: page,
}) => {
  // 偽のAIは、プロンプトに目印があると失敗を返す。企業名はAIへの入力に入る
  const name = `${AI_FAILURE_MARKER}商事`;
  await page.goto("/companies/new");
  await page.getByLabel("企業名", { exact: true }).fill(name);
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}$/);

  await page.goto("/dashboard");
  const row = page.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: "分析" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("alert").filter({ hasText: `「${name}」のAI企業分析ができませんでした。` }),
  ).toBeAttached();
});
