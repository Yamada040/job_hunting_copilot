"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, StarIcon } from "@heroicons/react/24/outline";

import { useCompanies, type CompanyStage } from "@/lib/api/companies";
import { COMPANY_STAGES, COMPANY_STAGE_LABELS } from "@/lib/companies/stages";
import { ROUTES } from "@/lib/constants/routes";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

export function CompanyTable() {
  const { data: companies, error, isPending } = useCompanies();
  const [stage, setStage] = useState<CompanyStage | "">("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (companies ?? []).filter(
      (c) =>
        (!stage || c.stage === stage) &&
        (!favoriteOnly || c.favorite) &&
        (!kw || [c.name, c.industry, c.memo].some((v) => (v ?? "").toLowerCase().includes(kw))),
    );
  }, [companies, stage, favoriteOnly, keyword]);

  if (error) return <ApiErrorMessage error={error} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="dq-panel flex items-center gap-2 px-3 py-2 text-sm text-white">
          <MagnifyingGlassIcon className="h-4 w-4 text-white/60" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="企業名・業界・メモで検索"
            className="bg-transparent text-sm outline-none placeholder:text-white/50"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as CompanyStage | "")}
          className="dq-panel px-3 py-2 text-sm text-white"
          aria-label="選考状況で絞り込む"
        >
          <option value="">すべての選考状況</option>
          {COMPANY_STAGES.map((s) => (
            <option key={s} value={s}>
              {COMPANY_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="dq-panel flex items-center gap-2 px-3 py-2 text-sm text-white">
          <input
            type="checkbox"
            checked={favoriteOnly}
            onChange={(e) => setFavoriteOnly(e.target.checked)}
            className="h-4 w-4 accent-amber-300"
          />
          お気に入りのみ
        </label>
      </div>

      <div className="dq-card overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-white/10 text-sm text-white">
          <thead className="bg-black/60">
            <tr>
              <Th className="w-[34%]">企業名</Th>
              <Th className="w-[22%]">業界</Th>
              <Th className="w-[16%]">選考状況</Th>
              <Th className="w-[10%]">志望度</Th>
              <Th className="w-[18%]">マイページ</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-white/60">
                  {isPending ? "読み込み中…" : "該当する企業がありません。"}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <Td>
                    <Link
                      href={ROUTES.COMPANY_DETAIL(c.id)}
                      className="flex items-center gap-1 truncate font-semibold text-yellow-200 hover:underline"
                      title={c.name}
                    >
                      {c.favorite && <StarIcon className="h-4 w-4 shrink-0 fill-yellow-300" aria-label="お気に入り" />}
                      <span className="truncate">{c.name}</span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="block truncate">{c.industry ?? "-"}</span>
                  </Td>
                  <Td>{COMPANY_STAGE_LABELS[c.stage]}</Td>
                  <Td>{c.preference ?? "-"}</Td>
                  <Td>
                    {c.mypageUrl ? (
                      <a
                        href={c.mypageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-300 hover:underline"
                      >
                        開く
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/70 ${className}`}>
    {children}
  </th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="truncate px-4 py-3 align-top text-white/90">{children}</td>
);
