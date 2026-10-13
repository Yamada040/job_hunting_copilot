"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EsQuestion } from "@/lib/api/es";
import { countCharacters } from "@/lib/es/characters";
import { cn } from "@/lib/utils";

type Props = {
  questions: EsQuestion[];
  onChange: (questions: EsQuestion[]) => void;
};

// maxLength は backend/api/openapi.yaml の EsQuestion と同じ値
export function QuestionsEditor({ questions, onChange }: Props) {
  const idPrefix = useId();
  const update = (index: number, patch: Partial<EsQuestion>) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>必要に応じて、設問を追加できます</span>
        <Button type="button" variant="outline" onClick={() => onChange([...questions, { prompt: "", answer: "" }])}>
          設問を追加
        </Button>
      </div>

      {questions.map((q, index) => (
        <Card key={index} variant="muted" className="gap-2 px-4 py-3">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-prompt-${index}`} className="text-xs text-muted-foreground">
              設問
            </Label>
            <Input
              id={`${idPrefix}-prompt-${index}`}
              value={q.prompt}
              onChange={(e) => update(index, { prompt: e.target.value })}
              maxLength={1000}
              className="bg-card"
              placeholder="例）学生時代に力を入れたこと"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor={`${idPrefix}-answer-${index}`} className="text-xs text-muted-foreground">
                回答
              </Label>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Label htmlFor={`${idPrefix}-limit-${index}`}>文字数の上限</Label>
                <Input
                  id={`${idPrefix}-limit-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={4000}
                  value={q.charLimit ?? ""}
                  onChange={(e) => update(index, { charLimit: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-7 w-20 bg-card text-right text-xs"
                  placeholder="なし"
                />
                <span>字</span>
              </div>
            </div>
            <Textarea
              id={`${idPrefix}-answer-${index}`}
              value={q.answer}
              onChange={(e) => update(index, { answer: e.target.value })}
              maxLength={4000}
              rows={5}
              className="min-h-28 bg-card"
              placeholder="回答を入力"
            />
            <CharacterCount text={q.answer} limit={q.charLimit} />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="destructive"
              className="text-xs"
              onClick={() => onChange(questions.filter((_, i) => i !== index))}
            >
              削除
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

/** 回答の文字数。上限を超えたら赤くするだけで、保存・提出は止めない。 */
function CharacterCount({ text, limit }: { text: string; limit?: number }) {
  const count = countCharacters(text);
  return (
    <span
      className={cn("block text-right text-xs text-muted-foreground", {
        "font-semibold text-destructive": limit !== undefined && count > limit,
      })}
    >
      {limit === undefined ? `${count} 文字` : `${count} / ${limit} 文字`}
    </span>
  );
}
