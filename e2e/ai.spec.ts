import { type Page } from "@playwright/test";
import { expect, test } from "./support/new-user";

// AIは偽の OpenAI 互換サーバー（e2e/fake-ai/server.mjs）が答える。画面からバックエンドを通してAIを呼び、結果を保存して画面に出すまでを確かめる。
// 結果の文章の中身（プロンプトの良し悪し）は確かめない

// 企業をその場で登録して選ぶ。テストごとに新しいユーザーなので、名前は固定でよい
async function registerCompany(page: Page, name: string) {
  await page.getByLabel("企業", { exact: true }).fill(name);
  await page.getByRole("button", { name: `＋「${name}」を新しく登録する` }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test("ESを保存してAI添削すると、総合点と、保存した本文をもとにした修正版が出る", async ({ newUserPage: page }) => {
  await page.goto("/es/new");
  await registerCompany(page, "添削商事");
  await page.locator('input[name="title"]').fill("本選考ES");
  await page.getByLabel("本文", { exact: true }).fill("サークルの代表として新入生を30人集めました。");
  await page.getByRole("button", { name: "下書きとして保存" }).click();
  await expect(page).toHaveURL(/\/es\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "AI添削する" }).click();

  await expect(page.getByRole("status").filter({ hasText: "AI添削が終わりました" })).toBeAttached();
  await expect(page.getByText("E2Eの添削結果：結論が先にあり、読みやすいESです。")).toBeVisible();
  // 偽のAIは構成8点・具体性6点・企業との一致は採点なしと答えるので、総合点は2つの平均
  await expect(page.getByText("7.0", { exact: true })).toBeVisible();
  await expect(page.getByText("修正版：サークルの代表として新入生を30人集めました。")).toBeVisible();
  await expect(page.getByRole("button", { name: "もう一度添削する" })).toBeVisible();
});

test("面接ログを記録してAI振り返りをすると、振り返り結果が出る", async ({ newUserPage: page }) => {
  await page.goto("/interviews/new");
  await registerCompany(page, "振り返り商事");
  await page.getByLabel("面接の回次").fill("一次");
  await page.getByLabel("実施日").fill("2026-10-01");
  await page.getByPlaceholder("質問 1").fill("志望動機は？");
  await page.getByRole("button", { name: "記録する" }).click();
  await expect(page).toHaveURL(/\/interviews\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "AI振り返りを行う" }).click();

  await expect(page.getByRole("status").filter({ hasText: "AI振り返りが終わりました" })).toBeAttached();
  await expect(page.getByText("E2Eの振り返り結果：結論から話せていました。")).toBeVisible();
  await expect(page.getByRole("button", { name: "もう一度振り返る" })).toBeVisible();
});

// 最後の問いへ移り、確認のダイアログを経て回答を保存する
async function saveAnswers(page: Page, lastQuestion: RegExp) {
  await page.getByRole("button", { name: lastQuestion }).click();
  await page.getByRole("button", { name: "保存する" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "保存する" }).click();
  await expect(page.getByRole("status").filter({ hasText: "回答を保存しました" })).toBeAttached();
}

test("自己分析の回答を保存すると変えられなくなり、AI自己分析は1回だけできる", async ({ newUserPage: page }) => {
  await page.goto("/self-analysis");
  await expect(page.getByRole("button", { name: "AI自己分析を行う" })).toBeDisabled();
  await page.getByRole("textbox", { name: "強み・得意なこと" }).fill("粘り強く続けられる");
  await saveAnswers(page, /^質問7：/);

  // 保存した回答は、入力欄ではなく一覧で出る
  await expect(page.getByText("粘り強く続けられる")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "強み・得意なこと" })).toHaveCount(0);

  await page.getByRole("button", { name: "AI自己分析を行う" }).click();

  await expect(page.getByRole("status").filter({ hasText: "AI自己分析が終わりました" })).toBeAttached();
  await expect(page.getByText("E2Eの分析結果：強みは粘り強さです。")).toBeVisible();
  await expect(page.getByRole("button", { name: "AI自己分析を行う" })).toHaveCount(0);
});

test("適性チェックの回答を保存すると変えられなくなり、AI適性診断は1回だけできる", async ({ newUserPage: page }) => {
  await page.goto("/aptitude");
  await expect(page.getByRole("button", { name: "AI適性診断を行う" })).toBeDisabled();
  await page.getByLabel("SaaS/プロダクト開発").check();
  await saveAnswers(page, /^質問\d+：補足メモ/);

  await expect(page.getByText("SaaS/プロダクト開発")).toBeVisible();
  await expect(page.getByLabel("SaaS/プロダクト開発")).toHaveCount(0);

  await page.getByRole("button", { name: "AI適性診断を行う" }).click();

  await expect(page.getByRole("status").filter({ hasText: "AI適性診断が終わりました" })).toBeAttached();
  await expect(page.getByText("E2Eの診断結果：向いている業界はIT・SaaSです。")).toBeVisible();
  await expect(page.getByRole("button", { name: "AI適性診断を行う" })).toHaveCount(0);
});
