"use client";

import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, LifebuoyIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fadeInUp,
  parchmentAccent,
  parchmentCard,
  parchmentCardDeep,
  parchmentHeading,
  parchmentIconBox,
  staggerChildren,
} from "./parchment";
import { SectionHeading } from "./section-heading";

const summaries = [
  { title: "対象", description: "自己分析から面接振り返りまで一気通貫で管理" },
  { title: "価値", description: "就活タスクを分解し、今日やることを迷わず選べる" },
  { title: "使い方", description: "まず自己分析と適性チェック、その後に企業とESを整備" },
];

const quickGuide = [
  "このMVPは、就活の情報整理を助けるためのツールです。",
  "ログイン後は、自己分析・適性チェックで軸を整理してから、企業管理・ES管理・面接ログに進むと使いやすくなります。",
  "迷ったらダッシュボードの次アクションを確認し、今日やることを1つずつ進めればOKです。",
];

const contexts = [
  {
    icon: ExclamationTriangleIcon,
    title: "就活の現状",
    description: "締切・面接・企業研究が同時に進み、何から手を付けるべきか見失いやすい状態になりがちです。",
  },
  {
    icon: ClipboardDocumentCheckIcon,
    title: "今やるべきこと",
    description: "応募先の優先順位付け、ESの改善、面接ログの振り返りを継続して、選考ごとの勝率を上げる必要があります。",
  },
  {
    icon: LifebuoyIcon,
    title: "ここでのサポート",
    description: "ES添削・企業/進捗管理・面接ログ整理を1つに集約し、次にやるべき行動を迷わないように支援します。",
  },
];

const MotionCard = motion.create(Card);

export function HomeSummaries() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {summaries.map((item) => (
        <Card key={item.title} className={cn("gap-2 px-4", parchmentCard)}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#744000]">{item.title}</p>
          <p className="text-sm">{item.description}</p>
        </Card>
      ))}
    </section>
  );
}

export function HomeQuickGuide() {
  return (
    <Card className={cn("rounded-2xl py-6", parchmentCardDeep)}>
      <CardHeader className="px-6">
        <CardTitle>
          <h2 className={cn("text-lg font-bold", parchmentHeading)}>はじめての方へ</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <ul className="space-y-2 text-sm leading-6">
          {quickGuide.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className={cn("pt-1 text-[0.7rem]", parchmentAccent)}>▶</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function HomeContexts() {
  return (
    <section className="space-y-6">
      <SectionHeading eyebrow="MVP Overview" title="就活の現状と、ここで支援すること" />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-4 md:grid-cols-3"
      >
        {contexts.map((item) => (
          <MotionCard
            key={item.title}
            variants={fadeInUp}
            className={cn(
              "gap-2 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(116,64,0,0.18)]",
              parchmentCard,
            )}
          >
            <div className={cn("mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl", parchmentIconBox)}>
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className={cn("text-lg font-semibold", parchmentHeading)}>{item.title}</h3>
            <p className="text-sm leading-6">{item.description}</p>
          </MotionCard>
        ))}
      </motion.div>
    </section>
  );
}
