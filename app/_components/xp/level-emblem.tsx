"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// 六角形の紋章の形。上下を尖らせ、ゲームのレベルのバッジに見せる
const HEXAGON = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

/** レベルの紋章。レベルが変わると、数字が弾むように入れ替わる。 */
export function LevelEmblem({ level, className }: { level: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      className={cn("grid place-items-center bg-linear-to-b from-ring to-primary p-[3px]", className)}
      style={{ clipPath: HEXAGON }}
    >
      <div
        className="grid h-full w-full place-items-center bg-linear-to-b from-primary to-secondary-foreground text-primary-foreground"
        style={{ clipPath: HEXAGON }}
      >
        {/* 六角形は上下が細いので、文字は真ん中の幅の広いところに収まる大きさにする。3桁になったら数字を小さくする */}
        <div className="flex flex-col items-center gap-[0.1em] leading-none">
          <span className="text-[0.45em] font-bold tracking-wider opacity-80">LEVEL</span>
          <motion.span
            key={level}
            className={cn("font-black tabular-nums", level >= 100 ? "text-[0.95em]" : "text-[1.25em]")}
            initial={reduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
          >
            {level}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
