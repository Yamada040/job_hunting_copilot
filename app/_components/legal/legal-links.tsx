import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

/** ページの下に置く、利用規約とプライバシーポリシーへのリンク */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="規約" className={cn("flex justify-center gap-4 text-xs text-muted-foreground", className)}>
      <Link href={ROUTES.TERMS} className="underline-offset-4 hover:underline">
        利用規約
      </Link>
      <Link href={ROUTES.PRIVACY} className="underline-offset-4 hover:underline">
        プライバシーポリシー
      </Link>
    </nav>
  );
}
