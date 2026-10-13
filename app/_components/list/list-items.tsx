"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// 一覧の項目を、上から少しずつ時間をずらして出す。多いときに最後の項目を長く待たせないよう、ずらす数に上限を設ける
const STEP = 0.04;
const MAX_STAGGERED = 12;

/** 項目が上から順に出てくる一覧。中の項目は StaggerItem で包む。 */
export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("grid gap-3", className)}>{children}</ul>;
}

export function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, MAX_STAGGERED) * STEP }}
    >
      {children}
    </motion.li>
  );
}

/** 一覧の1件のカード。押すとその詳細を開く。 */
export function ListCardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-2 rounded-2xl bg-card p-4 text-card-foreground shadow-window ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

/** 絞り込み・検索に合うものが無いときの表示。 */
export function NoMatches({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
  );
}
