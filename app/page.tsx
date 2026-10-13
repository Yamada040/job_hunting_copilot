import { ChevronDoubleDownIcon } from "@heroicons/react/24/outline";

import { DepthProgress } from "./_components/home/depth-progress";
import { DepthScene } from "./_components/home/depth-scene";
import { HomeCallToAction, HomeSecurity } from "./_components/home/home-closing";
import { HomeFeatures, HomeSteps } from "./_components/home/home-features";
import { HomeHeader } from "./_components/home/home-header";
import { HomeHero } from "./_components/home/home-hero";
import { HomeContexts, HomeSummaries } from "./_components/home/home-overview";

export default function Home() {
  return (
    // はみ出した装飾を切るのに overflow-hidden ではなく clip を使う。hidden の要素はスクロールできる箱になり、
    // ページ内リンクで移動したときに横にずれてしまうため
    <div className="relative min-h-screen overflow-clip bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,#f4faff_45%,#dbeafe_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-white/80 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-80 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#7dd3fc_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* スクロールしてもログインや各セクションへの移動ができるよう、ヘッダーを画面の上に残す。depth の画面では
          ページの流れから外して固定する（各セクションを1画面ずつ並べる位置の計算を、ヘッダーの高さでずらさないため） */}
      <div className="sticky top-0 z-20 mx-auto max-w-6xl px-6 pt-4 sm:px-10 sm:pt-6 depth:fixed depth:inset-x-0 depth:top-0">
        <HomeHeader />
      </div>
      <DepthProgress />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 py-10 sm:px-10 sm:py-14 depth:max-w-none depth:gap-0 depth:p-0">
        <DepthScene index={0} id="top">
          <HomeHero />
          <p className="hidden items-center justify-center gap-2 text-sm font-semibold text-slate-600 depth:flex">
            <ChevronDoubleDownIcon className="h-5 w-5 motion-safe:animate-bounce" aria-hidden />
            スクロールで次へ
          </p>
        </DepthScene>
        <DepthScene index={1} id="about">
          <HomeSummaries />
        </DepthScene>
        <DepthScene index={2} id="why">
          <HomeContexts />
        </DepthScene>
        <DepthScene index={3} id="features">
          <HomeFeatures />
        </DepthScene>
        <DepthScene index={4} id="steps">
          <HomeSteps />
        </DepthScene>
        <DepthScene index={5} id="start">
          <HomeCallToAction />
          <HomeSecurity />
          <footer className="pb-2 text-center text-xs text-slate-600">© 2026 就活copilot. All rights reserved.</footer>
        </DepthScene>
      </main>
    </div>
  );
}
