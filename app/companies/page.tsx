import Link from "next/link";
import { PlusIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { AppLayout } from "@/app/_components/layout";
import { ROUTES } from "@/lib/constants/routes";
import { CompanyTable } from "./_components/company-table";

export default function CompaniesPage() {
  return (
    <AppLayout
      headerTitle="企業管理"
      headerDescription="業界・選考状況・志望度を一覧で把握し、編集ページへ遷移できます"
      headerActions={
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.HOME} className="dq-button-secondary">
            <HomeIcon className="h-4 w-4" />
            MVPホーム
          </Link>
          <Link href={ROUTES.DASHBOARD} className="dq-button-secondary">
            <ArrowUturnLeftIcon className="h-4 w-4" />
            ダッシュボードへ
          </Link>
          <Link href={ROUTES.COMPANIES_NEW} className="dq-button">
            <PlusIcon className="h-4 w-4" />
            企業を追加
          </Link>
        </div>
      }
    >
      <CompanyTable />
    </AppLayout>
  );
}
