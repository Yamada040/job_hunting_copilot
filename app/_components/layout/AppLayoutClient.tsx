"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./Header";

export interface AppLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  className?: string;
}

export function AppLayoutClient({ children, headerTitle, headerDescription, className }: AppLayoutProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // ログインとホームは素の表示
  if (pathname === "/login" || pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 各画面はこのレイアウトごと描き直されるので、画面を移るたびに中身が奥から手前へせり出す。
            カルーセルの「カードを開く」動きとつなげるため。ヘッダーと下のメニューは動かさない */}
      <motion.main
        className={cn("mx-auto max-w-7xl px-6 pt-24 pb-36 sm:px-10", className)}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, rotateX: 6, y: 16 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200, transformOrigin: "50% 0%" }}
      >
        <Breadcrumbs />
        {(headerTitle || headerDescription) && (
          <div className="mt-4">
            {headerTitle && <h1 className="text-lg font-semibold">{headerTitle}</h1>}
            {headerDescription && <p className="mt-1 text-sm text-muted-foreground">{headerDescription}</p>}
          </div>
        )}
        {children}
      </motion.main>
    </div>
  );
}
