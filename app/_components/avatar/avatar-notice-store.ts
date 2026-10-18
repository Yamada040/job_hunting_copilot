import { useSyncExternalStore } from "react";

import { apiErrorText } from "@/lib/api/client";

/** 一言に添える、続きの画面へのリンク（AIの結果を別の画面で見るときなど） */
export type NoticeLink = { href: string; label: string };

export type AvatarNotice = {
  id: number;
  tone: "success" | "failure";
  message: string;
  link?: NoticeLink;
};

// 画面の右下のアバターが今しゃべっていること。どの画面からでも呼べるよう、React の外に1つだけ持つ
let current: AvatarNotice | null = null;
const listeners = new Set<() => void>();

function emit(next: AvatarNotice | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

// しゃべっている途中なら、新しいほうに置き換える
function show(notice: Omit<AvatarNotice, "id">) {
  emit({ ...notice, id: Date.now() });
}

/** 操作がうまくいったことを、アバターに話させる。message は「ESを提出しました」のような1文。 */
export function showSuccessNotice(message: string, link?: NoticeLink) {
  show({ tone: "success", message, link });
}

/** 操作の失敗を、アバターに話させる。action は「AI企業分析」のような、失敗した操作の名前。 */
export function showFailureNotice(action: string, error: unknown) {
  show({ tone: "failure", message: `${action}ができませんでした。${apiErrorText(error)}` });
}

/**
 * 時間のかかる操作（AIの実行など）を待ち、終わったら結果をアバターに話させる。
 * 待つ間に画面を移ると mutate の onSuccess・onError は届かないので、Promise で受ける。
 */
export function noticeWhenDone(
  promise: Promise<unknown>,
  { action, done, link }: { action: string; done: string; link?: NoticeLink },
) {
  return promise.then(
    () => showSuccessNotice(done, link),
    (e) => showFailureNotice(action, e),
  );
}

/** id の一言がまだ出ていれば引っ込める（あとから出た一言は消さない）。 */
export function hideAvatarNotice(id: number) {
  if (current?.id === id) emit(null);
}

export function useAvatarNotice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
