"use client";

import Link from "next/link";
import { BuildingOffice2Icon, ClockIcon, PencilIcon, TrashIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { TYPE_COLOR, TYPE_LABEL } from "./constants";
import type { CalendarEvent } from "./types";
import { formatDayLabel } from "./utils";

/**
 * 予定の詳細。Googleカレンダーと同じく、右上に編集と削除を置き、色の四角とタイトル、日時、企業を並べる。
 * ESの締切はESから作られるので、ここでは変えずにESの画面へ案内する。
 */
export function EventDetail({
  event,
  deleting,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fromEs = event.id.startsWith("es-");
  return (
    <div className="space-y-4">
      {/* 閉じるボタン（ダイアログの右上）と重ならないよう、右に余白を取る */}
      <div className="flex justify-end gap-1 pr-8">
        {!fromEs && (
          <>
            <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="予定を編集">
              <PencilIcon />
            </Button>
            <ConfirmDialog
              title="予定を削除しますか？"
              description={`「${event.title}」を削除します。`}
              confirmLabel="削除する"
              destructive
              onConfirm={onDelete}
              trigger={
                <Button type="button" variant="ghost" size="icon" disabled={deleting} aria-label="予定を削除">
                  <TrashIcon />
                </Button>
              }
            />
          </>
        )}
      </div>

      <div className="flex items-start gap-3">
        <span className={cn("mt-2 h-3.5 w-3.5 shrink-0 rounded", TYPE_COLOR[event.type].dot)} aria-hidden />
        <div className="space-y-1">
          <DialogTitle className="text-2xl leading-snug font-semibold">{event.title}</DialogTitle>
          <p className="text-xs font-semibold text-muted-foreground">{TYPE_LABEL[event.type]}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-base">
        <ClockIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          {formatDayLabel(event.date)}
          {event.time ? ` ${event.time}` : "・終日"}
        </span>
      </div>
      {event.url && (
        <div className="flex items-center gap-3 text-sm">
          <VideoCameraIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-1">
            <Button asChild size="sm">
              <a href={event.url} target="_blank" rel="noopener noreferrer">
                リンクを開く
              </a>
            </Button>
            <p className="truncate text-xs text-muted-foreground">{event.url}</p>
          </div>
        </div>
      )}
      {event.company && (
        <div className="flex items-center gap-3 text-sm">
          <BuildingOffice2Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          {event.companyId ? (
            <Link href={ROUTES.COMPANY_DETAIL(event.companyId)} className="text-primary hover:underline">
              {event.company}
            </Link>
          ) : (
            <span>{event.company}</span>
          )}
        </div>
      )}

      {fromEs && (
        <div className="space-y-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
          <p>ESの締切は、ESの画面で変えられます。</p>
          <Button asChild size="sm">
            <Link href={ROUTES.ES_DETAIL(event.id.replace("es-", ""))}>ESを開く</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
