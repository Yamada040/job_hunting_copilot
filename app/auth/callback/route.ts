import { NextResponse } from "next/server";
import { createSupabaseActionClient } from "@/lib/supabase/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    // Google の画面でキャンセルされたときなどは、code の代わりに error が付いて戻ってくる
    const path = url.searchParams.has("error") ? "/login?error=auth" : "/login";
    return NextResponse.redirect(new URL(path, request.url));
  }

  const supabase = await createSupabaseActionClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("exchangeCodeForSession error", error);
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
