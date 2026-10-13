"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";

// スプライトシート（public/avatars/walker.svg）。16x16 のコマが横に6つ: 待機1, 待機2, 歩き1〜4。右向きに描く
const SPRITE = "/avatars/walker.svg";
const FRAME = 16;
const SCALE = 6;
const SIZE = FRAME * SCALE;
const IDLE_FRAMES = [0, 1];
const WALK_FRAMES = [2, 3, 4, 5];
// 歩く速さ（px/秒）と、コマを切り替える速さ（コマ/秒）
const WALK_SPEED = 70;
const WALK_FPS = 8;
const IDLE_FPS = 2;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 親の幅の中を、立ち止まったり歩いたりしながら左右にうろうろするアバター（コマ送り）。
 * messages を渡すと、立ち止まっている間だけ吹き出しで話し、立ち止まるたびに次の一言に切り替える。
 * avoidCenter を渡すと、真ん中のその幅（px）では立ち止まらない（歩いて通り過ぎるだけにする）。
 * 親は position: relative で、アバターの高さ（96px）以上の高さを持たせる。
 */
export function AvatarWanderer({ messages = [], avoidCenter = 0 }: { messages?: string[]; avoidCenter?: number }) {
  const reduceMotion = useReducedMotion();
  const area = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [tick, setTick] = useState(0);
  const [stops, setStops] = useState(0);

  // コマを切り替える。歩いているときは速く、立ち止まっているときはゆっくり呼吸する
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000 / (walking ? WALK_FPS : IDLE_FPS));
    return () => clearInterval(timer);
  }, [walking, reduceMotion]);

  // 立ち止まる → 行き先を決めて向きを変える → 歩く、をくり返す
  useEffect(() => {
    const width = () => Math.max(0, (area.current?.clientWidth ?? 0) - SIZE);
    // 立ち止まってよい場所。真ん中の avoidCenter の幅（とアバターの幅）を除いた左右から選ぶ
    const pickStop = () => {
      const w = width();
      const gap = Math.min(w, avoidCenter + SIZE);
      const side = (w - gap) / 2;
      const offset = Math.random() * side;
      return Math.random() < 0.5 ? offset : w - offset;
    };
    x.set(avoidCenter > 0 ? width() * 0.15 : width() / 2);
    if (reduceMotion) return;
    let stopped = false;
    let walk: ReturnType<typeof animate> | null = null;
    const wander = async () => {
      while (!stopped) {
        await wait(1200 + Math.random() * 2400);
        if (stopped) return;
        const from = x.get();
        const to = pickStop();
        if (Math.abs(to - from) < SIZE) continue;
        setFacing(to > from ? 1 : -1);
        setWalking(true);
        walk = animate(x, to, { duration: Math.abs(to - from) / WALK_SPEED, ease: "linear" });
        await walk;
        setWalking(false);
        setStops((n) => n + 1);
      }
    };
    void wander();
    return () => {
      stopped = true;
      walk?.stop();
    };
  }, [reduceMotion, x, avoidCenter]);

  const frames = walking ? WALK_FRAMES : IDLE_FRAMES;
  const frame = frames[tick % frames.length];
  const message = !walking && messages.length > 0 ? messages[stops % messages.length] : null;

  return (
    <div ref={area} className="pointer-events-none absolute inset-0" aria-hidden>
      <motion.div className="absolute bottom-0" style={{ x, width: SIZE, height: SIZE }}>
        <AnimatePresence>
          {message && (
            <motion.span
              key={message}
              className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-xl border bg-card px-3 py-1.5 text-xs font-bold whitespace-nowrap text-foreground shadow-window"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              style={{ originY: 1 }}
            >
              {message}
              {/* 吹き出しのしっぽ */}
              <span className="absolute top-full left-1/2 -mt-[5px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b bg-card" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="absolute bottom-0 left-1/2 h-3 w-14 -translate-x-1/2 rounded-[50%] bg-foreground/15" />
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${SPRITE})`,
            backgroundSize: `${SIZE * 6}px ${SIZE}px`,
            backgroundPosition: `-${frame * SIZE}px 0`,
            imageRendering: "pixelated",
            transform: `scaleX(${facing})`,
          }}
        />
      </motion.div>
    </div>
  );
}
