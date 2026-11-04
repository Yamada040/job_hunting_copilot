"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCompanyCalendarItems } from "@/lib/api/calendar";
import type { CompanySummary } from "@/lib/api/companies";
import { useEsEntries } from "@/lib/api/es";
import { useInterviewLogs } from "@/lib/api/interviews";
import { ROUTES } from "@/lib/constants/routes";
import { INTERVIEW_FORMAT_LABELS } from "@/lib/interviews/labels";
import { QuickEventDialog } from "@/app/_components/quick-add/quick-event-dialog";
import { TYPE_LABEL } from "@/app/calendar/_components/calendar/constants";
import { RelatedCard } from "./related-card";

const joinDetail = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" ・ ");

/** 企業の詳細に出す、その企業のES・面接ログ・予定。作成のボタンは、この企業を選んだ状態で開く。 */
export function CompanyRelated({ company }: { company: CompanySummary }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <CompanyEsCard company={company} />
      <CompanyInterviewsCard company={company} />
      <CompanyEventsCard company={company} />
    </div>
  );
}

function CompanyEsCard({ company }: { company: CompanySummary }) {
  const { data, error } = useEsEntries({ companyId: company.id });
  return (
    <RelatedCard
      title="ES"
      emptyTitle="この企業のESはまだありません"
      error={error}
      rows={data?.map((entry) => ({
        id: entry.id,
        href: ROUTES.ES_DETAIL(entry.id),
        title: entry.title,
        detail: joinDetail(
          entry.status === "submitted" ? "提出済み" : "下書き",
          entry.deadline && `締切 ${entry.deadline}`,
        ),
      }))}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.ES_NEW_FOR_COMPANY(company.id)}>ESを作成する</Link>
        </Button>
      }
    />
  );
}

function CompanyInterviewsCard({ company }: { company: CompanySummary }) {
  const { data, error } = useInterviewLogs({ companyId: company.id });
  return (
    <RelatedCard
      title="面接ログ"
      emptyTitle="この企業の面接ログはまだありません"
      error={error}
      rows={data?.map((log) => ({
        id: log.id,
        href: ROUTES.INTERVIEW_DETAIL(log.id),
        title: log.round || "面接",
        detail: joinDetail(
          log.interviewDate,
          log.format && INTERVIEW_FORMAT_LABELS[log.format],
          log.reviewed ? "振り返り済み" : "振り返りまだ",
        ),
      }))}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.INTERVIEWS_NEW_FOR_COMPANY(company.id)}>面接ログを追加する</Link>
        </Button>
      }
    />
  );
}

function CompanyEventsCard({ company }: { company: CompanySummary }) {
  const { data, error } = useCompanyCalendarItems(company.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <RelatedCard
        title="予定"
        emptyTitle="この企業の予定はまだありません"
        error={error}
        // ESの締切はESの欄に出ているので、二重に並べないよう登録した予定だけにする
        rows={data
          ?.filter((item) => item.source === "event")
          .map((item) => ({
            id: item.id,
            href: ROUTES.CALENDAR,
            title: item.title,
            detail: joinDetail(
              item.endDate ? `${item.date}〜${item.endDate}` : item.date,
              item.time,
              TYPE_LABEL[item.type],
            ),
          }))}
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            予定を追加する
          </Button>
        }
      />
      <QuickEventDialog open={dialogOpen} onOpenChange={setDialogOpen} company={company} />
    </>
  );
}
