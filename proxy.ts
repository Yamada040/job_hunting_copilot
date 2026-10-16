import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants/routes";

// 認証不要のパス
const PUBLIC_PATHS = [ROUTES.HOME, ROUTES.LOGIN, "/auth/callback", "/oauth/consent"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // リクエストとレスポンス両方に Cookie をセット（JWT リフレッシュ時に必要）
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // CDN キャッシュ防止ヘッダー（v0.10.0+）
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // セッションリフレッシュ（全リクエストで実行）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/");

  // ログイン済みで /login にアクセス → ダッシュボードへ
  if (user && pathname === ROUTES.LOGIN) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  // 未ログインで保護ルートにアクセス → ログインへ
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
