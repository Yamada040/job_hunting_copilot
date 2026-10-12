import { AppLayout } from "@/app/_components/layout";
import { NewWebtestForm } from "../_components/new-webtest-form";

export default function WebtestNewPage() {
  return (
    <AppLayout headerTitle="Webテスト問題を追加" headerDescription="オリジナル問題を登録し、演習に使います">
      <NewWebtestForm />
    </AppLayout>
  );
}
