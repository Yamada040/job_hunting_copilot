"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";

function createQueryClient() {
  return new QueryClient({
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
