import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";

/**
 * バックエンドのAPIが返したエラーを表示する。メッセージはバックエンドが返した日本語をそのまま出し（docs/backend-design.md 5章）、
 * 項目ごとのエラーは labels で項目名を日本語にして並べる。
 */
export function ApiErrorMessage({ error, labels = {} }: { error: unknown; labels?: Record<string, string> }) {
  if (!error) return null;
  if (!(error instanceof ApiError)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>通信に失敗しました。時間をおいて再度お試しください。</AlertDescription>
      </Alert>
    );
  }
  const { title, errors } = error.problem;
  return (
    <Alert variant="destructive">
      <AlertDescription className="[&_p:not(:last-child)]:mb-1">
        <p>{title}</p>
        {errors?.map((e) => (
          <p key={e.field}>
            {labels[e.field] ?? e.field}: {e.message}
          </p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
