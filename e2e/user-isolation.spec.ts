import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_STATE_A, AUTH_STORAGE_STATE_B } from "./global-setup";
import { createDraftEs } from "./support/es";

test("ユーザーAのESは、ユーザーBの一覧に出ず、URLを直接開いても見られない", async ({ browser }) => {
  const title = `ユーザー分離-${Date.now()}`;

  const contextA = await browser.newContext({ storageState: AUTH_STORAGE_STATE_A });
  const esId = await createDraftEs(await contextA.newPage(), title);
  await contextA.close();

  const contextB = await browser.newContext({ storageState: AUTH_STORAGE_STATE_B });
  const pageB = await contextB.newPage();

  await pageB.goto("/es");
  // 読み込み中は一覧が空なので、読み込みが終わってから「出ていない」ことを確かめる（ユーザーBはESを作らない）
  await expect(pageB.getByText("まだESがありません")).toBeVisible();
  await expect(pageB.getByText(title)).toHaveCount(0);

  await pageB.goto(`/es/${esId}`);
  await expect(pageB.getByText("ESが見つかりません")).toBeVisible();
  await expect(pageB.getByText(title)).toHaveCount(0);

  await contextB.close();
});
