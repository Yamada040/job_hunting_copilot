import { AppLayout } from "@/app/_components/layout";
import { CompanyTable } from "./_components/company-table";

export default function CompaniesPage() {
  return (
    <AppLayout
      headerTitle="企業管理"
      headerDescription="業界・選考状況・志望度を一覧で把握し、編集ページへ遷移できます"
    >
      <CompanyTable />
    </AppLayout>
  );
}
