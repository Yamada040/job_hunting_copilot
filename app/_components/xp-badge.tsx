"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

      <Dialog open={levelUp !== null} onOpenChange={(open) => !open && setLevelUp(null)}>
        <DialogContent className="gap-3 text-center">
          <p className="text-xs font-bold tracking-widest text-primary">LEVEL UP</p>
          <DialogTitle className="text-2xl font-bold">レベル {levelUp} になりました</DialogTitle>
          <DialogDescription>就活の記録を積み重ねた分だけ、レベルが上がります。</DialogDescription>
          <DialogClose asChild>
            <Button type="button" className="mx-auto mt-2">
              閉じる
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
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
        <span className="text-2xl font-bold tracking-tighter">Lv {level}</span>
        <span className="text-xs text-muted-foreground">XP {xp}</span>
      </div>
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <div className="h-2.5 w-full rounded-full border border-sky-300 bg-sky-100 p-[2px]">
          <div
            className="h-full rounded-full bg-linear-to-r from-sky-400 to-sky-600"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold tracking-tight text-muted-foreground">
          <span>次のレベルまで {xpToNext} XP</span>
          <span>
            {xpIntoLevel} / {XP_PER_LEVEL}
          </span>
        </div>
      </div>
    </div>
  );
}
