import { randomUUID } from "node:crypto";
import { test as base, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { readLocalSupabase } from "./local-supabase";

// テストごとに新しいユーザーを作り、ログインした画面を渡す。終わったらユーザーを消し、その人のデータもまとめて消す（on delete cascade）。
// AIを使うテストはユーザーAで行わない。適性診断・自己分析は1人1回だけで、AIの回数制限（1人1日20回など）も手元の Supabase に
// 残り続けるため、同じユーザーでは2回目の実行や --repeat-each で失敗する
export const test = base.extend<{ newUserPage: Page }>({
  // 2つ目の引数を Playwright の慣例の use と名付けないのは、React のフックと見なされて eslint に止められるため
  newUserPage: async ({ browser, baseURL }, runTest) => {
    const supabase = readLocalSupabase();
    const admin = { apikey: supabase.SERVICE_ROLE_KEY, Authorization: `Bearer ${supabase.SERVICE_ROLE_KEY}` };
    const email = `e2e-${randomUUID()}@example.com`;
    const password = randomUUID();

    const created = await fetch(`${supabase.API_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: { ...admin, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!created.ok) throw new Error(`[e2e] ユーザーを作れませんでした: ${created.status} ${await created.text()}`);
    const { id } = (await created.json()) as { id: string };

    // テスト専用のログイン（/api/test-support/login）はユーザーA・Bしか選べないので、アプリと同じ @supabase/ssr でログインし、
    // 書き込まれた Cookie をブラウザに渡す。Cookie の形式を真似しないのは、ライブラリの内部の都合で変わりうるため
    const cookies: { name: string; value: string }[] = [];
    const auth = createServerClient(supabase.API_URL, supabase.PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => cookies,
        setAll: (set) => {
          cookies.push(...set);
        },
      },
    });
    const { error } = await auth.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`[e2e] ログインできませんでした: ${error.message}`);

    const context = await browser.newContext();
    await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL! })));
    const page = await context.newPage();
    // XPでレベルが上がると演出のダイアログが画面を覆うので、出たら閉じて続ける
    await page.addLocatorHandler(page.getByRole("dialog").filter({ hasText: "LEVEL UP" }), async (dialog) => {
      await dialog.getByRole("button", { name: "閉じる" }).click();
    });

    await runTest(page);

    await context.close();
    await fetch(`${supabase.API_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: admin });
  },
});

export { expect } from "@playwright/test";
