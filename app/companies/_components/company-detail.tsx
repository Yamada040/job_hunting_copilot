"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowTopRightOnSquareIcon, StarIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useCompany, useDeleteCompany, useUpdateCompany, type Company } from "@/lib/api/companies";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { CompanyForm } from "./company-form";

export function CompanyDetail({ id }: { id: string }) {
  const { data: company, error } = useCompany(id);

  if (error) return <ApiErrorMessage error={error} />;
  if (!company) return <p className="dq-card p-8 text-sm text-white">読み込み中…</p>;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <CompanyDetailLoaded key={company.updatedAt} company={company} />;
}

function CompanyDetailLoaded({ company }: { company: Company }) {
  const router = useRouter();
  const updateCompany = useUpdateCompany(company.id);
  const deleteCompany = useDeleteCompany(company.id);
  const [saved, setSaved] = useState(false);

  const handleDelete = () => {
    if (
      !window.confirm(
        `「${company.name}」を削除します。この企業のES・面接ログ・予定もすべて削除されます。よろしいですか？`,
      )
    ) {
      return;
    }
    deleteCompany.mutate(undefined, { onSuccess: () => router.push(ROUTES.COMPANIES) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => updateCompany.mutate({ favorite: !company.favorite })}
          className="dq-button-secondary"
          aria-pressed={company.favorite}
        >
          <StarIcon className={`h-4 w-4 ${company.favorite ? "fill-yellow-300" : ""}`} />
          {company.favorite ? "お気に入りから外す" : "お気に入りにする"}
        </button>
        {company.mypageUrl && (
          <a href={company.mypageUrl} target="_blank" rel="noopener noreferrer" className="dq-button-secondary">
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            マイページを開く
          </a>
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
      {saved && <p className="text-sm text-emerald-300">保存しました</p>}

      <div className="space-y-2">
        <button type="button" onClick={handleDelete} disabled={deleteCompany.isPending} className="dq-button-secondary">
          <TrashIcon className="h-4 w-4" />
          {deleteCompany.isPending ? "削除中…" : "この企業を削除する"}
        </button>
        <ApiErrorMessage error={deleteCompany.error} />
      </div>
    </div>
  );
}
