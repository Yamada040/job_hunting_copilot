"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

import { gaugeProgress, gaugeSteps, type XpState } from "@/lib/xp/gauge";
import { levelThresholds, XP_PER_LEVEL } from "@/lib/xp/compute-level";

// ゲージの目盛りの数。1レベル分を5つに区切る
const TICKS = 5;
// 先に伸びる淡いゲージ（ゴースト）から、本体のゲージが遅れてついてくるまでの時間（秒）
const GHOST_LEAD = 0.25;

/**
 * XPのゲージ。XPが増えると、先に淡いゲージが伸び、本体が遅れてついてくる
 * （https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar）。
 * レベルが上がるときは、満タンにしてから次のレベルへ繰り上がる
 * （https://motion-reference.takayustudio.jp/#motion=catalog-game-progress-xp-overflow）。
 * 累計のXPの数字は、回りながら増える（https://motion-reference.takayustudio.jp/#motion=catalog-ui-feedback-number-ticker）。
 */
export function XpGauge({ xp, level }: XpState) {
  const reduceMotion = useReducedMotion();
  const fill = useMotionValue(gaugeProgress({ xp, level }));
  const ghost = useMotionValue(gaugeProgress({ xp, level }));
  const shownXp = useMotionValue(xp);
  const roundedXp = useTransform(shownXp, (v) => Math.round(v));
  const fillWidth = useTransform(fill, (v) => `${v * 100}%`);
  const ghostWidth = useTransform(ghost, (v) => `${v * 100}%`);
  const prev = useRef<XpState>({ xp, level });

  useEffect(() => {
    const from = prev.current;
    prev.current = { xp, level };
    if (xp === from.xp && level === from.level) return;
    if (reduceMotion || xp < from.xp) {
      fill.set(gaugeProgress({ xp, level }));
      ghost.set(gaugeProgress({ xp, level }));
      shownXp.set(xp);
      return;
    }
    let cancelled = false;
    const tick = animate(shownXp, xp, { duration: 0.9, ease: "easeOut" });
    const run = async () => {
      let previous = fill.get();
      for (const target of gaugeSteps(from, { xp, level })) {
        if (cancelled) return;
        // 満タンの次の 0 は、動かさずにすぐ戻す（次のレベルの始まり）
        if (target === 0 && previous === 1) {
          fill.set(0);
          ghost.set(0);
        } else {
          ghost.set(target);
          await animate(fill, target, { duration: 0.6, delay: GHOST_LEAD, ease: [0.22, 1, 0.36, 1] });
        }
        previous = target;
      }
    };
    void run();
    return () => {
      cancelled = true;
      tick.stop();
    };
  }, [xp, level, reduceMotion, fill, ghost, shownXp]);

  const { next } = levelThresholds(level);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-1 text-[10px] font-bold text-muted-foreground sm:gap-3 sm:text-[11px]">
        <span>
          次のレベルまで <span className="text-foreground tabular-nums">{Math.max(0, next - xp)}</span> XP
        </span>
        <span className="hidden sm:inline">
          累計 <motion.span className="text-foreground tabular-nums">{roundedXp}</motion.span> XP
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full border bg-secondary sm:h-4">
        <motion.div className="absolute inset-y-0 left-0 bg-ring/35" style={{ width: ghostWidth }} />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-ring to-primary"
          style={{ width: fillWidth }}
        />
        {Array.from({ length: TICKS - 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-y-0 w-px bg-card/80"
            style={{ left: `${((i + 1) / TICKS) * 100}%` }}
          />
        ))}
      </div>
      <span className="sr-only">
        {xp - levelThresholds(level).prev} / {XP_PER_LEVEL} XP
      </span>
    </div>
  );
}
