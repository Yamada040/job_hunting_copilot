import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";

// E2E のバックエンドにはメールの送信の設定が無いので、送ると「受け付けられない」の案内が出る。
// 実際に送れること・回数制限は、バックエンドのテスト（internal/contact）で確かめる

test.describe("ログインしていないとき", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ホームのフッターから問い合わせを開き、返信先を書いて送れる", async ({ page }) => {
    // 広い画面のホームは、スクロールして最後のセクションまで行かないとフッターが出ない
    await page.goto("/#start");
    await page.locator("footer").getByRole("link", { name: "お問い合わせ" }).click();

    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { name: "お問い合わせ", level: 1 })).toBeVisible();
    // どの画面にも移れないので、下のメニューは出さず、ログインへの入口を出す
    await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "メインメニュー" })).toHaveCount(0);

    await page.getByLabel("返信先のメールアドレス").fill("guest@example.com");
    await page.getByLabel("件名").fill("ログインできません");
    await page.getByLabel("お問い合わせ内容").fill("Googleでログインすると、エラーになります。");
    await page.getByRole("button", { name: "送信する" }).click();

    await expect(page.getByText("現在、お問い合わせを受け付けられない状態です。")).toBeVisible();
  });

  test("返信先のメールアドレスが無いと送れない", async ({ page }) => {
    await page.goto("/contact");
    // ブラウザの必須の確認を外し、画面の確認の文言を確かめる
    await page.locator("form").evaluate((form) => form.setAttribute("novalidate", ""));
    await page.getByLabel("件名").fill("件名");
    await page.getByLabel("お問い合わせ内容").fill("本文");
    await page.getByRole("button", { name: "送信する" }).click();

    await expect(page.getByText("返信先のメールアドレスを入力してください")).toBeVisible();
  });

  test("ログイン画面から問い合わせを開ける", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "お問い合わせ" }).click();

    await expect(page).toHaveURL(/\/contact$/);
  });
});

test.describe("ログインしているとき", () => {
  test.use({ storageState: AUTH_STORAGE_STATE_A });

  test("返信先はログインのメールアドレスになり、下のメニューも出る", async ({ page }) => {
    await page.goto("/contact");

    await expect(page.getByLabel("ログインメール")).not.toHaveValue("");
    await expect(page.getByLabel("返信先のメールアドレス")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "メインメニュー" })).toBeVisible();
  });

  test("返信先を書かずに送れる", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("件名").fill("ESの保存について");
    await page.getByLabel("お問い合わせ内容").fill("保存したESが一覧に出ません。");
    await page.getByRole("button", { name: "送信する" }).click();

    await expect(page.getByText("現在、お問い合わせを受け付けられない状態です。")).toBeVisible();
  });
});
