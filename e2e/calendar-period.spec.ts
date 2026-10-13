import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_B } from "./global-setup";

// ユーザーAは主な操作のテストが今日の予定を足すので、ホームの直近の予定（5件まで）からあふれないようBで行う
test.use({ storageState: AUTH_STORAGE_STATE_B });

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("インターンは終日のときに期間を選べ、詳細に初日から最終日までが出る", async ({ page }) => {
  const title = `夏インターン-${Date.now()}`;
  const today = new Date();
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);

  await page.goto("/calendar");
  await page.getByRole("button", { name: "今日に追加" }).click();
  await page.getByLabel("タイトル").fill(title);
  // 種類は丸いチップ（ラジオボタンの見た目を隠したラベル）なので、利用者と同じくラベルを押す
  await page.getByRole("dialog").getByText("インターン", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "インターン" })).toBeChecked();
  await expect(page.getByLabel("終日", { exact: true })).toBeChecked();
  await page.getByLabel("最終日").fill(dateKey(last));
  await page.getByLabel("備考").fill("受付で名前を伝える");
  await page.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page
    .getByRole("button", { name: new RegExp(title) })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(`${last.getMonth() + 1}月${last.getDate()}日`, { exact: false })).toBeVisible();
  await expect(dialog.getByText("〜", { exact: false })).toBeVisible();
  await expect(dialog.getByText("受付で名前を伝える", { exact: true })).toBeVisible();

  // 終日を外すと期間は消え、時刻を入れる形になる
  await dialog.getByRole("button", { name: "予定を編集" }).click();
  await page.getByLabel("終日", { exact: true }).uncheck();
  await expect(page.getByLabel("最終日")).toHaveCount(0);
  await expect(page.getByLabel("時刻")).toBeVisible();
});
