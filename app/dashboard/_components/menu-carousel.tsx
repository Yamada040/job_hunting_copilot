"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { AvatarWanderer } from "@/app/_components/avatar/avatar-wanderer";
import { MenuBackdrop } from "./menu-backdrop";
import { MenuCard } from "./menu-card";
import { MenuControls } from "./menu-controls";
import { coverflowLayout, offsetFrom } from "./menu-layout";

export type CarouselItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** カードに出す今の状況（件数や、急ぎのもの） */
  summary: ReactNode;
  /** 急ぎのものの件数。1以上ならカードの角に印を出す */
  alerts: number;
};

// ドラッグした距離（px）を、送るカードの枚数に直す割合
const DRAG_CARDS_PER_PIXEL = 1 / 260;
// 離したときの速さ（px/ms）から、慣性で余分に回すカードの数への割合と上限
const FLING_CARDS_PER_SPEED = 2.5;
const MAX_FLING_CARDS = 3;
// 正面のカードの幅（px）。アバターがこの幅では立ち止まらないようにする
const CENTER_CARD_WIDTH = 260;
// 入るとき、カルーセルが手前に迫る動きを見せてから画面を移す時間（ms）
const LEAVE_DURATION = 450;

/**
 * 横に送って選ぶ3Dのメニュー（カバーフロー）。←→キー・ドラッグ・ホイール・横のカードを押すことで送り、正面のカードを押すとその画面を開く。
 * 端まで送ると反対の端へ回り込む。本物の3D（three.js など）ではなく CSS の3D変形で作るのは、読み込む量を増やさないため。
 */
export function MenuCarousel({ items, avatarMessages }: { items: CarouselItem[]; avatarMessages: string[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  // 送った位置。何周しても近い向きに滑らかに送れるよう、カードの数で割らずに持つ
  const [position, setPosition] = useState(0);
  // ドラッグ中に、指に合わせて送っている途中の枚数
  const [dragCards, setDragCards] = useState(0);
  // dragging は描画（カーソル・回転のアニメーションの有無）に使い、drag は離した直後の click を無視するために使う
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // 開いた直後は、カードが奥から集まってくる位置から始める
  const [arrived, setArrived] = useState(false);
  const drag = useRef<{ startX: number; lastX: number; lastTime: number; speed: number; moved: boolean } | null>(null);
  const wheelLocked = useRef(false);

  const count = items.length;
  const indexOf = (n: number) => ((Math.round(n) % count) + count) % count;
  const facing = position - dragCards;
  const frontIndex = indexOf(facing);

  const rotateBy = (delta: number) => setPosition((p) => p + delta);
  const rotateTo = (index: number) => {
    let diff = index - indexOf(position);
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    rotateBy(diff);
  };
  const endDrag = () => {
    const speed = drag.current?.speed ?? 0;
    const fling = reduceMotion
      ? 0
      : Math.max(-MAX_FLING_CARDS, Math.min(MAX_FLING_CARDS, Math.round(-speed * FLING_CARDS_PER_SPEED)));
    setPosition(Math.round(facing) + fling);
    setDragCards(0);
    setDragging(false);
  };
  const enter = (href: string) => {
    setLeaving(true);
    setTimeout(() => router.push(href), reduceMotion ? 0 : LEAVE_DURATION);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    router.prefetch(items[frontIndex].href);
  }, [router, items, frontIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rotateBy(-1);
      if (e.key === "ArrowRight") rotateBy(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const trackTransform = !arrived ? "translateZ(-900px) rotateY(-35deg)" : leaving ? "translateZ(380px)" : "none";

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative h-[27rem] cursor-grab touch-pan-y select-none overflow-hidden rounded-3xl",
          dragging && "cursor-grabbing",
        )}
        onPointerDown={(e) => {
          drag.current = { startX: e.clientX, lastX: e.clientX, lastTime: e.timeStamp, speed: 0, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.startX;
          if (Math.abs(dx) > 4 && !d.moved) {
            d.moved = true;
            setDragging(true);
          }
          if (!d.moved) return;
          const elapsed = e.timeStamp - d.lastTime;
          if (elapsed > 0) d.speed = (e.clientX - d.lastX) / elapsed;
          d.lastX = e.clientX;
          d.lastTime = e.timeStamp;
          setDragCards(dx * DRAG_CARDS_PER_PIXEL);
        }}
        onPointerUp={() => {
          if (drag.current?.moved) endDrag();
          // 離したあとの click でカードが選ばれないよう、moved はこの後の click が読み終えてから消す
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          if (drag.current?.moved) endDrag();
          drag.current = null;
        }}
        onWheel={(e) => {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (Math.abs(delta) < 8 || wheelLocked.current) return;
          wheelLocked.current = true;
          rotateBy(delta > 0 ? 1 : -1);
          setTimeout(() => (wheelLocked.current = false), 350);
        }}
      >
        <MenuBackdrop />

        {/* 透明にする役目は、カードを並べる要素ではなくこの外側が持つ。3Dの配置を持つ要素の opacity を下げると、
            ブラウザが中身を平らにまとめて描くため、カードの傾きや奥行きが潰れて見えてしまう */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            (!arrived || leaving) && "opacity-0",
            leaving && "duration-500 ease-in",
            reduceMotion && "duration-0",
          )}
          style={{ perspective: 1100 }}
        >
          <div
            className={cn(
              // 3Dの配置（preserve-3d）にせず平らに重ね、重なりの順番は z-index で決める。傾いたカードどうしでは
              // ブラウザの奥行きの判定が見た目とずれ、奥のカードが手前のカードへのクリックを横取りするため
              "absolute inset-x-0 top-2 h-[22rem]",
              !dragging && "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
              leaving && "duration-500 ease-in",
              reduceMotion && "duration-0",
            )}
            style={{ transform: trackTransform, perspective: 1100 }}
          >
            {items.map((item, i) => {
              const front = i === frontIndex && dragCards === 0;
              return (
                <MenuCard
                  key={item.href}
                  item={item}
                  front={front}
                  layout={coverflowLayout(offsetFrom(i, facing, count))}
                  animate={!dragging && !reduceMotion}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    if (front) enter(item.href);
                    else rotateTo(i);
                  }}
                />
              );
            })}
          </div>
        </div>
        {/* アバターはカルーセルの床（カードの手前）を歩く。開いた直後とカードを開くときは、カードと一緒に消す */}
        <div
          className={cn(
            "absolute inset-x-[18%] bottom-0 h-24 transition-opacity duration-500",
            (!arrived || leaving) && "opacity-0",
          )}
        >
          {/* 吹き出しが正面のカードの「開く」を隠さないよう、正面のカードの幅では立ち止まらせない */}
          <AvatarWanderer messages={avatarMessages} avoidCenter={CENTER_CARD_WIDTH} />
        </div>
        {/* 入るときに、正面のカードへ飛び込んだように白く光らせる */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-card opacity-0 transition-opacity duration-500 ease-in",
            leaving && "opacity-100",
          )}
        />
      </div>

      <MenuControls label={items[frontIndex].label} onPrev={() => rotateBy(-1)} onNext={() => rotateBy(1)} />
    </div>
  );
}
