import { AppLayout } from "@/app/_components/layout";
import { NewEsForm } from "../_components/new-es-form";

export default function NewEsPage() {
  return (
    <AppLayout
      headerTitle="ESを作成"
      headerDescription="企業を選び、設問と回答を書いて保存します"
      className="flex flex-col gap-8"
    >
      <NewEsForm />
    </AppLayout>
  );
}
