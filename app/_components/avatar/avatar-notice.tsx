"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AvatarSprite, IDLE_FRAMES } from "./avatar-sprite";
import { hideAvatarNotice, useAvatarNotice, type AvatarNotice as Notice } from "./avatar-notice-store";

// しゃべってから引っ込むまで（ms）。失敗は理由を読み切れるよう長めにする
const SHOW_DURATION: Record<Notice["tone"], number> = { success: 4500, failure: 7000 };

const TONE = {
  success: { heading: "できたよ！", border: "border-success/40", text: "text-success" },
  failure: { heading: "うまくいかなかったよ…", border: "border-destructive/40", text: "text-destructive" },
} as const;

/**
 * 操作の結果（うまくいった・失敗した）を、画面の右下（下のメニューの上）に飛び出してくるアバターが話して伝える。
 * 見出しの横のアバターではなく画面の端に出すのは、スクロールして見出しが画面の外にあっても見逃さないため。
 * 高さは、フォームの保存の帯（FormActions。下のメニューのすぐ上に付いてくる）の上にして、保存のボタンを隠さない。
 * 入力欄ごとのエラーは、直す場所が分かるよう、これまでどおりその欄の下に出す。
 * どの画面でも使えるよう、ルートのレイアウトに置き、showSuccessNotice・showFailureNotice でしゃべらせる。
 */
export function AvatarNotice() {
  const notice = useAvatarNotice();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => hideAvatarNotice(notice.id), SHOW_DURATION[notice.tone]);
    return () => clearTimeout(timer);
  }, [notice]);

  const tone = notice ? TONE[notice.tone] : null;

  return (
    <>
      {/* 吹き出しは見た目のためのもので、読み上げはこちらで行う。失敗は割り込んで、成功は区切りで読む */}
      <div role="status" className="sr-only">
        {notice?.tone === "success" && notice.message}
      </div>
      <div role="alert" className="sr-only">
        {notice?.tone === "failure" && notice.message}
      </div>
      <AnimatePresence>
        {notice && tone && (
          // 画面の端から弾んで飛び出す（https://motion-reference.takayustudio.jp/#motion=overshoot）
          <motion.div
            key={notice.id}
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+11.5rem)] z-50 flex max-w-[calc(100vw-2rem)] items-end gap-2"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
          >
            <div
              className={cn(
                "relative mb-6 w-72 max-w-full rounded-2xl border bg-card px-4 py-3 text-xs leading-relaxed text-foreground shadow-window",
                tone.border,
              )}
            >
              <div aria-hidden>
                <p className={cn("pr-5 font-bold", tone.text)}>{tone.heading}</p>
                <p className="mt-1">{notice.message}</p>
              </div>
              {notice.link && (
                <Link
                  href={notice.link.href}
                  onClick={() => hideAvatarNotice(notice.id)}
                  className="mt-1.5 inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  {notice.link.label}
                  <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.5 right-1.5"
                aria-label="閉じる"
                onClick={() => hideAvatarNotice(notice.id)}
              >
                <XMarkIcon />
              </Button>
              {/* 吹き出しのしっぽ（アバターのほうを向く） */}
              <span
                aria-hidden
                className={cn(
                  "absolute right-0 bottom-4 -mr-[6px] h-3 w-3 rotate-45 border-t border-r bg-card",
                  tone.border,
                )}
              />
            </div>
            <span aria-hidden>
              <AvatarSprite frame={IDLE_FRAMES[0]} scale={4} facing={-1} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
