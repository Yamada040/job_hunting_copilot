"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";
import type { CarouselItem } from "./menu-carousel";
import type { CardLayout } from "./menu-layout";

// 正面のカードをマウスに合わせて傾ける最大の角度（度）
const MAX_TILT = 10;

type Props = {
  item: CarouselItem;
  front: boolean;
  /** カバーフローの中での位置・傾き・薄さ */
  layout: CardLayout;
  /** 送ったときに、新しい位置まで滑らかに動かすか（ドラッグ中は指に合わせるので動かさない） */
  animate: boolean;
  onClick: () => void;
};

/** カルーセルのカード1枚。正面のカードだけ、光る枠・浮き沈み・マウスに合わせた傾きを付ける。 */
export function MenuCard({ item, front, layout, animate, onClick }: Props) {
  const reduceMotion = useReducedMotion();
  const tiltX = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const Icon = item.icon;

  return (
    <button
      type="button"
      tabIndex={front ? 0 : -1}
      aria-label={front ? `${item.label}を開く` : `${item.label}を正面に回す`}
      onClick={onClick}
      onPointerMove={(e) => {
        if (!front || reduceMotion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        tiltY.set(((e.clientX - rect.left) / rect.width - 0.5) * 2 * MAX_TILT);
        tiltX.set(-((e.clientY - rect.top) / rect.height - 0.5) * 2 * MAX_TILT);
      }}
      onPointerLeave={() => {
        tiltX.set(0);
        tiltY.set(0);
      }}
      // 3Dで回した要素は、箱からはみ出した部分が描画で切られる。右上にはみ出す急ぎの印が切れないよう、
      // その分だけ上と右に余白を持たせ、カードはその内側に描く
      className={cn(
        "group absolute top-0 left-[calc(50%-8rem)] w-64 pt-4 pr-4 backface-hidden focus-visible:outline-none",
        animate
          ? "transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          : "transition-[opacity,filter] duration-500",
        layout.opacity === 0 && "pointer-events-none",
      )}
      style={{
        transform: layout.transform,
        perspective: 800,
        zIndex: layout.zIndex,
        opacity: layout.opacity,
        filter: layout.blurred ? "blur(1px)" : "none",
      }}
    >
      <motion.div
        className="relative h-80"
        style={{ rotateX: tiltX, rotateY: tiltY }}
        animate={front && !reduceMotion ? { y: [0, -6, 0] } : { y: 0 }}
        transition={front ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
        {/* 正面のカードの枠に流れる光。回る円錐グラデーションを、内側のカードで覆って枠の幅だけ見せる */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-2xl bg-border transition-shadow duration-500",
            front && "shadow-[0_24px_60px_color-mix(in_oklab,var(--color-ring)_40%,transparent)]",
          )}
        >
          {front && (
            <div className="absolute -inset-1/2 bg-conic from-primary via-ring via-25% to-primary motion-safe:animate-[spin_4s_linear_infinite]" />
          )}
        </div>
        <div
          className={cn(
            "absolute inset-[3px] grid grid-rows-[auto_auto_auto_1fr_auto] gap-3 rounded-[13px] bg-linear-to-b from-card via-card to-secondary px-5 pt-6 pb-5 text-center",
            "[-webkit-box-reflect:below_10px_linear-gradient(transparent_82%,rgb(255_255_255/0.18))]",
            "group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-ring",
          )}
        >
          <span className="text-lg font-bold text-foreground">{item.label}</span>
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-radial from-accent to-transparent">
            <Icon
              className={cn("h-16 w-16 text-primary transition-transform duration-500", front && "scale-110")}
              aria-hidden
            />
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">{item.summary}</span>
          <span />
          <span
            className={cn(
              "inline-flex items-center justify-center gap-1 text-sm font-bold text-primary opacity-0 transition",
              front && "opacity-100",
            )}
          >
            開く
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
        {/* 奥のカードほど背景色を重ねて薄く見せる。カード自体を半透明にすると、奥のカードの文字が透けて重なる */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-background transition-opacity duration-500"
          style={{ opacity: layout.fog }}
        />
        {item.alerts > 0 && (
          <span
            className="absolute -top-3 -right-3 grid h-7 min-w-7 place-items-center rounded-full border-2 border-card bg-destructive px-1.5 text-xs font-bold text-primary-foreground tabular-nums shadow-md"
            aria-label={`急ぎ ${item.alerts}件`}
          >
            {item.alerts}
          </span>
        )}
      </motion.div>
    </button>
  );
}
