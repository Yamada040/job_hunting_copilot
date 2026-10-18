import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { NewCompanyForm } from "../_components/new-company-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "企業を追加",
};

export default function NewCompanyPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.companyNew} />}
      headerTitle="企業を追加"
      headerDescription="企業情報と選考状況を登録します"
      className="flex flex-col gap-8"
    >
      <NewCompanyForm />
    </AppLayout>
  );
}
