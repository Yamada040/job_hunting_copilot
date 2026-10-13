import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

test.use({ storageState: AUTH_STORAGE_STATE_A });
// 前のテストで作った企業を後のテストで使うので、順番に実行する
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const company = `主要操作商事-${stamp}`;

test("企業を登録して編集する", async ({ page }) => {
  await page.goto("/companies/new");
  await page.getByLabel("企業名").fill(company);
  await page.getByRole("button", { name: "追加する", exact: true }).click();
  await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}$/);
  await page.getByLabel("業界").fill("IT");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await page.goto("/companies");
  await expect(page.getByText(company)).toBeVisible();
});

test("ESを下書き保存して提出する", async ({ page }) => {
  await page.goto("/es/new");
  await page.getByLabel("企業", { exact: true }).fill(company);
  await page.getByRole("button", { name: company, exact: true }).click();
  await page.locator('input[name="title"]').fill(`本選考ES-${stamp}`);
  await page.getByRole("button", { name: "下書きとして保存" }).click();
  await expect(page).toHaveURL(/\/es\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "保存して提出する" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "提出する" }).click();
  await expect(page.getByText("提出済み").first()).toBeVisible();
});

test("面接ログを記録する", async ({ page }) => {
  await page.goto("/interviews/new");
  await page.getByLabel("企業", { exact: true }).fill(company);
  await page.getByRole("button", { name: company, exact: true }).click();
  await page.getByLabel("面接の回次").fill("一次");
  await page.getByLabel("実施日").fill("2026-10-01");
  await page.getByPlaceholder("質問 1").fill("志望動機は？");
  await page.getByRole("button", { name: "記録する" }).click();
  await expect(page).toHaveURL(/\/interviews\/[0-9a-f-]{36}$/);
});

test("Webテストの問題を作って解答する", async ({ page }) => {
  await page.goto("/webtests/new");
  await page.getByLabel("タイトル").fill(`問題-${stamp}`);
  await page.getByLabel("問題文").fill("1+1は？");
  await page.getByLabel("選択肢（改行区切り）").fill("1\n2\n3");
  await page.getByLabel("正解").fill("2");
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page).toHaveURL(/\/webtests$/);
  await page.getByRole("link", { name: `問題-${stamp}` }).click();
  await expect(page).toHaveURL(/\/webtests\/[0-9a-f-]{36}$/);
  await page.getByLabel("解答", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "解答を送信" }).click();
  await expect(page.getByText("正解").first()).toBeVisible();
});

test("カレンダーに予定を追加する", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByRole("button", { name: "今日に追加" }).click();
  await page.getByLabel("タイトル").fill(`説明会-${stamp}`);
  // 種類の初めの値は面接なので、オンライン面接のリンクを入れられる
  await page.getByLabel("リンク").fill("https://meet.example.com/abc");
  await page.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: new RegExp(`説明会-${stamp}`) })
    .first()
    .click();
  await expect(page.getByRole("link", { name: "リンクを開く" })).toHaveAttribute(
    "href",
    "https://meet.example.com/abc",
  );
});

test("プロフィールを保存する", async ({ page }) => {
  await page.goto("/profile");
  await page.getByLabel("氏名").fill("テスト 太郎");
  await page.getByLabel("就活で達成したい状態（短文）").fill(`目標-${stamp}`);
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(`目標-${stamp}`)).toBeVisible();
});

test("ダッシュボードのカルーセルを回して画面を開く", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "企業管理を正面に回す" }).click();
  await page.getByRole("button", { name: "企業管理を開く" }).click();
  await expect(page).toHaveURL(/\/companies$/);
});

test("＋から予定をその場で追加すると、ホームの直近の予定に出る", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "追加する（N）" }).click();
  await page.getByRole("button", { name: "予定を追加" }).click();
  await page.getByLabel("タイトル").fill(`すぐ追加-${stamp}`);
  await page.getByRole("dialog").getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  // 直近の予定の行はリンク（カルーセルのカレンダーのカードにも同じ名前が出るので、行に絞る）
  await expect(page.getByRole("link", { name: new RegExp(`すぐ追加-${stamp}`) })).toBeVisible();
});

test("下のメニューのリンクで移動する", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /企業管理/ }).click();
  await expect(page).toHaveURL(/\/companies$/);
});

test("企業を削除する", async ({ page }) => {
  await page.goto("/companies");
  await page.getByText(company).click();
  await page.getByRole("button", { name: /削除/ }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByText(company)).toHaveCount(0);
});
