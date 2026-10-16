"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { companiesQuery, companyKeys, useAnalyzeCompany, useCreateCompany, type Company } from "@/lib/api/companies";
import { ROUTES } from "@/lib/constants/routes";
import { apiErrorText } from "@/lib/api/client";
import { showAvatarNotice } from "@/app/_components/avatar/avatar-notice-store";

// 入力欄が空のあいだ、例の企業名を入れ替えて見せる（https://motion-reference.takayustudio.jp/#motion=word-swap）
const EXAMPLES = ["トヨタ自動車", "ソニーグループ", "サイバーエージェント", "三菱商事", "任天堂"];
const EXAMPLE_INTERVAL = 2400;

/**
 * 企業名を入れて送るだけで、企業の登録とAI企業分析をまとめて始め、その企業の詳細の画面へ移る。
 * 分析は数十秒かかるので待たずに移り、詳細の画面が分析の状態を読んで「処理中」と結果を出す。
 */
export function QuickAnalysis() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createCompany = useCreateCompany();
  const analyzeCompany = useAnalyzeCompany();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    let company: Company;
    try {
      // 同じ名前の企業がもうあれば、登録し直さずにその企業を分析する（登録し直すと 409 になる）
      const candidates = await queryClient.fetchQuery(companiesQuery(trimmed));
      const existing = candidates.find((c) => c.name === trimmed);
      // 移った先の詳細の画面を読み込み中にせず、すぐ分析の欄まで送れるよう、一覧の値で詳細のキャッシュを埋める
      if (existing) queryClient.setQueryData(companyKeys.detail(existing.id), existing);
      company = existing ?? (await createCompany.mutateAsync({ name: trimmed })).company;
    } catch (e) {
      showAvatarNotice(apiErrorText(e));
      return;
    } finally {
      setPending(false);
    }
    const analyzing =
      queryClient.isMutating({
        mutationKey: companyKeys.analysis,
        predicate: (mutation) => mutation.state.variables === company.id,
      }) > 0;
    if (company.aiResult === null && !analyzing) analyzeCompany.mutate(company.id);
    setName("");
    router.push(ROUTES.COMPANY_ANALYSIS(company.id));
  };

  return (
    <form
      className="w-full max-w-xl space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <GlowFrame fast={pending}>
        <div className="flex items-center gap-2 py-2 pr-2 pl-4">
          <SparklesIcon className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="relative min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              aria-label="AI企業分析"
              className="h-10 w-full bg-transparent text-base outline-none"
            />
            {name === "" && <ExamplePlaceholder />}
          </div>
          <Button type="submit" size="lg" className="rounded-xl" disabled={pending || !name.trim()}>
            {pending ? "準備中…" : "分析"}
            <ArrowRightIcon />
          </Button>
        </div>
      </GlowFrame>
      <p className="text-xs text-muted-foreground">
        企業名を入れて Enter。登録とAI企業分析を一度に行います（1日3回まで）
      </p>
    </form>
  );
}

/**
 * 入力欄の枠を、光の帯がゆっくり回り続ける枠にする（https://motion-reference.takayustudio.jp/#motion=lp-conic）。
 * 送ったあとの準備中は速く回して、処理が進んでいることを見せる。
 */
function GlowFrame({ fast, children }: { fast: boolean; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative overflow-clip rounded-2xl p-[1.5px] shadow-[0_12px_40px_-16px_var(--ring)] focus-within:shadow-[0_12px_48px_-12px_var(--ring)]">
      {/* 枠より大きい円錐の色を回し、内側を面で覆って縁だけを見せる。CSS の @property を使わないのは、Tailwind の設定を増やさずに済むため */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,var(--border)_0deg,var(--ring)_70deg,var(--primary)_110deg,var(--border)_180deg,var(--border)_360deg)]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: fast ? 1.2 : 6, ease: "linear", repeat: Infinity }}
      />
      <div className="relative rounded-[calc(1rem-1.5px)] bg-card">{children}</div>
    </div>
  );
}

function ExamplePlaceholder() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % EXAMPLES.length), EXAMPLE_INTERVAL);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center overflow-clip text-base whitespace-nowrap text-muted-foreground"
    >
      例：
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={EXAMPLES[index]}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {EXAMPLES[index]}
        </motion.span>
      </AnimatePresence>
      を分析
    </span>
  );
}
