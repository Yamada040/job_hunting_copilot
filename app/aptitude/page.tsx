import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import AptitudeForm from "./_components/aptitude-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "適性チェック",
};

export default function AptitudePage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.aptitude} />}
      headerTitle="適性チェック"
      headerDescription="興味・強み・価値観を整理して、AI診断で適性の方向性を確認します"
      className="space-y-6"
    >
      <AptitudeForm />
    </AppLayout>
  );
}
