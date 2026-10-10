import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A } from "./global-setup";
import { createDraftEs } from "./support/es";

test.use({ storageState: AUTH_STORAGE_STATE_A });

test("企業を登録してESを下書きとして保存すると、一覧に表示される", async ({ page }) => {
  const title = `本選考ES-${Date.now()}`;
  await createDraftEs(page, title);

  await page.goto("/es");
  await expect(page.getByText(title)).toBeVisible();
});
