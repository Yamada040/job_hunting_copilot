import Link from "next/link";

import { AppLayout } from "@/app/_components/layout";
import { CompanyList } from "./_components/company-list";
import { CompanyListGuide } from "./_components/company-list-guide";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function CompaniesPage() {
  return (
    <AppLayout
      avatar={<CompanyListGuide />}
      headerActions={
        <Button asChild>
          <Link href={ROUTES.COMPANIES_NEW}>企業を登録する</Link>
        </Button>
      }
      headerTitle="企業管理"
      headerDescription="業界・選考状況・志望度を一覧で把握し、編集ページへ遷移できます"
    >
      <CompanyList />
    </AppLayout>
  );
}
