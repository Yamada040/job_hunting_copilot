import { AppLayout } from "@/app/_components/layout";
import { EsDetail } from "../_components/es-detail";
import { EsHeaderActions } from "../_components/es-header-actions";

export default async function EsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppLayout
      headerTitle="ESの編集"
      headerDescription="設問と回答を編集し、提出済みにできます"
      headerActions={<EsHeaderActions />}
      className="flex flex-col gap-8"
    >
      <EsDetail id={id} />
    </AppLayout>
  );
}
