import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { NewWebtestForm } from "../_components/new-webtest-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "Webテストの問題を追加",
};

export default function WebtestNewPage() {
  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.webtestNew} />}
      headerTitle="Webテスト問題を追加"
      headerDescription="オリジナル問題を登録し、演習に使います"
    >
      <NewWebtestForm />
    </AppLayout>
  );
}
