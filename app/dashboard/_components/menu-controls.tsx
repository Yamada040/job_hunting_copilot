import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

/** カルーセルの下の、左右に送るボタンと、正面のカードの名前・操作の説明。 */
export function MenuControls({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <>
      <div className="flex items-center justify-center gap-4 text-sm font-bold">
        <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label="左へ回す">
          <ChevronLeftIcon />
        </Button>
        <span aria-live="polite" className="min-w-28 text-center text-foreground">
          {label}
        </span>
        <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label="右へ回す">
          <ChevronRightIcon />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        ←→キー・ドラッグ・ホイールで回し、正面のカードを押すとその画面を開きます
      </p>
    </>
  );
}
