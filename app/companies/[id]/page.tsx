import { AppLayout } from "@/app/_components/layout";
import { CompanyDetail } from "../_components/company-detail";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      headerTitle="企業カード編集"
      headerDescription="企業情報と選考状況を更新"
      className="flex flex-col gap-8"
    >
      <CompanyDetail id={id} />
    </AppLayout>
  );
}
