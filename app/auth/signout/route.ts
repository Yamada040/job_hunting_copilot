import { NextResponse } from "next/server";

import { createSupabaseActionClient } from "@/lib/supabase/supabase-server";
import { ROUTES } from "@/lib/constants/routes";

export async function POST(request: Request) {
  let hasSignOutError = false;

  try {
    const supabase = await createSupabaseActionClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      console.error("signOut error", error);
      hasSignOutError = true;
      // ほかの端末のセッションを消せなくても、この端末からはログアウトさせる（ログイン画面へ送っても、ログイン済みとして戻されないように）
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch (error) {
    console.error("signOut unexpected error", error);
    hasSignOutError = true;
  }

  const redirectPath = hasSignOutError ? `${ROUTES.LOGIN}?error=logout` : ROUTES.LOGIN;

  // 303 で GET に変えて移す。既定の 307 は POST のまま /login に送ってしまい、ページは POST を受け付けないので 405 になる
  return NextResponse.redirect(new URL(redirectPath, request.url), 303);
}
