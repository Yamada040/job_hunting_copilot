import type { Metadata } from "next";
import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { WebtestList } from "./_components/webtest-list";
import { WebtestListGuide } from "./_components/webtest-list-guide";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Webテスト",
};

export default function WebtestsPage() {
  return (
    <AppLayout
      avatar={<WebtestListGuide />}
      headerActions={
        <Button asChild>
          <Link href={ROUTES.WEBTESTS_NEW}>問題を追加する</Link>
        </Button>
      }
      headerTitle="Webテスト対策"
      headerDescription="自分で作った問題を解いて、本番に備えます"
      className="space-y-6"
    >
      <WebtestList />
    </AppLayout>
  );
}
