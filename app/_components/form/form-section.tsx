import { cn } from "@/lib/utils";

/** フォームの中のまとまり。見出しを付けて、どこに何を書くかを見つけやすくする。 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1 border-b pb-2">
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className={cn("grid gap-6", className)}>{children}</div>
    </section>
  );
}
