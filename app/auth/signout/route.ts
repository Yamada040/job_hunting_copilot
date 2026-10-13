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
    }
  } catch (error) {
    console.error("signOut unexpected error", error);
    hasSignOutError = true;
  }

  const redirectPath = hasSignOutError ? `${ROUTES.HOME}?logout=failed` : ROUTES.LOGIN;

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
