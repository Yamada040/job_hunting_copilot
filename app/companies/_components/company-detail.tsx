"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowTopRightOnSquareIcon, StarIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useAnalyzeCompany, useCompany, useDeleteCompany, useUpdateCompany, type Company } from "@/lib/api/companies";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { AiResultPanel } from "@/app/_components/ai-result/ai-result-panel";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { CompanyForm } from "./company-form";
import { FormSkeleton } from "@/app/_components/loading-skeletons";

export function CompanyDetail({ id }: { id: string }) {
  const { data: company, error } = useCompany(id);
  // 保存すると下の key が変わって作り直され、中で持つ状態は消えるので、「保存しました」はここで持つ
  const [saved, setSaved] = useState(false);

  if (error) return <ApiErrorMessage error={error} />;
  if (!company) return <FormSkeleton />;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <CompanyDetailLoaded key={company.updatedAt} company={company} saved={saved} onSavedChange={setSaved} />;
}

function CompanyDetailLoaded({
  company,
  saved,
  onSavedChange: setSaved,
}: {
  company: Company;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const router = useRouter();
  const updateCompany = useUpdateCompany(company.id);
  const deleteCompany = useDeleteCompany(company.id);
  const analyzeCompany = useAnalyzeCompany(company.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => updateCompany.mutate({ favorite: !company.favorite })}
          aria-pressed={company.favorite}
        >
          <StarIcon className={cn("h-4 w-4", company.favorite && "fill-ring text-primary")} />
          {company.favorite ? "お気に入りから外す" : "お気に入りにする"}
        </Button>
        {company.mypageUrl && (
          <Button asChild variant="outline">
            <a href={company.mypageUrl} target="_blank" rel="noopener noreferrer">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              マイページを開く
            </a>
          </Button>
        )}
      </div>

      <CompanyForm
        initial={company}
        submitLabel="保存する"
        pending={updateCompany.isPending}
        error={updateCompany.error}
        onSubmit={(values) => {
          setSaved(false);
          updateCompany.mutate(values, { onSuccess: () => setSaved(true) });
        }}
      />
      {saved && <p className="text-sm text-success">保存しました</p>}

      <AiResultPanel
        title="AI企業分析"
        description="AIがWebで最新の採用情報などを検索し、企業の概要・強み・求める人物像をまとめます。企業ごとに1回だけ実行できます（数十秒かかります）。"
        result={company.aiResult}
        runLabel="AI企業分析を行う"
        onRun={() => analyzeCompany.mutate()}
        pending={analyzeCompany.isPending}
        error={analyzeCompany.error}
        done={company.aiResult !== null}
      />

      <div className="space-y-2">
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" disabled={deleteCompany.isPending}>
              <TrashIcon className="h-4 w-4" />
              {deleteCompany.isPending ? "削除中…" : "この企業を削除する"}
            </Button>
          }
          title="企業を削除しますか？"
          description={`「${company.name}」を削除します。この企業のES・面接ログ・予定もすべて削除されます。よろしいですか？`}
          confirmLabel="削除する"
          destructive
          onConfirm={() => deleteCompany.mutate(undefined, { onSuccess: () => router.push(ROUTES.COMPANIES) })}
        />
        <ApiErrorMessage error={deleteCompany.error} />
      </div>
    </div>
  );
}
