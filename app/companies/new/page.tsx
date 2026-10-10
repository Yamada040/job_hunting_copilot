import { AppLayout } from "@/app/_components/layout";
import { CompanyHeaderActions } from "../_components/company-header-actions";
import { NewCompanyForm } from "../_components/new-company-form";

export default function NewCompanyPage() {
  return (
    <AppLayout
      headerTitle="企業を追加"
      headerDescription="企業情報と選考状況を登録します"
      headerActions={<CompanyHeaderActions />}
      className="flex flex-col gap-8"
    >
      <NewCompanyForm />
    </AppLayout>
  );
}
