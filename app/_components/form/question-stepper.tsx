"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormActions } from "./form-actions";

export type QuestionStep = {
  key: string;
  title: string;
  /** 答え方のヒント。書き出しに迷わないよう、例を添える */
  hint?: string;
  /** 答えたか。進み具合の印に使う */
  answered: boolean;
  /** 入力欄。見出しは title が持つので、入力欄だけを描く */
  input: React.ReactNode;
};

type Props = {
  steps: QuestionStep[];
  /** 保存していない変更があるか（保存の帯に出す） */
  dirty: boolean;
  /** 最後の問いで出す保存のボタン（確認のダイアログなど）。未回答の数を受け取って説明に使える */
  submit: (unanswered: number) => React.ReactNode;
};

/**
 * 質問に1問ずつ答える形。すべての質問を1つの長い画面に並べると、答える前から重く見えて手が止まるため。
 * 上に進み具合の帯を出し、点を押すとその問いへ移れる。⌘/Ctrl + Enter でも次の問いへ進む。
 */
export function QuestionStepper({ steps, dirty, submit }: Props) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  // 前へ戻るときは左から、進むときは右から出す
  const [direction, setDirection] = useState<1 | -1>(1);
  // 問いを移ったら、すぐ書き始められるよう入力欄に移る。開いた直後は、画面が勝手に動かないよう移らない
  const [moved, setMoved] = useState(false);
  const section = useRef<HTMLElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;
  const answeredCount = steps.filter((s) => s.answered).length;

  const go = (next: number) => {
    if (next < 0 || next >= steps.length) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    setMoved(true);
  };

  return (
    <div
      className="space-y-6"
      onKeyDown={(e) => {
        if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || e.nativeEvent.isComposing || last) return;
        e.preventDefault();
        go(index + 1);
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            質問 {index + 1} / {steps.length}
          </span>
          <span>回答済み {answeredCount}問</span>
        </div>
        <ol className="flex gap-1.5" aria-label="質問の一覧">
          {steps.map((s, i) => (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`質問${i + 1}：${s.title}${s.answered ? "（回答済み）" : ""}`}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "block h-2 w-full rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  i === index ? "bg-primary" : s.answered ? "bg-ring" : "bg-muted",
                )}
              />
            </li>
          ))}
        </ol>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.section
          ref={section}
          key={step.key}
          custom={direction}
          variants={{
            enter: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 * d }),
            center: { opacity: 1, x: 0 },
            leave: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 * d }),
          }}
          initial="enter"
          animate="center"
          exit="leave"
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          // 前の問いが消え終わってから新しい問いが出るので、出終わったときに入力欄へ移る
          onAnimationComplete={(definition) => {
            if (definition !== "center" || !moved) return;
            section.current?.querySelector<HTMLElement>("textarea, input, select, button[role=checkbox]")?.focus();
          }}
          className="space-y-3"
          aria-label={step.title}
        >
          <h3 className="text-xl font-bold">{step.title}</h3>
          {step.hint && <p className="text-sm text-muted-foreground">{step.hint}</p>}
          {step.input}
        </motion.section>
      </AnimatePresence>

      <FormActions dirty={dirty} shortcut={last ? false : "次へ"}>
        <Button type="button" variant="outline" onClick={() => go(index - 1)} disabled={index === 0}>
          <ArrowLeftIcon />
          戻る
        </Button>
        {last ? (
          submit(steps.length - answeredCount)
        ) : (
          <Button type="button" onClick={() => go(index + 1)}>
            次へ
            <ArrowRightIcon />
          </Button>
        )}
      </FormActions>
    </div>
  );
}
