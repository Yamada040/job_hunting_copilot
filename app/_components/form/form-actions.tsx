"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

type Props = {
  /** 保存していない変更があるか */
  dirty: boolean;
  /** 直前の保存がうまくいったか。変更し始めたら消す */
  saved?: boolean;
  /** ⌘/Ctrl + Enter で何をするか。form の中でなく、キーで押せないときは false */
  shortcut?: string | false;
  /** 保存・送信のボタン */
  children: React.ReactNode;
  className?: string;
};

/**
 * フォームの保存のボタンを置く帯。長いフォームでもボタンを探しに行かなくてよいよう、画面の下（下のメニューのすぐ上）に
 * 付いてくる。左に、保存していない変更があるか・保存できたかを出す。
 */
export function FormActions({ dirty, saved = false, shortcut = "保存", children, className }: Props) {
  const reduceMotion = useReducedMotion();
  const status = dirty ? "dirty" : saved ? "saved" : null;

  return (
    <div
      className={cn(
        "sticky bottom-28 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/90 px-4 py-3 shadow-window backdrop-blur",
        className,
      )}
    >
      <div aria-live="polite" className="flex min-h-6 items-center gap-3 text-sm">
        <AnimatePresence mode="wait" initial={false}>
          {status === "dirty" && (
            <motion.span
              key="dirty"
              className="flex items-center gap-2 text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="h-2 w-2 rounded-full bg-ring" aria-hidden />
              保存していない変更があります
            </motion.span>
          )}
          {status === "saved" && (
            <motion.span
              key="saved"
              className="flex items-center gap-1.5 font-semibold text-success"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
            >
              <CheckCircleIcon className="h-5 w-5" aria-hidden />
              保存しました
            </motion.span>
          )}
        </AnimatePresence>
        {shortcut && (
          <span className="hidden text-xs text-muted-foreground sm:inline">⌘/Ctrl + Enter で{shortcut}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
