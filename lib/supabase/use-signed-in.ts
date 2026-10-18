"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "./supabase-browser";

/**
 * この端末でログインしているか。読み込むまでは undefined。
 * ログインしなくても開ける画面（問い合わせ）で、ヘッダーと下のメニューを出し分けるためだけに使う。
 * 手元の Cookie を読むだけで、トークンが正しいかは確かめない（確かめるのはバックエンド）。
 */
export function useSignedIn(): boolean | undefined {
  const [signedIn, setSignedIn] = useState<boolean>();
  useEffect(() => {
    // 登録した直後に、今の状態（INITIAL_SESSION）が1回届く
    const { data } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}
