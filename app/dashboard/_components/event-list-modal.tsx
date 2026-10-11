"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  company?: string | null;
  type: "es" | "interview" | "intern" | "other";
  time?: string | null;
};

type Props = {
  events: CalendarEvent[];
  trigger: React.ReactNode;
};

export function EventListModal({ events, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const sorted = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...events]
      .filter((evt) => {
        const d = evt.date ? new Date(evt.date) : null;
        return d ? d >= now : false;
      })
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });
  }, [events]);

  const visible = sorted.slice(0, visibleCount);
  const canLoadMore = visibleCount < sorted.length;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        {trigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-5 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">締切・面接の一覧</DialogTitle>
            <DialogDescription className="sr-only">締切・面接の一覧</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {visible.map((evt) => (
              <div key={evt.id} className="rounded-lg border bg-secondary/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">
                    {evt.type === "es" ? "ES締切" : evt.type === "interview" ? "面接" : "予定"}
                  </span>
                  <span>{evt.date || "未設定"}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{evt.company || evt.title || "件名未設定"}</p>
                <p className="text-xs text-muted-foreground">{evt.title}</p>
              </div>
            ))}

            {visible.length === 0 && (
              <div className="rounded-lg border border-dashed bg-secondary/60 p-3 text-xs text-muted-foreground">
                表示できる予定はありません。
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {visible.length} / {sorted.length} 件
            </div>
            <div className="flex gap-2">
              {canLoadMore && (
                <Button type="button" variant="quest" onClick={() => setVisibleCount((v) => v + 10)}>
                  さらに読み込む
                </Button>
              )}
              <DialogClose asChild>
                <Button type="button" variant="quest">
                  閉じる
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
