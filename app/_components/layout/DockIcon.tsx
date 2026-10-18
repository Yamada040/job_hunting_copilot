"use client";

import { useRef, type ComponentType, type SVGProps } from "react";
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

export type DockItem = {
  /** 読み上げとツールチップに使う正式な名前 */
  label: string;
  /** アイコンの下に出す短い名前 */
  shortLabel: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// マウスからこの距離（px）以内のアイコンを大きくする
const MAGNIFY_RANGE = 120;

export function isActive(item: DockItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

type DockIconProps = Pick<DockItem, "icon" | "shortLabel"> & { mouseX: MotionValue<number>; active: boolean };

export function DockIcon({ icon: Icon, shortLabel, mouseX, active }: DockIconProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? x - (rect.left + rect.width / 2) : Infinity;
  });
  const size = useSpring(useTransform(distance, [-MAGNIFY_RANGE, 0, MAGNIFY_RANGE], [40, 64, 40]), {
    stiffness: 300,
    damping: 22,
  });
  const lift = useSpring(useTransform(distance, [-MAGNIFY_RANGE, 0, MAGNIFY_RANGE], [0, -10, 0]), {
    stiffness: 300,
    damping: 22,
  });
  return (
    <span className="flex w-10 flex-col items-center gap-0.5 sm:w-16">
      <motion.span
        ref={ref}
        style={reduceMotion ? { width: 40, height: 40 } : { width: size, height: size, y: lift }}
        className={cn(
          "relative grid place-items-center rounded-2xl text-muted-foreground transition-colors group-hover:text-primary",
          active && "text-primary",
        )}
      >
        {active && (
          <motion.span
            layoutId="dock-active"
            className="absolute inset-0 rounded-2xl bg-accent"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon className="relative h-1/2 w-1/2" aria-hidden />
      </motion.span>
      <span
        className={cn(
          "text-[10px] font-bold whitespace-nowrap text-muted-foreground group-hover:text-primary",
          active && "text-primary",
        )}
      >
        {shortLabel}
      </span>
    </span>
  );
}
