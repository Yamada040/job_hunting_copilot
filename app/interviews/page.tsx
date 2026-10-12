import { AppLayout } from "@/app/_components/layout";
import { InterviewList } from "./_components/interview-list";

export default function InterviewsListPage() {
  return (
    <AppLayout
      headerTitle="面接ログ一覧"
      headerDescription="面接後の質問・回答ログと振り返りを一覧表示し、詳細ページで更新できます。"
      className="space-y-6"
    >
      <InterviewList />
    </AppLayout>
  );
}
