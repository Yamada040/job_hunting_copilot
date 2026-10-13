import Link from "next/link";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { TYPE_LABEL } from "./constants";
import { EventForm } from "./event-form";
import { ModalAction } from "./reducer";
import { CalendarEvent, CalendarFormState } from "./types";

const TYPE_TONE: Record<CalendarEvent["type"], string> = {
  es: "border-category-es/30 bg-category-es/10 text-foreground",
  interview: "border-category-interview/30 bg-category-interview/10 text-foreground",
  intern: "border-category-intern/30 bg-category-intern/10 text-foreground",
  other: "bg-secondary/60",
};

type Props = {
  open: boolean;
  selectedDate: string;
  events: CalendarEvent[];
  formState: CalendarFormState;
  editingId: string | null;
  deletingId: string | null;
  saving: boolean;
  dispatch: (action: ModalAction) => void;
  submitAction: (formData: FormData) => void;
  onDelete: (event: CalendarEvent) => void;
};

/** 選んだ日の予定の一覧と、予定の追加・編集のフォーム */
export function DayEventDialog({
  open,
  selectedDate,
  events,
  formState,
  editingId,
  deletingId,
  saving,
  dispatch,
  submitAction,
  onDelete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && dispatch({ type: "closeModal" })}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-semibold">選択した日の予定</DialogTitle>
          <DialogDescription className="text-xs">{selectedDate}</DialogDescription>
        </DialogHeader>

        <div>
          <Button type="button" variant="outline" className="text-xs" onClick={() => dispatch({ type: "resetForm" })}>
            <PlusIcon className="h-4 w-4" />
            新しい予定を追加
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border bg-secondary/60 p-3 text-sm">
          {events.length ? (
            events.map((event) => {
              const fromEs = event.id.startsWith("es-");
              return (
                <div key={event.id} className={cn("rounded-lg border px-3 py-2", TYPE_TONE[event.type])}>
                  <p className="text-xs font-semibold">{TYPE_LABEL[event.type]}</p>
                  <p className="text-sm font-semibold">{event.company || event.title}</p>
                  <p className="text-xs opacity-80">
                    {event.title} {event.time ? `· ${event.time}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {fromEs ? (
                      <>
                        <Button asChild variant="ghost" size="xs">
                          <Link href={ROUTES.ES_DETAIL(event.id.replace("es-", ""))}>ES詳細へ</Link>
                        </Button>
                        <span className="text-[11px] opacity-70">ES由来の予定はここでは削除できません</span>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => dispatch({ type: "editPrefill", event })}
                        >
                          予定を編集
                        </Button>
                        <ConfirmDialog
                          title="予定を削除しますか？"
                          description={`「${event.title}」を削除します。`}
                          confirmLabel="削除する"
                          destructive
                          onConfirm={() => onDelete(event)}
                          trigger={
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"

                              disabled={deletingId === event.id}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              {deletingId === event.id ? "削除中..." : "予定を削除"}
                            </Button>
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">この日に登録された予定はありません。</p>
          )}
        </div>

        <EventForm
          selectedDate={selectedDate}
          formState={formState}
          editing={editingId !== null}
          saving={saving}
          dispatch={dispatch}
          submitAction={submitAction}
        />
      </DialogContent>
    </Dialog>
  );
}
