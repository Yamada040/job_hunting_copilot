"use client";

import { motion, useReducedMotion } from "framer-motion";

// スプライトシート（public/avatars/walker.svg）。16x16 のコマが横に6つ: 待機1, 待機2, 歩き1〜4。右向きに描く
const SPRITE = "/avatars/walker.svg";
const FRAME = 16;
const FRAME_COUNT = 6;
export const IDLE_FRAMES = [0, 1];
export const WALK_FRAMES = [2, 3, 4, 5];

/** スプライトの1コマを、scale 倍の大きさで描く。足もとに影を付ける。 */
export function AvatarSprite({ frame, scale, facing = 1 }: { frame: number; scale: number; facing?: 1 | -1 }) {
  const size = FRAME * scale;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <span className="absolute bottom-0 left-1/2 h-[12%] w-[58%] -translate-x-1/2 rounded-[50%] bg-foreground/15" />
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${SPRITE})`,
          backgroundSize: `${size * FRAME_COUNT}px ${size}px`,
          backgroundPosition: `-${frame * size}px 0`,
          imageRendering: "pixelated",
          transform: `scaleX(${facing})`,
        }}
      />
    </span>
  );
}

/**
 * アバターの吹き出し。center は親の上の中央に出す。end は、狭い画面ではアバターの右に並べ、広い画面ではアバターの上に
 * 右寄せで出す（見出しの横は狭く、上に出すと見出しの説明に重なるため）。
 */
export function SpeechBubble({ message, align = "center" }: { message: string; align?: "center" | "end" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className={
        align === "center"
          ? "absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-xl border bg-card px-3 py-1.5 text-xs font-bold whitespace-nowrap text-foreground shadow-window"
          : "relative w-max max-w-60 rounded-xl border bg-card px-3 py-1.5 text-xs leading-relaxed font-bold text-foreground shadow-window sm:absolute sm:right-0 sm:bottom-full sm:mb-1"
      }
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      style={{ originY: 1, originX: align === "center" ? 0.5 : 0.85 }}
    >
      {message}
      {/* 吹き出しのしっぽ */}
      <span
        className={
          align === "center"
            ? "absolute top-full left-1/2 -mt-[5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b bg-card"
            : "absolute top-1/2 right-full -mr-[5px] h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l bg-card sm:top-full sm:right-[12%] sm:mr-0 sm:-mt-[5px] sm:translate-y-0 sm:border-b sm:border-r sm:border-l-0"
        }
      />
    </motion.span>
  );
}
