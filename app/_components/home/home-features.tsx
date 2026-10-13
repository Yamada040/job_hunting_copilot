"use client";

import { BuildingOffice2Icon, ChatBubbleLeftRightIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { TiltCard, TiltLayer } from "../tilt-card";
import { fadeInUp, homeCard, homeHeading, staggerChildren } from "./theme";
import { SectionHeading } from "./section-heading";
import { CardNumber, FloatingIcon } from "./card-parts";

const features = [
  {
    icon: PencilSquareIcon,
    label: "WRITE",
    title: "ESを書く・AIで添削する",
    description:
      "設問ごとに回答を書き、AIが3つの観点で点数とコメント、修正例を返します。添削の履歴が残るので、点数の伸びを確かめられます。",
    benefit: "企業分析の結果も踏まえて添削",
  },
  {
    icon: BuildingOffice2Icon,
    label: "MANAGE",
    title: "企業と予定を管理する",
    description:
      "選考状況・志望度・マイページを企業ごとに記録します。ESの締切と面接などの予定は、カレンダーにまとめて表示します。",
    benefit: "AIの企業分析（Web検索あり）",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    label: "REVIEW",
    title: "面接と自分を振り返る",
    description:
      "面接で聞かれたことや改善点を記録すると、AIが振り返りを返します。自己分析と適性チェックで、自分の軸も整理できます。",
    benefit: "次の面接に活かせる",
  },
];

const steps = [
  {
    label: "SIGN IN",
    title: "ログインする",
    description: "Googleアカウントでログインするだけで、すぐに使い始められます。",
  },
  {
    label: "REGISTER",
    title: "企業とESを登録する",
    description: "志望企業を登録し、ESを作ります。締切を入れておくと、カレンダーに表示されます。",
  },
  {
    label: "DAILY",
    title: "ホームから進める",
    description:
      "ホームを開くと、締切が近いESなど急ぎのものが分かります。ESの提出や面接ログの記録で、XPが貯まりレベルが上がります。",
  },
];

export function HomeFeatures() {
  return (
    <section className="space-y-8 depth:space-y-6">
      <SectionHeading
        title="書く。管理する。振り返る。"
        description="就活の作業を3つに分け、それぞれをAIが手伝います。"
      />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-3"
      >
        {features.map((feature, index) => (
          <motion.div key={feature.title} variants={fadeInUp}>
            <TiltCard className={cn("h-full gap-5 rounded-3xl p-7", homeCard)}>
              <CardNumber number={index + 1} label={feature.label} />
              <FloatingIcon icon={feature.icon} />
              <TiltLayer depth={20} className="space-y-2">
                <h3 className={cn("text-xl font-bold", homeHeading)}>{feature.title}</h3>
                <p className="text-sm leading-6">{feature.description}</p>
              </TiltLayer>
              <TiltLayer depth={10}>
                <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                  {feature.benefit}
                </span>
              </TiltLayer>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export function HomeSteps() {
  return (
    <section className="space-y-8 depth:space-y-6">
      <SectionHeading title="3ステップで、始められる。" />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-3"
      >
        {steps.map((step, index) => (
          <motion.div key={step.title} variants={fadeInUp}>
            <TiltCard className={cn("h-full gap-4 rounded-3xl p-7", homeCard)}>
              <CardNumber number={index + 1} label={step.label} />
              <TiltLayer depth={20} className="space-y-2">
                <h3 className={cn("text-xl font-bold", homeHeading)}>{step.title}</h3>
                <p className="text-sm leading-6">{step.description}</p>
              </TiltLayer>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
