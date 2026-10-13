"use client";

import { useCallback, useState } from "react";

/**
 * フォームの編集の状態。入力が変わったら dirty にし、⌘/Ctrl + Enter で送信する。
 * formProps を form 要素に渡す。入力欄の変化は form の onChange に伝わるので、各欄に手を入れなくてよい。
 * 設問の追加・削除のように入力欄を通らない変更は、markDirty を呼んで知らせる。
 * 保存のあとは、ふつうはフォームを作り直す（key を変える）か画面を移る。同じフォームのまま使い続けるときだけ reset を呼ぶ。
 */
export function useFormEditing() {
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);
  const reset = useCallback(() => setDirty(false), []);

  const formProps = {
    onChange: markDirty,
    onKeyDown: (e: React.KeyboardEvent<HTMLFormElement>) => {
      // 日本語の変換を確定する Enter では送信しない
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || e.nativeEvent.isComposing) return;
      e.preventDefault();
      e.currentTarget.requestSubmit();
    },
  };

  return { dirty, markDirty, reset, formProps };
}
