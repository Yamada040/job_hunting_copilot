import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";
import { createE2eAdminClient } from "./support/admin-client";
import { E2E_TITLE_PREFIX } from "./support/constants";

test.describe("ES作成 → 一覧反映", () => {
  test.skip(
    !fs.existsSync(AUTH_STORAGE_STATE_A),
    "E2Eテストユーザーの環境変数が未設定のためスキップ（docs/testing/e2e-test-plan.md 参照）",
  );
  test.use({ storageState: AUTH_STORAGE_STATE_A });

  // ESの画面はGo移行前の旧スキーマ（company_name 列など）を前提にしており、段階2でスキーマを作り直してから必ず失敗する。
  // ESをGoに移すPRで、新しい画面に合わせて書き直して有効に戻す（docs/backend-design.md 8章）。
  test.fixme("タイトルを入力して保存すると一覧に反映される", async ({ page }) => {
    const title = `${E2E_TITLE_PREFIX} タイトル-${Date.now()}`;
    const admin = createE2eAdminClient();

    // 本番Supabaseを流用しているため、途中でアサーションが失敗しても
    // 作成した行を必ず削除できるようtry/finallyで囲む。
    try {
      await page.goto("/es/new");
      await page.locator('input[name="title"]').fill(title);
      await page.getByRole("button", { name: "下書きとして保存" }).click();

      await expect(page).toHaveURL(/\/es$/);
      await expect(page.getByText(title)).toBeVisible();
    } finally {
      await admin.from("es_entries").delete().eq("title", title);
    }
  });
});
