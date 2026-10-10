import path from "node:path";
import { request } from "@playwright/test";

export const AUTH_STORAGE_STATE_A = path.join(__dirname, ".auth/userA.json");
export const AUTH_STORAGE_STATE_B = path.join(__dirname, ".auth/userB.json");

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "E2E_TEST_MODE",
  "E2E_TEST_SECRET",
  "E2E_TEST_USER_EMAIL",
  "E2E_TEST_USER_PASSWORD",
  "E2E_TEST_USER2_EMAIL",
  "E2E_TEST_USER2_PASSWORD",
] as const;

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

// テストユーザーA・Bは、Supabase の画面であらかじめ作っておく（docs/testing/e2e-test-plan.md）。
// ここで自動で作らないのは、そのために全権限の secret キーをCIに置きたくないため
export default async function globalSetup() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(
      `[e2e] E2Eテストユーザーの環境変数が未設定のため、認証が必要なテストはスキップされます。不足: ${missing.join(", ")}`,
    );
    return;
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  await loginAndSaveState(baseURL, "a", AUTH_STORAGE_STATE_A);
  await loginAndSaveState(baseURL, "b", AUTH_STORAGE_STATE_B);
}
