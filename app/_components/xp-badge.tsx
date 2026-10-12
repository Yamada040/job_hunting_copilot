"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useMe } from "@/lib/api/me";
import { LevelEmblem } from "./xp/level-emblem";
import { LevelUpDialog } from "./xp/level-up-dialog";
import { XpGauge } from "./xp/xp-gauge";

// XPのゲージが満ちて次のレベルへ繰り上がるまでの時間（ms）。これを待ってからレベルアップの演出を開く
const LEVEL_UP_DELAY = 1100;

/**
 * ヘッダーのレベル・XPの表示。値は TanStack Query の useMe のキャッシュから読むので、
 * XPが付く操作のレスポンスでキャッシュが書き換われば、取り直さずに表示が変わる。
 */
export function XpBadge() {
  const { data } = useMe();
  const reduceMotion = useReducedMotion();
  const xp = data?.xp ?? 0;
  const level = data?.level ?? 1;

  // XP・レベルが増えたことを、前回の描画時の値と比べて検出する（初回の読み込みでは演出しない）
  const [prev, setPrev] = useState(data ? { xp, level } : null);
  const [gains, setGains] = useState<{ id: number; amount: number }[]>([]);
  const [reachedLevel, setReachedLevel] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  if (data && (prev?.xp !== xp || prev?.level !== level)) {
    if (prev && xp > prev.xp) setGains((g) => [...g, { id: Date.now(), amount: xp - prev.xp }]);
    if (prev && level > prev.level) setReachedLevel(level);
    setPrev({ xp, level });
  }

  // ダイアログの暗い幕でゲージの繰り上がりが隠れないよう、ゲージが満ちて繰り上がるのを見せてから開く
  useEffect(() => {
    if (reachedLevel === null) return;
    const timer = setTimeout(
      () => {
        setLevelUp(reachedLevel);
        setReachedLevel(null);
      },
      reduceMotion ? 0 : LEVEL_UP_DELAY,
    );
    return () => clearTimeout(timer);
  }, [reachedLevel, reduceMotion]);

  // 届く前に描くと XP 0・Lv 1 から始まり、届いた瞬間に大きく増えたように動いてしまうので、届くまでは場所だけ取る
  if (!data) return <div className="h-16 w-[28rem]" />;

  return (
    <>
      <div className="relative flex w-[28rem] items-center gap-3">
        <LevelEmblem level={level} className="h-16 w-14 shrink-0 text-base" />
        <XpGauge xp={xp} level={level} />
        {/* 獲得したXPが、ゲージの上へ浮かんで消える */}
        <AnimatePresence>
          {gains.map((gain) => (
            <motion.span
              key={gain.id}
              className="pointer-events-none absolute -top-1 right-0 text-sm font-black text-primary"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: [0, 1, 1, 0], y: reduceMotion ? 0 : -18 }}
              transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
              onAnimationComplete={() => setGains((g) => g.filter((x) => x.id !== gain.id))}
            >
              +{gain.amount} XP
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <LevelUpDialog level={levelUp} onClose={() => setLevelUp(null)} />
    </>
  );
}
