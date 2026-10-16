import type { ComponentType, SVGProps } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  /** 見出しの横に出す件数。読み込み中は出さない */
  count?: number;
  children: React.ReactNode;
  className?: string;
};

/** ホームのカルーセルの左右に置く、AI企業分析のパネルの枠。後ろの淡い背景が透けるよう、面を少し透かす。 */
export function AnalysisPanel({ icon: Icon, title, description, count, children, className }: Props) {
  return (
    <Card size="sm" className={cn("bg-card/75 backdrop-blur", className)}>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-ring to-primary text-primary-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            {title}
            {count !== undefined && (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** パネルの中の一覧のページ送り。1ページに収まるときは出さない。 */
export function Pager({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="ページ送り" className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="前のページ"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon />
      </Button>
      <span className="tabular-nums">
        {page + 1} / {pageCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="次のページ"
        disabled={page === pageCount - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRightIcon />
      </Button>
    </nav>
  );
}
