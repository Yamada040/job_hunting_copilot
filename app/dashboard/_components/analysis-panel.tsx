import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";
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
