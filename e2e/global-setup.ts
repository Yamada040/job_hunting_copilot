import path from "node:path";
import { request, type FullConfig } from "@playwright/test";
import { readLocalSupabase, TEST_USERS } from "./support/local-supabase";

export const AUTH_STORAGE_STATE_A = path.join(__dirname, ".auth/userA.json");
export const AUTH_STORAGE_STATE_B = path.join(__dirname, ".auth/userB.json");

// 手元の Supabase の管理APIでテストユーザーを作る。2回目以降は「既にある」で失敗するが、それでよい
async function ensureTestUserExists(email: string, password: string) {
  const supabase = readLocalSupabase();
  const response = await fetch(`${supabase.API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: supabase.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${supabase.SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok && response.status !== 422) {
    throw new Error(`[e2e] テストユーザーを作れませんでした: ${response.status} ${await response.text()}`);
  }
}

async function loginAndSaveState(baseURL: string, user: "a" | "b", storagePath: string) {
  const requestContext = await request.newContext({ baseURL });
  const response = await requestContext.post("/api/test-support/login", {
    headers: { "x-e2e-secret": process.env.E2E_TEST_SECRET! },
    data: { user },
  });
  if (!response.ok()) {
    throw new Error(`[e2e] test-support login (${user}) failed: ${response.status()} ${await response.text()}`);
  }
  await requestContext.storageState({ path: storagePath });
  await requestContext.dispose();
}

export default async function globalSetup(config: FullConfig) {
  await ensureTestUserExists(TEST_USERS.a.email, TEST_USERS.a.password);
  await ensureTestUserExists(TEST_USERS.b.email, TEST_USERS.b.password);

  const baseURL = config.projects[0].use.baseURL!;
  await loginAndSaveState(baseURL, "a", AUTH_STORAGE_STATE_A);
  await loginAndSaveState(baseURL, "b", AUTH_STORAGE_STATE_B);
}
