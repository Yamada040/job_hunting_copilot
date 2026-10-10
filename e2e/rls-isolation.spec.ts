import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A, AUTH_STORAGE_STATE_B } from "./global-setup";
import { createE2eAdminClient } from "./support/admin-client";
import { E2E_TITLE_PREFIX } from "./support/constants";

test.describe("RLS分離: ユーザーAが作成したESにユーザーBがアクセスできない", () => {
  test.skip(
    !fs.existsSync(AUTH_STORAGE_STATE_A) || !fs.existsSync(AUTH_STORAGE_STATE_B),
    "E2Eテストユーザーの環境変数が未設定のためスキップ（docs/testing/e2e-test-plan.md 参照）",
  );

  // ESの画面はGo移行前の旧スキーマ（company_name 列など）を前提にしており、段階2でスキーマを作り直してから必ず失敗する。
  // ESをGoに移すPRで、新しい画面に合わせて書き直して有効に戻す（docs/backend-design.md 8章）。
  test.fixme("ユーザーBの一覧に表示されず、直接URLアクセスも/esへリダイレクトされる", async ({ browser }) => {
    const title = `${E2E_TITLE_PREFIX} RLS分離テスト-${Date.now()}`;
    const admin = createE2eAdminClient();

    const contextA = await browser.newContext({ storageState: AUTH_STORAGE_STATE_A });
    const pageA = await contextA.newPage();
    await pageA.goto("/es/new");
    await pageA.locator('input[name="title"]').fill(title);
    await pageA.getByRole("button", { name: "下書きとして保存" }).click();
    await expect(pageA).toHaveURL(/\/es$/);
    await expect(pageA.getByText(title)).toBeVisible();
    await contextA.close();

    const { data: createdRow } = await admin.from("es_entries").select("id").eq("title", title).single();
    const esId = createdRow!.id;

    try {
      const contextB = await browser.newContext({ storageState: AUTH_STORAGE_STATE_B });
      const pageB = await contextB.newPage();

      await pageB.goto("/es");
      await expect(pageB.getByText(title)).not.toBeVisible();

      await pageB.goto(`/es/${esId}`);
      await expect(pageB).toHaveURL(/\/es$/);

      await contextB.close();
    } finally {
      await admin.from("es_entries").delete().eq("id", esId);
    }
  });
});
