"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { TiltCard, TiltLayer } from "../tilt-card";
import { scrollToSection } from "./sections";
import { homeAccent, homeCardMuted } from "./theme";

const acquisitionPoints = [
  "Googleアカウントでログインするだけ。初期設定は不要",
  "就活タスクを1画面で整理できる",
  "ESの締切と面接の予定をカレンダーで確認できる",
];

const attractionBadges = [
  { icon: RocketLaunchIcon, label: "準備の迷いを削減" },
  { icon: TrophyIcon, label: "継続しやすい設計" },
  { icon: BoltIcon, label: "毎日の行動が明確" },
];

const tagClass = "h-auto gap-2 border-border px-3 py-1 font-semibold tracking-[0.25em] text-primary";

export function HomeHero() {
  return (
    <Card className="relative gap-0 rounded-2xl p-10 shadow-[0_20px_60px_color-mix(in_oklab,var(--color-ring)_12%,transparent)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent via-ring to-transparent opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-linear-to-br from-accent/80 to-secondary/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-[-110px] h-56 w-56 rounded-full bg-linear-to-br from-accent/70 to-secondary/30 blur-3xl" />
      <div className="relative grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn(tagClass, "bg-accent")}>
              BETA
            </Badge>
            <Badge variant="outline" className={cn(tagClass, "bg-card")}>
              AI活用
              <SparklesIcon className="text-primary" />
            </Badge>
            <Badge variant="outline" className={cn(tagClass, "bg-accent")}>
              無料で始められる
              <CheckCircleIcon className="text-primary" />
            </Badge>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl leading-tight font-black tracking-tight sm:text-5xl"
          >
            {/* 日本語は文字の間のどこででも折り返すので、意味のまとまりごとに inline-block で区切り、途中で切れないようにする */}
            <span className="inline-block">情報過多な就活を</span>
            <span className="inline-block">
              <span className="bg-linear-to-r from-ring to-primary bg-clip-text text-transparent">整理</span>して
            </span>
            <span className="block text-muted-foreground">
              <span className="inline-block">やるべき行動を</span>
              <span className="inline-block">明確にする</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-2xl text-lg leading-7 text-muted-foreground"
          >
            ES・企業・面接の情報がばらばらだと、何から手を付けるか迷う時間が増えます。
            <br />
            就活copilotは、それらを1つにまとめ、次にやることをすぐ選べるようにします。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap gap-4"
          >
            <Button asChild variant="default">
              <Link href={ROUTES.LOGIN}>
                ログイン
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("features");
                }}
              >
                機能を見る
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
            className="flex flex-wrap gap-2"
          >
            {attractionBadges.map((badge) => (
              <Badge
                key={badge.label}
                variant="outline"
                className="h-auto gap-1.5 border-border bg-white/80 px-3 py-1 font-semibold text-muted-foreground shadow-sm"
              >
                <badge.icon />
                {badge.label}
              </Badge>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <TiltCard className={cn("gap-5 rounded-3xl p-6", homeCardMuted)}>
            <TiltLayer depth={30}>
              <p className="text-[0.65rem] font-bold tracking-[0.25em] text-muted-foreground">WHY NOW</p>
              <p className="text-lg font-bold text-foreground">今すぐ始める理由</p>
            </TiltLayer>
            <ul className="space-y-3">
              {acquisitionPoints.map((point, index) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircleIcon className={cn("mt-0.5 h-4 w-4 shrink-0", homeAccent)} />
                  {point}
                </motion.li>
              ))}
            </ul>
            <TiltLayer depth={40} className="self-start">
              <Button asChild variant="default">
                <Link href={ROUTES.LOGIN}>
                  ログインして始める
                  <ArrowRightIcon />
                </Link>
              </Button>
            </TiltLayer>
          </TiltCard>
        </motion.div>
      </div>
    </Card>
  );
}
