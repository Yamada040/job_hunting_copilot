import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { WebtestList } from "./_components/webtest-list";
import { WebtestListGuide } from "./_components/webtest-list-guide";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function WebtestsPage() {
  return (
    <AppLayout
      avatar={<WebtestListGuide />}
      headerActions={
        <Button asChild>
          <Link href={ROUTES.WEBTESTS_NEW}>問題を追加する</Link>
        </Button>
      }
      headerTitle="Webテスト対策（問題バンク）"
      headerDescription="オリジナル問題を登録・一覧表示して演習に備えます"
      className="space-y-6"
    >
      <WebtestList />
    </AppLayout>
  );
}
