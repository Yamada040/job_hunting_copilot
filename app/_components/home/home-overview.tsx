"use client";

import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon, LifebuoyIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { TiltCard, TiltLayer } from "../tilt-card";
import { fadeInUp, homeCard, homeHeading, staggerChildren } from "./theme";
import { SectionHeading } from "./section-heading";
import { CardNumber, FloatingIcon } from "./card-parts";

const summaries = [
  { label: "FOR", title: "対象", description: "ES・企業・面接の情報を、ばらばらにせず1か所で管理したい就活生" },
  {
    label: "TOOLS",
    title: "まとめられるもの",
    description: "ES・企業・面接ログ・予定・自己分析・適性チェック・Webテストの練習",
  },
  { label: "PRICE", title: "料金", description: "無料。Googleアカウントでログインするだけで使えます" },
];

const contexts = [
  {
    icon: ExclamationTriangleIcon,
    label: "NOW",
    title: "就活の現状",
    description: "締切・面接・企業研究が同時に進み、何から手を付けるか迷いやすくなります。",
  },
  {
    icon: ClipboardDocumentCheckIcon,
    label: "NEXT",
    title: "やるべきこと",
    description: "志望度の高い企業から優先し、ESを磨き、面接を振り返って次に活かすことです。",
  },
  {
    icon: LifebuoyIcon,
    label: "SUPPORT",
    title: "ここでできること",
    description: "ES・企業・面接ログ・予定を1つにまとめ、締切が近いものなど急ぎのものから分かるようにします。",
  },
];

export function HomeSummaries() {
  return (
    <section className="space-y-8 depth:space-y-6">
      <SectionHeading
        title="就活を、ひとつの画面に。"
        description="就活copilotは、就活で扱う情報と作業を1つのアプリにまとめます。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {summaries.map((item, index) => (
          <TiltCard key={item.title} className={cn("gap-3 rounded-3xl p-6", homeCard)}>
            <CardNumber number={index + 1} label={item.label} />
            <TiltLayer depth={20} className="space-y-1">
              <h3 className={cn("font-bold", homeHeading)}>{item.title}</h3>
              <p className="text-sm leading-6">{item.description}</p>
            </TiltLayer>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

export function HomeContexts() {
  return (
    <section className="space-y-8 depth:space-y-6">
      <SectionHeading title="迷う時間を、なくす。" />
      <motion.div
        variants={staggerChildren}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-3"
      >
        {contexts.map((item, index) => (
          <motion.div key={item.title} variants={fadeInUp}>
            <TiltCard className={cn("h-full gap-5 rounded-3xl p-7", homeCard)}>
              <CardNumber number={index + 1} label={item.label} />
              <FloatingIcon icon={item.icon} />
              <TiltLayer depth={20} className="space-y-2">
                <h3 className={cn("text-lg font-bold", homeHeading)}>{item.title}</h3>
                <p className="text-sm leading-6">{item.description}</p>
              </TiltLayer>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
