"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AppLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  /** 見出しの下に置く、その画面の主な操作（「ESを作成」など） */
  headerActions?: React.ReactNode;
  /** 見出しの横に立つアバター（AvatarGuide）。その画面の状況や使い方を話す */
  avatar?: React.ReactNode;
  className?: string;
}

export function AppLayoutClient({
  children,
  headerTitle,
  headerDescription,
  headerActions,
  avatar,
  className,
}: AppLayoutProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // ログインとホームは素の表示
  if (pathname === "/login" || pathname === "/") {
    return <>{children}</>;
  }

  return (
    // はみ出しを切るのに overflow-hidden ではなく clip を使う。hidden の要素はスクロールの箱になり、その中では
    // 保存の帯（FormActions）の sticky が効かなくなるため
    <div className="relative min-h-screen overflow-clip">
      {/* 各画面はこのレイアウトごと描き直されるので、画面を移るたびに中身が奥から手前へせり出す。
            カルーセルの「カードを開く」動きとつなげるため。ヘッダーと下のメニューは動かさない */}
      <motion.main
        className={cn("mx-auto max-w-7xl px-6 pt-24 pb-36 sm:px-10 sm:pt-32", className)}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, rotateX: 6, y: 16 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200, transformOrigin: "50% 0%" }}
      >
        {(headerTitle || headerDescription || avatar) && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              {headerTitle && (
                <h1 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">{headerTitle}</h1>
              )}
              {headerDescription && <p className="text-sm text-muted-foreground">{headerDescription}</p>}
              {headerActions && <div className="flex flex-wrap gap-2 pt-2">{headerActions}</div>}
            </div>
            {/* 広い画面では吹き出しがアバターの上に出るので、その分だけ上を空ける */}
            {avatar && <div className="shrink-0 sm:pt-16">{avatar}</div>}
          </div>
        )}
        {children}
      </motion.main>
    </div>
  );
}
