"use client";

import type { ComponentProps, ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MotionCard = motion.create(Card);
const SPRING = { stiffness: 220, damping: 20 };

type Props = Omit<ComponentProps<typeof Card>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & {
  /** マウスを端に寄せたときに傾ける最大の角度（度） */
  maxTilt?: number;
};

/**
 * マウスに合わせて傾き、表面の光がマウスを追うカード。中の要素を TiltLayer で包むと、面から浮いて見える。
 * Motion Primitives（MIT）の Tilt と Spotlight をもとに1つにまとめた。Spotlight をそのまま使わないのは、親を
 * overflow: hidden に書き換え、その中の3Dの重なり（TiltLayer の浮き）が平らに潰れるため。
 * タッチでは傾けない（指でのスクロールとぶつかるため）。「視差効果を減らす」設定では動かさない。
 */
export function TiltCard({ maxTilt = 8, className, children, ...props }: Props) {
  const reduceMotion = useReducedMotion();
  // マウスの位置。カードの左上を0、右下を1とする
  const pointerX = useSpring(useMotionValue(0.5), SPRING);
  const pointerY = useSpring(useMotionValue(0.5), SPRING);
  const rotateX = useTransform(pointerY, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(pointerX, [0, 1], [-maxTilt, maxTilt]);
  const glareX = useTransform(pointerX, (v) => v * 100);
  const glareY = useTransform(pointerY, (v) => v * 100);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, color-mix(in oklab, var(--color-card) 35%, transparent), color-mix(in oklab, var(--color-ring) 14%, transparent) 30%, transparent 65%)`;

  return (
    <MotionCard
      {...props}
      // Card は overflow: hidden を持つが、それがあると中の3Dの重なりが平らになるので外す
      className={cn("group/tilt relative overflow-visible transform-3d", className)}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      onPointerMove={(e) => {
        if (reduceMotion || e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        pointerX.set((e.clientX - rect.left) / rect.width);
        pointerY.set((e.clientY - rect.top) / rect.height);
      }}
      onPointerLeave={() => {
        pointerX.set(0.5);
        pointerY.set(0.5);
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{ background: glare }}
      />
      {children}
    </MotionCard>
  );
}

/** TiltCard の中で、面から depth（px）だけ浮かせる要素。浮かせたい要素の親はすべて TiltLayer か TiltCard にする。 */
export function TiltLayer({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("transform-3d", className)} style={{ transform: `translateZ(${depth}px)` }}>
      {children}
    </div>
  );
}
