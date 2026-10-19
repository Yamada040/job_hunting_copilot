import { defineConfig, devices } from "@playwright/test";
import { E2E_TEST_SECRET, readLocalSupabase, TEST_USERS } from "./e2e/support/local-supabase";

// 手元で npm run dev しているサーバーとぶつからないよう、E2E 専用のポートで起動する
const WEB_PORT = 3100;
const API_PORT = 8180;
const FAKE_AI_PORT = 8190;
const baseURL = `http://localhost:${WEB_PORT}`;

const supabase = readLocalSupabase();

// Next.js・バックエンド・globalSetup がすべて手元の Supabase を見るよう、ここで環境変数を決める。
// process.env に入れるのは、next build が .env.local（本番の値）より先にこちらを使うため
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: supabase.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.PUBLISHABLE_KEY,
  API_ORIGIN: `http://localhost:${API_PORT}`,
  E2E_TEST_MODE: "true",
  E2E_TEST_SECRET,
  E2E_TEST_USER_EMAIL: TEST_USERS.a.email,
  E2E_TEST_USER_PASSWORD: TEST_USERS.a.password,
  E2E_TEST_USER2_EMAIL: TEST_USERS.b.email,
  E2E_TEST_USER2_PASSWORD: TEST_USERS.b.password,
});

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // AIの代わりに応答する偽の OpenAI 互換サーバー（e2e/fake-ai/server.mjs）
      command: "node e2e/fake-ai/server.mjs",
      url: `http://127.0.0.1:${FAKE_AI_PORT}/health`,
      env: { PORT: String(FAKE_AI_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "go run ./cmd/server",
      cwd: "backend",
      url: `http://localhost:${API_PORT}/v1/health`,
      env: {
        PORT: String(API_PORT),
        SUPABASE_URL: supabase.API_URL,
        DATABASE_URL: supabase.DB_URL,
        AI_PROVIDER: "gpt",
        AI_ENDPOINT: `http://127.0.0.1:${FAKE_AI_PORT}/v1/chat/completions`,
        AI_PROVIDER_API_KEY: "e2e-dummy-key",
        // アプリ全体の1日の上限は、手元の Supabase に残り続け、ほかの作業の分も数えるので、E2E では当たらない値にする
        AI_APP_DAILY_LIMIT: "100000",
        COMPANY_ANALYSIS_APP_DAILY_LIMIT: "100000",
        AI_DAILY_BUDGET_USD: "1000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `npm run build && npm run start -- --port ${WEB_PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
