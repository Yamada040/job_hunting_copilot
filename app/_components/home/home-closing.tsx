"use client";

import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { TiltCard, TiltLayer } from "../tilt-card";
import { homeCardMuted, homeHeading } from "./theme";

const securityPoints = [
  { title: "通信の暗号化", description: "通信はすべてHTTPSで暗号化しています" },
  { title: "本人だけが見られる", description: "登録した内容は、本人以外は見られません" },
  { title: "Googleでログイン", description: "新しいパスワードを作る必要はありません" },
];

export function HomeCallToAction() {
  return (
    <TiltCard maxTilt={4} className="items-center gap-6 rounded-3xl bg-foreground p-10 text-center text-background">
      <TiltLayer depth={40}>
        <h2 className="text-3xl leading-tight font-black tracking-tight sm:text-5xl">今日から、迷わない。</h2>
      </TiltLayer>
      <TiltLayer depth={25}>
        <p className="text-base opacity-80">
          無料で使えます。Googleアカウントでログインするだけで、すぐに始められます。
        </p>
      </TiltLayer>
      <TiltLayer depth={35}>
        <Button asChild variant="secondary" size="lg">
          <Link href={ROUTES.LOGIN}>
            ログインして始める
            <ArrowRightIcon />
          </Link>
        </Button>
      </TiltLayer>
    </TiltCard>
  );
}

export function HomeSecurity() {
  return (
    <Card className={cn("gap-4 rounded-3xl p-6", homeCardMuted)}>
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
    </Card>
  );
}
