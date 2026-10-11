"use client";

import Link from "next/link";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { fadeInUp, homeCard, homeCardMuted, homeHeading } from "./theme";

const securityPoints = [
  { title: "暗号化通信", description: "全ての通信はSSLで保護" },
  { title: "データ保護", description: "個人情報は厳格に管理" },
  { title: "セキュア認証", description: "Google認証で安全ログイン" },
];

const MotionCard = motion.create(Card);

export function HomeCallToAction() {
  return (
    <MotionCard {...fadeInUp} className={cn("rounded-2xl p-10 text-center", homeCard)}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className={cn("text-3xl font-bold", homeHeading)}>今すぐ就活を効率化しませんか？</h2>
        <p className="text-lg">無料で始められます。面倒な設定は不要で、登録後すぐに利用可能です。</p>
        <div className="flex flex-wrap justify-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button asChild variant="quest">
              <Link href={ROUTES.LOGIN}>ログイン</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </MotionCard>
  );
}

export function HomeSecurity() {
  return (
    <MotionCard {...fadeInUp} className={cn("gap-4 rounded-2xl p-8", homeCardMuted)}>
      <div className="flex items-center justify-center gap-3 text-slate-600">
        <ShieldCheckIcon className="h-6 w-6" />
        <p className="font-semibold">安全・安心なデータ管理</p>
      </div>
      <div className="grid gap-3 text-center text-sm md:grid-cols-3">
        {securityPoints.map((point) => (
          <div key={point.title}>
            <strong className={homeHeading}>{point.title}</strong>
            <br />
            {point.description}
          </div>
        ))}
      </div>
    </MotionCard>
  );
}
