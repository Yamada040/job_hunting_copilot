"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType, type SVGProps } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AcademicCapIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { QuickEventDialog } from "./quick-event-dialog";

type AddItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** 作成の画面へ移る。無ければ、その場で予定を追加するダイアログを開く */
  href?: string;
};

// 予定は一番よく追加し、入れる項目も少ないので、画面を移らずにその場で追加する
const addItems: AddItem[] = [
  { label: "予定", icon: CalendarDaysIcon },
  { label: "ES", icon: DocumentTextIcon, href: ROUTES.ES_NEW },
  { label: "企業", icon: BuildingOfficeIcon, href: ROUTES.COMPANIES_NEW },
  { label: "面接ログ", icon: ChatBubbleLeftRightIcon, href: ROUTES.INTERVIEWS_NEW },
  { label: "問題", icon: AcademicCapIcon, href: ROUTES.WEBTESTS_NEW },
];

// メニューが花開く半径（px）と、左端から右端までの角度（度）。両端がドックのアイコンに重ならないよう、
// 真横まで広げず、ドックより上に扇形で並べる
const RADIUS = 170;
const FROM_ANGLE = 145;
const TO_ANGLE = 35;

/**
 * どの画面からでも、予定・ES・企業などをすぐ追加する「＋」ボタン。押すと、追加できるものが押した場所から円形に花開く
 * （https://motion-reference.takayustudio.jp/#motion=catalog-ui-spatial-radial-command-bloom）。キーボードでは N キーでも開く。
 */
export function QuickAdd() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  // document.body はブラウザで描くときにしか無いので、サーバーで描くときは幕を出さない
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* 幕は body の直下に描く。ドックの帯はすりガラスの効果（backdrop-blur）を持ち、その中に置くと
          fixed の「画面全体」がドックの範囲になってしまうため */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      <div className="relative z-50 mx-1 self-center">
        <AnimatePresence>
          {open &&
            addItems.map((item, i) => {
              const angle = ((FROM_ANGLE + ((TO_ANGLE - FROM_ANGLE) * i) / (addItems.length - 1)) * Math.PI) / 180;
              const x = Math.cos(angle) * RADIUS;
              const y = -Math.sin(angle) * RADIUS;
              return (
                <motion.div
                  key={item.label}
                  className="absolute top-1/2 left-1/2 -mt-8 -ml-8"
                  initial={reduceMotion ? { opacity: 0, x, y } : { opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: 1, x, y, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26, delay: reduceMotion ? 0 : i * 0.035 }}
                >
                  <AddButton
                    item={item}
                    onSelect={() => {
                      setOpen(false);
                      if (!item.href) setEventDialogOpen(true);
                    }}
                  />
                </motion.div>
              );
            })}
        </AnimatePresence>

        <button
          type="button"
          aria-label={open ? "追加のメニューを閉じる" : "追加する（N）"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="grid h-12 w-12 place-items-center rounded-full bg-linear-to-b from-ring to-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring sm:h-14 sm:w-14"
        >
          <PlusIcon className={cn("h-6 w-6 transition-transform duration-300 sm:h-7 sm:w-7", open && "rotate-45")} aria-hidden />
        </button>
      </div>

      <QuickEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
    </>
  );
}

function AddButton({ item, onSelect }: { item: AddItem; onSelect: () => void }) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="grid h-12 w-12 place-items-center rounded-full border bg-card text-primary shadow-window transition-colors group-hover:bg-accent">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="rounded-full bg-card/90 px-1.5 text-[11px] font-bold text-foreground">{item.label}</span>
    </>
  );
  const className = "group flex w-16 flex-col items-center gap-1";
  const label = `${item.label}を追加`;

  return item.href ? (
    <Link href={item.href} aria-label={label} onClick={onSelect} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onSelect} className={className}>
      {content}
    </button>
  );
}

/** 文字を入力している最中か。N キーで追加のメニューを開くのは、入力中でないときだけにする。 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
