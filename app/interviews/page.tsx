import type { Metadata } from "next";
import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { InterviewList } from "./_components/interview-list";
import { InterviewListGuide } from "./_components/interview-list-guide";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "面接ログ",
};

export default function InterviewsListPage() {
  return (
    <AppLayout
      avatar={<InterviewListGuide />}
      headerActions={
        <Button asChild>
          <Link href={ROUTES.INTERVIEWS_NEW}>面接ログを追加する</Link>
        </Button>
      }
      headerTitle="面接ログ"
      headerDescription="面接で聞かれたこと・答えたことと振り返りを見返し、開くと更新できます"
      className="space-y-6"
    >
      <InterviewList />
    </AppLayout>
  );
}
