import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// 読み込み中に、読み込み後と同じ形の薄い枠を出す。文字だけを出すと、読み込みが終わったときに配置が大きくずれて、
// 押そうとした場所が動いてしまうため。読み上げでは「読み込み中」と伝える

function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">読み込み中…</span>
      {children}
    </div>
  );
}

/** カードの一覧の読み込み中。 */
export function CardListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <Loading className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="gap-3 px-4">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </Card>
      ))}
    </Loading>
  );
}

/** 入力の画面の読み込み中。 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Loading>
      <Card className="gap-6 p-8">
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
      </Card>
    </Loading>
  );
}

/** 文章や短い一覧の読み込み中。 */
export function LinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Loading className={cn("space-y-2 py-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </Loading>
  );
}
