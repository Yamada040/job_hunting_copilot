import { AppLayout } from "@/app/_components/layout";
import { EsDetail } from "../_components/es-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export default async function EsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.esDetail} />}
      headerTitle="ESの編集"
      headerDescription="設問と回答を編集し、提出済みにできます"
      className="flex flex-col gap-8"
    >
      <EsDetail id={id} />
    </AppLayout>
  );
}
