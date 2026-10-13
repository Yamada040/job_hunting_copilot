"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowTopRightOnSquareIcon, StarIcon } from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCompanies, type Company, type CompanyStage } from "@/lib/api/companies";
import { COMPANY_STAGES, COMPANY_STAGE_LABELS } from "@/lib/companies/stages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/app/_components/empty-state";
import { CardListSkeleton } from "@/app/_components/loading-skeletons";
import { ListCardLink, NoMatches, StaggerItem, StaggerList } from "@/app/_components/list/list-items";
import { Chip, FilterChips, ListToolbar } from "@/app/_components/list/list-toolbar";
import { useMediaQuery } from "@/app/_components/list/use-media-query";
import { LoadError } from "@/app/_components/load-error";

/** 企業の一覧。広い画面では選考状況や志望度を縦に見比べられる表、狭い画面ではカードで出す。 */
export function CompanyList() {
  const { data: companies, error, isPending } = useCompanies();
  const [stage, setStage] = useState<CompanyStage | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [keyword, setKeyword] = useState("");
  const wide = useMediaQuery("(min-width: 768px)");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return (companies ?? []).filter(
      (c) =>
        (stage === "all" || c.stage === stage) &&
        (!favoriteOnly || c.favorite) &&
        (!kw || [c.name, c.industry, c.memo].some((v) => (v ?? "").toLowerCase().includes(kw))),
    );
  }, [companies, stage, favoriteOnly, keyword]);

  if (error) return <LoadError error={error} />;
  if (isPending) return <CardListSkeleton />;
  if (companies.length === 0) {
    return (
      <EmptyState
        title="まだ企業がありません"
        description="気になる企業を登録すると、選考状況やES・面接ログをまとめて管理できます。"
      />
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar search={keyword} onSearchChange={setKeyword} searchPlaceholder="企業名・業界・メモで検索">
        <FilterChips
          label="選考状況で絞り込む"
          value={stage}
          onChange={setStage}
          options={[
            { value: "all", label: "すべて" },
            ...COMPANY_STAGES.map((s) => ({ value: s, label: COMPANY_STAGE_LABELS[s] })),
          ]}
        />
        <Chip pressed={favoriteOnly} onClick={() => setFavoriteOnly((v) => !v)}>
          <StarIcon className={cn("h-3.5 w-3.5", favoriteOnly && "fill-current")} aria-hidden />
          お気に入りのみ
        </Chip>
      </ListToolbar>

      {filtered.length === 0 ? (
        <NoMatches>該当する企業がありません。絞り込みやキーワードを変えてみてください。</NoMatches>
      ) : wide ? (
        <CompanyTable companies={filtered} />
      ) : (
        <StaggerList>
          {filtered.map((c, index) => (
            <StaggerItem key={c.id} index={index}>
              <ListCardLink href={ROUTES.COMPANY_DETAIL(c.id)}>
                <div className="flex items-center gap-1.5">
                  {c.favorite && (
                    <StarIcon className="h-4 w-4 shrink-0 fill-ring text-primary" aria-label="お気に入り" />
                  )}
                  <p className="truncate font-bold">{c.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{COMPANY_STAGE_LABELS[c.stage]}</Badge>
                  {c.industry && <span>{c.industry}</span>}
                  {c.preference && <span>志望度 {c.preference}</span>}
                </div>
              </ListCardLink>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}

function CompanyTable({ companies }: { companies: Company[] }) {
  return (
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
          {companies.map((c) => (
            <TableRow key={c.id} className="transition-colors hover:bg-secondary/60">
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
              <Td>
                <Badge variant="outline">{COMPANY_STAGE_LABELS[c.stage]}</Badge>
              </Td>
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
          ))}
        </TableBody>
      </Table>
    </Card>
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
