import Link from "next/link";
import Image from "next/image";
import { ROUTES } from "@/lib/constants/routes";

type GoalScrollProps = {
  targetIndustry?: string | null;
  careerAxis?: string | null;
  goalState?: string | null;
};

export function GoalScroll({ targetIndustry, careerAxis, goalState }: GoalScrollProps) {
  return (
    <section className="relative pb-6 pt-6">
      <div className="relative mx-auto w-[min(90%,920px)]">
        {/* 1. 縦幅を抑えた横長の巻き物コンテナ */}
        <div className="relative aspect-[16/8] w-full drop-shadow-lg sm:aspect-[2048/750]">
          <Image
            src="/parchment.webp"
            alt="巻物"
            fill
            sizes="(max-width: 920px) 90vw, 920px"
            className="object-fill opacity-95"
            priority
          />

          {/* 2. コンテンツエリア：高さを抑えて情報の密度を上げる */}
          <div className="absolute inset-0 z-10 flex flex-col justify-center px-[clamp(0.75rem,4vw,8rem)] py-[clamp(0.5rem,1.5vw,1rem)] text-center">
            {/* 上部：タイトルと編集リンクを一行にまとめてスペース節約 */}
            <div className="mb-2 flex flex-col items-center gap-1 border-b border-[#3e2a16]/20 pb-1">
              <h1
                className="text-[clamp(0.75rem,2.1vw,1.5rem)] font-black text-[#3e2a16]"
                style={{ textShadow: "1px 1px 0px rgba(255,255,255,0.4)" }}
              >
                ▼ 現在の目標
              </h1>
            </div>

            {/* 3. 志望・軸を横並び、その下に目標 */}
            <div className="space-y-2 sm:space-y-3">
              <div className="mx-auto grid max-w-[42rem] gap-x-[clamp(0.5rem,2vw,2.5rem)] gap-y-1.5 sm:gap-y-2 md:grid-cols-2">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="shrink-0 text-[clamp(0.5rem,0.95vw,0.6875rem)] font-black text-[#1b1209]">
                    【志望】
                  </span>
                  <p className="truncate text-[clamp(0.75rem,2vw,1.5rem)] font-black leading-tight text-[#1b1209]">
                    {targetIndustry || "未設定"}
                  </p>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="shrink-0 text-[clamp(0.5rem,0.95vw,0.6875rem)] font-black text-[#1b1209]">
                    【軸】
                  </span>
                  <p className="truncate text-[clamp(0.75rem,2vw,1.5rem)] font-black leading-tight text-[#1b1209]">
                    {careerAxis || "未設定"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="mb-1 text-[clamp(0.5rem,0.95vw,0.6875rem)] font-black uppercase tracking-[0.2em] text-[#1b1209]">
                  GOAL NOTE
                </span>
                <p className="text-[clamp(0.7rem,1.6vw,1.25rem)] font-black leading-tight text-[#1b1209]">
                  「{goalState || "未設定の目標"}」
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center pt-1">
              <Link
                href={ROUTES.PROFILE}
                className="group flex items-center whitespace-nowrap text-[clamp(0.55rem,1.2vw,0.75rem)] font-black text-[#111111] transition-colors hover:text-[#000000]"
              >
                <span className="mr-1 inline-block transition-transform group-hover:translate-x-1">▶</span>
                目標・軸を編集する
              </Link>
            </div>

            {/* 4. キャラクター：さらに小さく配置して邪魔にならないように */}
            <Image
              src="/retro-hero.svg"
              alt="勇者"
              width={112}
              height={112}
              className="pointer-events-none absolute -bottom-2 right-12 hidden h-28 w-28 drop-shadow-md md:block pixel-art"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
