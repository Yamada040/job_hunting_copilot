"use client";

import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fadeInUp,
  parchmentAccent,
  parchmentCard,
  parchmentHeading,
  parchmentIconBox,
  staggerChildren,
} from "./parchment";
import { SectionHeading } from "./section-heading";

const features = [
  {
    icon: PencilSquareIcon,
    title: "AI ES添削",
    description: "GPT・Geminiによる高品質な添削で、通過率の高いエントリーシートを作成",
    benefit: "伝わるESに磨き上げる",
  },
  {
    icon: BuildingOffice2Icon,
    title: "企業管理",
    description: "選考状況、志望度、メモを一元管理。進捗を見える化して効率的に就活",
    benefit: "抜け漏れを防いで前進できる",
  },
  {
    icon: ChartBarIcon,
    title: "進捗可視化",
    description: "ゲーム感覚でタスクをこなし、XPとレベルで成長を実感できる仕組み",
    benefit: "迷わず次の行動に移れる",
  },
];

const steps = [
  { step: "01", title: "ログイン", description: "Google認証でログインして、すぐに利用を開始できます。" },
  { step: "02", title: "企業・ES登録", description: "志望企業とエントリーシートを登録して管理開始。" },
  { step: "03", title: "AI活用で効率化", description: "添削機能で質を向上、進捗管理で確実に内定獲得へ。" },
];

const MotionCard = motion.create(Card);

export function HomeFeatures() {
  return (
    <section id="features" className="space-y-8">
      <SectionHeading
        title="就活を変える3つの機能"
        description="AI技術と効率的な管理機能で、就活の成功確率を大幅に向上させます"
      />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-8 md:grid-cols-3"
      >
        {features.map((feature) => (
          <MotionCard
            key={feature.title}
            variants={fadeInUp}
            whileHover={{ scale: 1.02, y: -5 }}
            className={cn("gap-0 rounded-2xl p-8 transition-all duration-300", parchmentCard)}
          >
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#c9954f] to-[#9a4f00] text-primary-foreground shadow-md">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className={cn("mb-3 text-xl font-semibold", parchmentHeading)}>{feature.title}</h3>
            <p className="mb-4 text-base leading-6">{feature.description}</p>
            <Badge className="h-auto gap-2 bg-[#f2dbb4] px-3 py-1 text-sm text-[#744000]">
              <CheckCircleIcon className={cn("size-4!", parchmentAccent)} />
              {feature.benefit}
            </Badge>
          </MotionCard>
        ))}
      </motion.div>
    </section>
  );
}

export function HomeSteps() {
  return (
    <section className="space-y-8">
      <SectionHeading
        title="簡単3ステップで始める"
        description="面倒な設定は一切不要。今すぐ就活効率化を体験してください"
      />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-3"
      >
        {steps.map((step, index) => (
          <MotionCard
            key={step.step}
            variants={fadeInUp}
            className={cn("relative items-center gap-2 overflow-visible rounded-2xl p-6 text-center", parchmentCard)}
          >
            <div
              className={cn(
                "mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold",
                parchmentIconBox,
              )}
            >
              {step.step}
            </div>
            <h3 className={cn("text-lg font-semibold", parchmentHeading)}>{step.title}</h3>
            <p className="text-sm">{step.description}</p>
            {index < steps.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden md:block">
                <ArrowRightIcon className={cn("h-6 w-6", parchmentAccent)} />
              </div>
            )}
          </MotionCard>
        ))}
      </motion.div>
    </section>
  );
}
