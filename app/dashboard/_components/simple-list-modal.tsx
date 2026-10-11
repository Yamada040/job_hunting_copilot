"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Item = {
  title: string;
  subtitle?: string;
  meta?: string;
};

type Props = {
  trigger: React.ReactNode;
  items: Item[];
  emptyText?: string;
};

export function SimpleListModal({ trigger, items, emptyText = "項目がありません" }: Props) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const visible = items.slice(0, visibleCount);
  const canLoadMore = visibleCount < items.length;

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
            <DialogTitle className="text-lg font-semibold">一覧</DialogTitle>
            <DialogDescription className="sr-only">一覧</DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto">
            {visible.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="rounded-lg border bg-secondary/60 px-3 py-2 text-sm">
                <p className="font-semibold">{item.title}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                {item.meta && <p className="text-[11px] text-muted-foreground">{item.meta}</p>}
              </div>
            ))}

            {visible.length === 0 && (
              <div className="rounded-lg border border-dashed bg-secondary/60 p-3 text-xs text-muted-foreground">
                {emptyText}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {visible.length} / {items.length} 件
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
