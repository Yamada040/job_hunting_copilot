import { AppLayout } from "@/app/_components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EsListClient } from "./_components/es-list-client";

export default function EsListPage() {
  return (
    <AppLayout headerTitle="ES管理" headerDescription="下書きと提出済みを分けて管理できます" className="space-y-4">
      <Card className="py-6">
        <CardHeader className="px-6">
          <CardTitle>
            <h2 className="text-sm font-semibold text-primary">ES一覧</h2>
          </CardTitle>
          <CardDescription>下書きと提出済みをタブレス表示。</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Card variant="muted" className="px-4">
            <EsListClient />
          </Card>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
