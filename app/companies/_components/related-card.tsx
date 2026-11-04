import Link from "next/link";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";
import { LinesSkeleton } from "@/app/_components/loading-skeletons";

type RelatedRow = { id: string; href: string; title: string; detail: string };

type Props = {
  title: string;
  rows: RelatedRow[] | undefined;
  error: unknown;
  emptyTitle: string;
  /** 作成のボタン。空のときは空の表示の中に、件数があるときは見出しの横に出す */
  action: React.ReactNode;
};

/** 企業の詳細に出す、その企業にひも付くもの（ES・面接ログ・予定）の一覧。各件は開けるリンクにする。 */
export function RelatedCard({ title, rows, error, emptyTitle, action }: Props) {
  const hasRows = !!rows && rows.length > 0;

  return (
    <Card className="gap-4 py-6">
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className="text-base font-semibold">
            {title}
            {hasRows && <span className="ml-2 text-sm font-normal text-muted-foreground">{rows.length}件</span>}
          </h2>
        </CardTitle>
        {hasRows && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="px-6">
        {error ? (
          <ApiErrorMessage error={error} />
        ) : !rows ? (
          <LinesSkeleton />
        ) : hasRows ? (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex flex-col gap-0.5 rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
                >
                  <span className="truncate text-sm font-semibold">{row.title}</span>
                  <span className="text-xs text-muted-foreground">{row.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={emptyTitle} className="py-6">
            {action}
          </EmptyState>
        )}
      </CardContent>
    </Card>
  );
}
