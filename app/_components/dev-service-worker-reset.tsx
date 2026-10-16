"use client";

import { useEffect } from "react";

/** 開発環境で、ページがほかのアプリの Service Worker を通っているか。通っていれば DevServiceWorkerReset が読み込み直す */
export const isControlledByServiceWorkerInDev = () =>
  process.env.NODE_ENV === "development" && "serviceWorker" in navigator && navigator.serviceWorker.controller !== null;

/**
 * 開発環境（next dev）でだけ、localhost:3000 に登録されている Service Worker をすべて解除する。
 * localhost:3000 はほかのアプリも使うので、そのアプリの Service Worker（Firebase の認証用など）が残っていると、
 * このアプリの API のリクエストを横取りして Authorization を書き換え、401 でログアウトされ続ける。
 * ポートを変えなかったのは、Supabase のログイン後の戻り先など、3000 番を前提にした設定がいくつもあるため。
 * このアプリは Service Worker を使わないので、すべて解除してよい。
 */
export function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (registrations.length === 0) return;
      await Promise.all(registrations.map((registration) => registration.unregister()));
      // 解除しても、開いているページは読み込み直すまで Service Worker を通り続ける
      if (navigator.serviceWorker.controller) window.location.reload();
    });
  }, []);
  return null;
}
