"use client";

import type { ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionStyle } from "framer-motion";

import { scenePosition, sceneStyle } from "./depth-scroll";

type Props = {
  /** ページの上から何番目のセクションか（0から） */
  index: number;
  /** ページ内リンクの飛び先。1画面分の高さを持つこの要素に付け、そこまでスクロールすればこのセクションが手前に来る */
  id?: string;
  children: ReactNode;
};

/**
 * スクロールで奥から迫るセクション。depth の画面では1画面分のスクロールを受け持ち、中身は画面に固定して奥行きだけを動かす。
 * それ以外の画面では、縦に並べたまま何もしない。
 * 位置は CSS の変数で渡し、使うかどうかは depth の条件（CSS のメディアクエリ）で決める。画面の大きさを JavaScript で
 * 判定すると、サーバーで描いた縦並びから読み込み後に切り替わり、ページが一瞬崩れて見えるため。
 */
export function DepthScene({ index, id, children }: Props) {
  const { scrollY } = useScroll();
  // サーバーで描くときは画面の高さが無いので、ページの先頭にいるものとして描く
  const style = useTransform(scrollY, (y) =>
    sceneStyle(index - scenePosition(typeof window === "undefined" ? 0 : y / window.innerHeight)),
  );
  // Framer Motion は CSS の変数も動かせるが、型（MotionStyle）が変数の名前を受け付けないので、ここで型だけ変える
  const variables = {
    "--depth-transform": useTransform(style, (s) => s.transform),
    "--depth-opacity": useTransform(style, (s) => s.opacity),
    "--depth-filter": useTransform(style, (s) => s.filter),
    "--depth-visibility": useTransform(style, (s) => (s.opacity === 0 ? "hidden" : "visible")),
    "--depth-pointer": useTransform(style, (s) => (s.interactive ? "auto" : "none")),
  } as MotionStyle;

  return (
    <div id={id} className="scroll-mt-28 depth:h-screen depth:scroll-mt-0">
      <motion.div
        className="depth:fixed depth:inset-0 depth:flex depth:items-center depth:justify-center depth:px-10 depth:pt-32 depth:pb-6 depth:[transform:var(--depth-transform)] depth:[opacity:var(--depth-opacity,0)] depth:[filter:var(--depth-filter)] depth:[visibility:var(--depth-visibility,hidden)] depth:[pointer-events:var(--depth-pointer,none)]"
        style={variables}
      >
        <div className="flex w-full max-w-6xl flex-col gap-16 depth:gap-6">{children}</div>
      </motion.div>
    </div>
  );
}
