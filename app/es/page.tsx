import Link from "next/link";
import { PlusIcon, ArrowUturnLeftIcon, HomeIcon } from "@heroicons/react/24/outline";
import { ROUTES } from "@/lib/constants/routes";
import { AppLayout } from "@/app/_components/layout";
import { EsListClient } from "./_components/es-list-client";

export default function EsListPage() {
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Link href={ROUTES.HOME} className="sidebar-link-style text-sm">
        <HomeIcon className="h-4 w-4" />
        MVPホーム
      </Link>
      <Link href={ROUTES.DASHBOARD} className="sidebar-link-style text-sm">
        <ArrowUturnLeftIcon className="h-4 w-4" />
        ダッシュボードへ
      </Link>
      <Link href={ROUTES.ES_NEW} className="sidebar-link-style text-sm">
        <PlusIcon className="h-4 w-4" />
        新規作成
      </Link>
    </div>
  );

  return (
    <AppLayout
      headerTitle="ES管理"
      headerDescription="下書きと提出済みを分けて管理できます"
      headerActions={headerActions}
      className="space-y-4"
    >
      <div className="rounded-xl border border-[#3f3f46] bg-[#111111] p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-yellow-200">ES一覧</p>
          <p className="text-sm text-white/70">下書きと提出済みをタブレス表示。</p>
        </div>
        <div className="mt-4 rounded-lg border border-[#3f3f46] bg-[#1a1a1a] p-4">
          <EsListClient />
        </div>
      </div>
    </AppLayout>
  );
}
