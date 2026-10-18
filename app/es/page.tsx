import type { Metadata } from "next";
import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { EsListClient } from "./_components/es-list-client";
import { EsListGuide } from "./_components/es-list-guide";

export const metadata: Metadata = {
  title: "ES管理",
};

export default function EsListPage() {
  return (
    <AppLayout
      headerTitle="ES管理"
      headerDescription="下書きと提出済みを分けて管理できます"
      headerActions={
        <Button asChild>
          <Link href={ROUTES.ES_NEW}>ESを作成する</Link>
        </Button>
      }
      avatar={<EsListGuide />}
    >
      <EsListClient />
    </AppLayout>
  );
}
