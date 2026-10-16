import { useSyncExternalStore } from "react";

import { apiErrorText } from "@/lib/api/client";

export type AvatarNotice = { id: number; message: string };

// 画面の右下のアバターが今しゃべっていること。どの画面からでも呼べるよう、React の外に1つだけ持つ
let current: AvatarNotice | null = null;
const listeners = new Set<() => void>();

function emit(next: AvatarNotice | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** 画面の右下にアバターを出して、message をしゃべらせる。しゃべっている途中なら、新しいほうに置き換える。 */
export function showAvatarNotice(message: string) {
  emit({ id: Date.now(), message });
}

/** 操作の失敗を、アバターに話させる。action は「AI企業分析」のような、失敗した操作の名前。 */
export function showFailureNotice(action: string, error: unknown) {
  showAvatarNotice(`${action}ができませんでした。${apiErrorText(error)}`);
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
