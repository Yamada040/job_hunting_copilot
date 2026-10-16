import createClient, { type Middleware } from "openapi-fetch";

import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";
import type { components, paths } from "./schema";

export type Problem = components["schemas"]["Problem"];

/** バックエンドのAPIが返したエラー（RFC 9457 Problem Details）。message は利用者にそのまま見せられる日本語。 */
export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
  }
}

/** エラーを、利用者にそのまま見せられる1続きの文にする。項目ごとのエラーがあれば、その理由も続ける。 */
export function apiErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return "通信に失敗しました。時間をおいて再度お試しください。";
  const { title, errors } = error.problem;
  return [title, ...(errors ?? []).map((e) => e.message)].join(" ");
}

let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;

// Supabase Auth のアクセストークンを付ける。トークンの更新は supabase-js が getSession の中で行う
const authorize: Middleware = {
  async onRequest({ request }) {
    supabase ??= createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
};

/**
 * バックエンドのAPIを呼ぶクライアント。パスとリクエスト・レスポンスの型は backend/api/openapi.yaml から生成した schema.d.ts に従う。
 * バックエンドは Next.js と同じドメインの /v1 で動いている（vercel.json）ので、baseUrl は空にする。
 */
export const api = createClient<paths>({ baseUrl: "" });
api.use(authorize);

/** openapi-fetch の結果からデータを取り出す。エラーなら ApiError を投げ、TanStack Query のエラーとして扱えるようにする。 */
export async function unwrap<T>(result: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await result;
  if (error === undefined) return data as T;
  // バックエンドに届かないと、手前（Next.js の転送や Vercel）が Problem ではないテキストのエラーを返す。
  // それを ApiError にすると見せる文が空になるので、通信の失敗として扱う
  if (!isProblem(error)) throw new Error("バックエンドのAPIに接続できませんでした", { cause: error });
  throw new ApiError(error);
}

function isProblem(value: unknown): value is Problem {
  return typeof value === "object" && value !== null && typeof (value as Problem).title === "string";
}
