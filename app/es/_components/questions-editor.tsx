"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EsQuestion } from "@/lib/api/es";

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
        <span>設問カード（必要に応じて追加できます）</span>
        <Button type="button" variant="quest" onClick={() => onChange([...questions, { prompt: "", answer: "" }])}>
          カードを追加
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
            <Label htmlFor={`${idPrefix}-answer-${index}`} className="text-xs text-muted-foreground">
              回答
            </Label>
            <Textarea
              id={`${idPrefix}-answer-${index}`}
              value={q.answer}
              onChange={(e) => update(index, { answer: e.target.value })}
              maxLength={4000}
              rows={5}
              className="min-h-28 bg-card"
              placeholder="回答を入力"
            />
            <span className="block text-right text-xs text-muted-foreground">{q.answer.length} 文字</span>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="quest"
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
