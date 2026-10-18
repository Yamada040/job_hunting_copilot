import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { EditWebtestForm } from "../../_components/edit-webtest-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "Webテストの問題を編集",
};

export default async function WebtestEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.webtestEdit} />}
      headerTitle="Webテストの問題を編集"
      headerDescription="問題文・正解・解説などを直します"
    >
      <EditWebtestForm id={id} />
    </AppLayout>
  );
}
