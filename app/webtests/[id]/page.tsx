import { AppLayout } from "@/app/_components/layout";
import { WebtestDetail } from "../_components/webtest-detail";

export default async function WebtestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout headerTitle="Webテストの問題" headerDescription="問題を解いて結果を記録します" className="space-y-6">
      <WebtestDetail id={id} />
    </AppLayout>
  );
}
