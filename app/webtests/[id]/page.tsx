import { AppLayout } from "@/app/_components/layout";
import { WebtestDetail } from "../_components/webtest-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default async function WebtestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.webtestDetail} />}
      headerTitle="Webテストの問題"
      headerDescription="問題を解いて結果を記録します"
      className="space-y-6"
    >
      <WebtestDetail id={id} />
    </AppLayout>
  );
}
