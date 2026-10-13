import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test("購読用のURLを作ると、ログインしなくても予定をiCalで読め、作り直すと古いURLは使えなくなる", async ({
  page,
  playwright,
}) => {
  const title = `購読確認-${Date.now()}`;
  await page.goto("/calendar");
  await page.getByRole("button", { name: "今日に追加" }).click();
  await page.getByLabel("タイトル").fill(title);
  await page.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText(title).first()).toBeVisible();

  // 前のテストで作ってあれば作り直す。状態を読み込み終えて、どちらかのボタンが出るまで待ってから見分ける
  const recreate = page.getByRole("button", { name: "URLを作り直す" });
  await expect(page.getByRole("button", { name: "購読用のURLを作る" }).or(recreate)).toBeVisible();
  if (await recreate.isVisible()) {
    await recreate.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "作り直す" }).click();
  } else {
    await page.getByRole("button", { name: "購読用のURLを作る" }).click();
  }
  const url = await page.getByLabel("購読用のURL").inputValue();

  // Googleカレンダーと同じく、ログインの Cookie を持たずに読みに行く
  const anonymous = await playwright.request.newContext();
  const response = await anonymous.get(url);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toContain(title);

  await page.getByRole("button", { name: "URLを作り直す" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "作り直す" }).click();
  await expect(page.getByLabel("購読用のURL")).not.toHaveValue(url);
  expect((await anonymous.get(url)).status()).toBe(404);
  await anonymous.dispose();
});
