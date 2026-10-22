import type { Metadata } from "next";
import { AppLayout } from "@/app/_components/layout";
import { NewEsForm } from "../_components/new-es-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = {
  title: "ESを作成",
};

export default async function NewEsPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string | string[] }>;
}) {
  const { companyId } = await searchParams;

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.esNew} />}
      headerTitle="ESを作成"
      headerDescription="企業を選び、設問と回答を書いて保存します"
      className="flex flex-col gap-8"
    >
      <NewEsForm companyId={typeof companyId === "string" ? companyId : undefined} />
    </AppLayout>
  );
}
