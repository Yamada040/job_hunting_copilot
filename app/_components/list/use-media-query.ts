"use client";

import { useSyncExternalStore } from "react";

/**
 * 画面がメディアクエリに合うか。表とカードのように、同じ中身を幅で作り分けるときに使う。
 * CSS で両方を描いて片方を隠さないのは、同じ文字が2回ずつ描かれて、読み上げやテストで重なるため。
 * サーバーで描くときは合わないものとして描く（一覧はブラウザでデータを取ってから描くので、ずれは見えない）。
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
