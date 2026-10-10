"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { useMe } from "@/lib/api/me";
import { levelThresholds, XP_PER_LEVEL } from "@/lib/xp/compute-level";

/**
 * ヘッダーのレベル・XPの表示。値は TanStack Query の useMe のキャッシュから読むので、
 * XPが付く操作のレスポンスでキャッシュが書き換われば、取り直さずに表示が変わる。
 */
export function XpBadge() {
  const { data } = useMe();
  const level = data?.level;

  // レベルが上がったことを、前回の描画時のレベルと比べて検出する（初回の読み込みでは演出しない）
  const [prevLevel, setPrevLevel] = useState(level);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  if (level !== prevLevel) {
    if (prevLevel !== undefined && level !== undefined && level > prevLevel) setLevelUp(level);
    setPrevLevel(level);
  }

  return (
    <>
      <XpBadgeStatus xp={data?.xp ?? 0} level={level ?? 1} />

      {/* 2. レベルアップ演出：モーダル（全画面中央） */}
      {levelUp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative aspect-video w-full max-w-[650px] overflow-hidden border-4 border-white shadow-2xl">
            {/* 背景画像：levelup.jpeg (常駐バーより鮮明に表示) */}
            <Image
              src="/levelup.jpeg"
              alt="Level Up Background"
              fill
              sizes="(max-width: 650px) 100vw, 650px"
              className="object-cover opacity-90"
              priority
            />

            {/* DQ風メッセージウィンドウ */}
            <div className="absolute inset-x-8 bottom-8">
              <div className="relative rounded-lg border border-[#52525b] bg-[#111111] p-6 shadow-xl">
                {/* 枠に割り込むタイトル */}
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black px-4 text-lg font-bold tracking-widest text-white">
                  LEVEL UP!
                </span>

                <div className="space-y-4 text-center">
                  <p className="text-xl font-bold leading-relaxed text-white">
                    おめでとう！
                    <br />
                    あなたは Lv.{levelUp} に なった！
                  </p>

                  <button
                    type="button"
                    className="group flex w-full items-center justify-center gap-2 text-2xl font-bold text-white transition hover:text-yellow-400"
                    onClick={() => setLevelUp(null)}
                  >
                    <span className="animate-pulse">▶</span>
                    <span>つぎへ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function XpBadgeStatus({ xp, level }: { xp: number; level: number }) {
  const { progress, xpIntoLevel, xpToNext } = useMemo(() => {
    const { prev, next } = levelThresholds(level);
    const into = xp - prev;
    return {
      progress: Math.min(1, into / XP_PER_LEVEL),
      xpIntoLevel: into,
      xpToNext: Math.max(0, next - xp),
    };
  }, [xp, level]);

  return (
    <div className="flex min-w-[600px] flex-1 items-center gap-4 rounded-md px-2 py-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-widest text-sky-600">LEVEL</span>
        <span className="theme-readable text-2xl font-bold tracking-tighter">Lv {level}</span>
        <span className="theme-readable-muted text-xs">XP {xp}</span>
      </div>
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <div className="h-2.5 w-full rounded-full border border-sky-300 bg-sky-100 p-[2px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="theme-readable-muted flex justify-between text-[10px] font-bold tracking-tight">
          <span>つぎの レベルまで {xpToNext} XP</span>
          <span>
            {xpIntoLevel} / {XP_PER_LEVEL}
          </span>
        </div>
      </div>
    </div>
  );
}
