"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";

/**
 * 奥行きの見せ方（depth）で、いま何番目のセクションを見ているか。セクションは1画面に1つずつ並んでいるので、
 * スクロール量を画面の高さで割れば番号になる。縦に並べる画面では使わない（その画面では値に意味がない）。
 */
export function useCurrentSection(): number {
  const { scrollY } = useScroll();
  const [current, setCurrent] = useState(0);
  useMotionValueEvent(scrollY, "change", (y) => setCurrent(Math.round(y / window.innerHeight)));
  return current;
}
