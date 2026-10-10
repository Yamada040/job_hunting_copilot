import { execSync } from "node:child_process";

// E2E は本番ではなく、手元・CIで起動した Supabase（supabase start）につなぐ。
// URL やキーは supabase status から読む。どれも手元専用の既定値で、秘密ではない
type SupabaseStatus = {
  API_URL: string;
  DB_URL: string;
  PUBLISHABLE_KEY: string;
  SERVICE_ROLE_KEY: string;
};

export function readLocalSupabase(): SupabaseStatus {
  try {
    return JSON.parse(execSync("supabase status -o json", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    throw new Error(
      "手元の Supabase が起動していません。npm run supabase:signing-key と supabase start を実行してください（docs/testing/e2e-test-plan.md）",
    );
  }
}

// テストユーザー。手元の Supabase にしか存在しないので、値は固定でよい
export const TEST_USERS = {
  a: { email: "e2e-user-a@example.com", password: "e2e-user-a-password" },
  b: { email: "e2e-user-b@example.com", password: "e2e-user-b-password" },
} as const;

export const E2E_TEST_SECRET = "e2e-local-secret";
