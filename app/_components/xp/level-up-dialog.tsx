"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LevelEmblem } from "./level-emblem";

/**
 * レベルアップの演出。紋章が押し込まれるように弾んで現れ、輪が広がる
 * （https://motion-reference.takayustudio.jp/#motion=catalog-game-reward-level-up）。
 */
export function LevelUpDialog({ level, onClose }: { level: number | null; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <Dialog open={level !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="items-center gap-3 overflow-hidden text-center">
        <div className="relative mx-auto grid h-36 w-36 place-items-center">
          {!reduceMotion &&
            [0, 0.25].map((delay) => (
              <motion.span
                key={delay}
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-ring"
                initial={{ scale: 0.4, opacity: 0.8 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.1, delay: 0.25 + delay, ease: "easeOut" }}
              />
            ))}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.3, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 11 }}
          >
            <LevelEmblem level={level ?? 1} className="h-28 w-24 text-2xl" />
          </motion.div>
        </div>
        <p className="text-xs font-bold tracking-[0.3em] text-primary">LEVEL UP</p>
        <DialogTitle className="text-2xl font-bold">レベル {level} になりました</DialogTitle>
        <DialogDescription>就活の記録を積み重ねた分だけ、レベルが上がります。</DialogDescription>
        <DialogClose asChild>
          <Button type="button" className="mx-auto mt-2">
            閉じる
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
