import { NextResponse } from "next/server";
import { createSupabaseActionClient } from "@/lib/supabase/supabase-server";

const safeNextPath = (next: string | null) => {
  if (!next?.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));
  if (!code) {
    // Google の画面でキャンセルされたときなどは、code の代わりに error が付いて戻ってくる
    const loginURL = new URL("/login", request.url);
    if (url.searchParams.has("error")) loginURL.searchParams.set("error", "auth");
    if (nextPath) loginURL.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginURL);
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

  return NextResponse.redirect(new URL(nextPath ?? "/dashboard", request.url));
}
