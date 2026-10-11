import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Card> & {
  /** 枠の上辺に割り込ませて表示する見出し */
  title?: React.ReactNode;
};

/** DQ風の窓。shadcn の Card に、枠に割り込む見出しを足したもの */
export function QuestWindow({ title, className, children, ...props }: Props) {
  return (
    <Card className={cn("relative overflow-visible px-(--card-spacing)", title && "mt-4 pt-7", className)} {...props}>
      {title && (
        <h2 className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-sky-300 bg-secondary px-2 text-base font-bold text-foreground">
          {title}
        </h2>
      )}
      {children}
    </Card>
  );
}
