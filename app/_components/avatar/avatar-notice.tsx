"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { AvatarSprite, IDLE_FRAMES } from "./avatar-sprite";
import { hideAvatarNotice, useAvatarNotice } from "./avatar-notice-store";

// しゃべってから引っ込むまで（ms）。エラーの文を読み切れる長さにする
const SHOW_DURATION = 7000;

/**
 * 操作のエラーを、画面の右下（下のメニューの上）に飛び出してくるアバターがしゃべって伝える。
 * 見出しの横のアバターではなく画面の端に出すのは、スクロールして見出しが画面の外にあっても見逃さないため。
 * 入力欄ごとのエラーは、直す場所が分かるよう、これまでどおりその欄の下に出す。
 * どの画面でも使えるよう、ルートのレイアウトに置き、showAvatarNotice でしゃべらせる。
 */
export function AvatarNotice() {
  const notice = useAvatarNotice();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => hideAvatarNotice(notice.id), SHOW_DURATION);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <>
      {/* 吹き出しは見た目のためのもので、読み上げはこちらで行う */}
      <div role="alert" className="sr-only">
        {notice?.message}
      </div>
      <AnimatePresence>
        {notice && (
          // 画面の端から弾んで飛び出す（https://motion-reference.takayustudio.jp/#motion=overshoot）
          <motion.div
            key={notice.id}
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+7rem)] z-50 flex max-w-[calc(100vw-2rem)] items-end gap-2"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80 }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
          >
            <div className="relative mb-6 w-72 max-w-full rounded-2xl border border-destructive/40 bg-card px-4 py-3 text-xs leading-relaxed text-foreground shadow-window">
              <div aria-hidden>
                <p className="pr-5 font-bold text-destructive">うまくいかなかったよ…</p>
                <p className="mt-1">{notice.message}</p>
              </div>
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
                className="absolute right-0 bottom-4 -mr-[6px] h-3 w-3 rotate-45 border-t border-r border-destructive/40 bg-card"
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
