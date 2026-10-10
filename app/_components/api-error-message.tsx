import { ApiError } from "@/lib/api/client";

/**
 * Go のAPIが返したエラーを表示する。メッセージはGoが返した日本語をそのまま出し（docs/backend-design.md 5章）、
 * 項目ごとのエラーは labels で項目名を日本語にして並べる。
 */
export function ApiErrorMessage({ error, labels = {} }: { error: unknown; labels?: Record<string, string> }) {
  if (!error) return null;
  if (!(error instanceof ApiError)) {
    return (
      <p role="alert" className="text-sm text-rose-300">
        通信に失敗しました。時間をおいて再度お試しください。
      </p>
    );
  }
  const { title, errors } = error.problem;
  return (
    <div role="alert" className="space-y-1 text-sm text-rose-300">
      <p>{title}</p>
      {errors?.map((e) => (
        <p key={e.field}>
          {labels[e.field] ?? e.field}: {e.message}
        </p>
      ))}
    </div>
  );
}
