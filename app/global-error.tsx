"use client";

import "./globals.css";

/**
 * ルートのレイアウト自体でエラーが起きたときの画面。レイアウト（ヘッダー・下のメニュー・Providers）が使えないので、
 * html と body から自分で描き、ほかの部品には頼らない。
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-black">問題が発生しました</h1>
          <p className="text-sm text-muted-foreground">時間をおいて、もう一度お試しください。</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              もう一度試す
            </button>
            {/* レイアウトごと作り直すため、Link ではなくページを読み込み直す */}
            <a href="/dashboard" className="rounded-lg border px-4 py-2 text-sm font-semibold">
              ホームへ戻る
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
