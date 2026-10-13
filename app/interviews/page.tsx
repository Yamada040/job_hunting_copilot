import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { InterviewList } from "./_components/interview-list";
import { InterviewListGuide } from "./_components/interview-list-guide";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function InterviewsListPage() {
  return (
    <AppLayout
      avatar={<InterviewListGuide />}
      headerActions={
        <Button asChild>
          <Link href={ROUTES.INTERVIEWS_NEW}>面接ログを追加する</Link>
        </Button>
      }
      headerTitle="面接ログ一覧"
      headerDescription="面接後の質問・回答ログと振り返りを一覧表示し、詳細ページで更新できます。"
      className="space-y-6"
    >
      <InterviewList />
    </AppLayout>
  );
}
