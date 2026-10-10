import { AppLayout } from "@/app/_components/layout";
import { EsHeaderActions } from "../_components/es-header-actions";
import { NewEsForm } from "../_components/new-es-form";

export default function NewEsPage() {
  return (
    <AppLayout
      headerTitle="ESを作成"
      headerDescription="企業を選び、設問と回答を書いて保存します"
      headerActions={<EsHeaderActions />}
      className="flex flex-col gap-8"
    >
      <NewEsForm />
    </AppLayout>
  );
}
