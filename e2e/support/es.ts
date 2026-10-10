import { expect, type Page } from "@playwright/test";

// 企業をその場で登録し、ESを下書きとして保存する。作ったESのIDを返す。
// 名前に時刻を入れるのは、手元の Supabase に前回までのデータが残っていても区別できるようにするため
export async function createDraftEs(page: Page, title: string): Promise<string> {
  const companyName = `E2E商事-${Date.now()}`;

  await page.goto("/es/new");
  await page.getByLabel("企業").fill(companyName);
  await page.getByRole("button", { name: `＋「${companyName}」を新しく登録する` }).click();
  await expect(page.getByText(companyName)).toBeVisible();

  await page.locator('input[name="title"]').fill(title);
  await page.getByRole("button", { name: "下書きとして保存" }).click();

  await page.waitForURL(/\/es\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}
