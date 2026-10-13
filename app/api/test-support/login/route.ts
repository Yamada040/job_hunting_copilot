import { NextResponse } from "next/server";

import { createSupabaseServerActionClient } from "@/lib/supabase/supabase-server";

export const runtime = "nodejs";

// E2E専用のログインバイパス。Playwrightのグローバルセットアップからのみ呼び出す想定。
// E2E_TEST_MODE と x-e2e-secret の両方が一致しない限り必ず404を返し、本番環境で
// 誤って到達可能になった場合でも実質的に無効化される多重ガードにしている。
export async function POST(request: Request) {
  if (process.env.E2E_TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const secret = process.env.E2E_TEST_SECRET;
  if (!secret || request.headers.get("x-e2e-secret") !== secret) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const user = body?.user === "b" ? "b" : "a";

  const email = user === "b" ? process.env.E2E_TEST_USER2_EMAIL : process.env.E2E_TEST_USER_EMAIL;
  const password = user === "b" ? process.env.E2E_TEST_USER2_PASSWORD : process.env.E2E_TEST_USER_PASSWORD;
  if (!email || !password) {
    return NextResponse.json({ error: "E2E test user is not configured" }, { status: 500 });
  }

  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
