import { HomeCallToAction, HomeSecurity } from "./_components/home/home-closing";
import { HomeFeatures, HomeSteps } from "./_components/home/home-features";
import { HomeHeader, HomeHero } from "./_components/home/home-hero";
import { HomeContexts, HomeQuickGuide, HomeSummaries } from "./_components/home/home-overview";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,#f4faff_45%,#dbeafe_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-white/80 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-80 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#7dd3fc_1px,transparent_1px)] [background-size:24px_24px]" />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 py-10 sm:px-10 sm:py-14">
        <HomeHeader />
        <HomeHero />
        <HomeSummaries />
        <HomeQuickGuide />
        <HomeContexts />
        <HomeFeatures />
        <HomeSteps />
        <HomeCallToAction />
        <HomeSecurity />
        <footer className="pb-2 text-center text-xs text-slate-600">© 2026 就活copilot. All rights reserved.</footer>
      </main>
    </div>
  );
}
