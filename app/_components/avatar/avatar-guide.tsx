"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import { AvatarSprite, IDLE_FRAMES, SpeechBubble } from "./avatar-sprite";

const SCALE = 5;
// 待機のコマを切り替える速さ（コマ/秒）と、吹き出しの一言を切り替える間隔（ms）
const IDLE_FPS = 2;
const MESSAGE_INTERVAL = 6000;

/**
 * 画面の見出しの横に立ち、その画面の状況や使い方を吹き出しで話すアバター。歩かずにその場で呼吸するだけにして、
 * 入力の邪魔にならないようにする。messages が複数あれば、間隔をあけて順に話す。
 * 広い画面では吹き出しがアバターの上に出るので、親は上にその分の余白を持たせる。
 */
export function AvatarGuide({ messages }: { messages: string[] }) {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000 / IDLE_FPS);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (messages.length < 2) return;
    const timer = setInterval(() => setTurn((t) => t + 1), MESSAGE_INTERVAL);
    return () => clearInterval(timer);
  }, [messages.length]);

  const message = messages.length > 0 ? messages[turn % messages.length] : null;

  // 吹き出しは数秒ごとに入れ替わり、読み上げると操作の邪魔になるので、読み上げには含めない（話す内容は補足にとどめる）
  return (
    <div className="relative flex items-center gap-3 sm:block" aria-hidden>
      <AvatarSprite frame={IDLE_FRAMES[tick % IDLE_FRAMES.length]} scale={SCALE} facing={-1} />
      <AnimatePresence mode="wait">
        {message && <SpeechBubble key={message} message={message} align="end" />}
      </AnimatePresence>
    </div>
  );
}
