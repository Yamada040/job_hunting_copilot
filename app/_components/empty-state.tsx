import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  /** 次にやること（作成ページへのリンクや実行ボタンなど） */
  children?: React.ReactNode;
  className?: string;
};

/** データがまだ無いときの表示。空のままだと壊れて見えるので、何をすればよいかと、その操作をあわせて出す */
export function EmptyState({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed bg-secondary/60 px-4 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
