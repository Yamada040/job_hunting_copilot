import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { CompanyDetail } from "../_components/company-detail";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "企業の詳細",
};

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.companyDetail} />}
      headerTitle="企業の詳細"
      headerDescription="企業の情報と選考状況を更新し、この企業のES・面接ログ・予定を確かめます"
      className="flex flex-col gap-8"
    >
      <CompanyDetail id={id} />
    </AppLayout>
  );
}
