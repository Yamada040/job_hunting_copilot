import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { CompanyDetail } from "../_components/company-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "企業の編集",
};

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.companyDetail} />}
      headerTitle="企業カード編集"
      headerDescription="企業情報と選考状況を更新"
      className="flex flex-col gap-8"
    >
      <CompanyDetail id={id} />
    </AppLayout>
  );
}
