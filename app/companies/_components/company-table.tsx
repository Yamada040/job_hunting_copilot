"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, StarIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanies, type CompanyStage } from "@/lib/api/companies";
import { COMPANY_STAGES, COMPANY_STAGE_LABELS } from "@/lib/companies/stages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { EmptyState } from "@/app/_components/empty-state";

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
  if (companies?.length === 0) {
    return (
      <EmptyState
        title="まだ企業がありません"
        description="気になる企業を登録すると、選考状況やES・面接ログをまとめて管理できます。"
      >
        <Button asChild variant="default">
          <Link href={ROUTES.COMPANIES_NEW}>企業を登録する</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="企業名・業界・メモで検索"
            className="bg-card pl-8"
          />
        </div>
        <NativeSelect
          value={stage}
          onChange={(e) => setStage(e.target.value as CompanyStage | "")}
          className="bg-card"
          aria-label="選考状況で絞り込む"
        >
          <NativeSelectOption value="">すべての選考状況</NativeSelectOption>
          {COMPANY_STAGES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {COMPANY_STAGE_LABELS[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favoriteOnly}
            onChange={(e) => setFavoriteOnly(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          お気に入りのみ
        </label>
      </div>

      <Card className="py-0">
        <Table className="table-fixed">
          <TableHeader className="bg-secondary/60">
            <TableRow>
              <Th className="w-[34%]">企業名</Th>
              <Th className="w-[22%]">業界</Th>
              <Th className="w-[16%]">選考状況</Th>
              <Th className="w-[10%]">志望度</Th>
              <Th className="w-[18%]">マイページ</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                  {isPending ? "読み込み中…" : "該当する企業がありません。絞り込みやキーワードを変えてみてください。"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <Td>
                    <Link
                      href={ROUTES.COMPANY_DETAIL(c.id)}
                      className="flex items-center gap-1 truncate font-semibold text-primary hover:underline"
                      title={c.name}
                    >
                      {c.favorite && (
                        <StarIcon className="h-4 w-4 shrink-0 fill-ring text-primary" aria-label="お気に入り" />
                      )}
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
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        開く
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </Td>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <TableHead className={cn("px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase", className)}>
    {children}
  </TableHead>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <TableCell className="truncate px-4 py-3 align-top">{children}</TableCell>
);
