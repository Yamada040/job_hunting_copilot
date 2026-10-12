import { AppLayout } from "@/app/_components/layout";
import { WebtestList } from "./_components/webtest-list";

export default function WebtestsPage() {
  return (
    <AppLayout
      headerTitle="Webテスト対策（問題バンク）"
      headerDescription="オリジナル問題を登録・一覧表示して演習に備えます"
      className="space-y-6"
    >
      <WebtestList />
    </AppLayout>
  );
}
