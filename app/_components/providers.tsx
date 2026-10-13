"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";

let redirectingToLogin = false;

/**
 * どの画面でも、APIが 401（ログインの期限切れなど）を返したら、この端末からログアウトしてログイン画面へ送る。
 * 画面ごとにエラーの文を出すだけだと、利用者は何をすればよいか分からないため。
 * 先にログアウトするのは、Cookie にセッションが残っていると、ログイン画面からダッシュボードへ戻されてしまうため。
 */
function handleUnauthorized(error: unknown) {
  if (!(error instanceof ApiError) || error.problem.status !== 401 || redirectingToLogin) return;
  redirectingToLogin = true;
  void createSupabaseBrowserClient()
    .auth.signOut({ scope: "local" })
    // router.push ではなくページごと読み込み直す。手元に残っている前のログインのキャッシュ（TanStack Query）を確実に消すため
    .finally(() => window.location.replace(new URL(`${ROUTES.LOGIN}?error=session`, window.location.origin)));
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({ onError: handleUnauthorized }),
    defaultOptions: {
      queries: {
        // 画面を移動するたびに取り直さず、1分以内なら保持しているデータを使う
        staleTime: 60_000,
        // 4xx は入力や権限の問題で、繰り返しても結果が変わらないため再試行しない
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.problem.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  // ブラウザのタブごとに1つだけ作る（レンダーのたびに作り直すとキャッシュが消えるため）
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
