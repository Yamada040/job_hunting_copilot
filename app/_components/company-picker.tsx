"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanies, useCreateCompany, type CompanySummary } from "@/lib/api/companies";
import { ApiErrorMessage } from "./api-error-message";

type Props = {
  value: CompanySummary | null;
  onChange: (company: CompanySummary | null) => void;
};

/**
 * 企業を選ぶ欄。入力した名前で登録済みの企業を候補に出し、見つからなければその場で新しく登録できる
 * （どの画面から企業を登録しても、同じ「企業の登録」の操作としてXPのルールが適用される）。
 */
export function CompanyPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: candidates } = useCompanies(query.trim());
  const createCompany = useCreateCompany();

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <Input value={value.name} readOnly aria-label="企業" className="flex-1" />
        <Button type="button" variant="quest-muted" className="text-xs" onClick={() => onChange(null)}>
          変更
        </Button>
      </div>
    );
  }

  const name = query.trim();
  const exactMatch = candidates?.some((c) => c.name === name);

  return (
    <div className="relative space-y-1">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        maxLength={100}
        placeholder="企業名を入力して選ぶ"
        aria-label="企業"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-border">
          {candidates?.slice(0, 10).map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                onClick={() => onChange({ id: c.id, name: c.name })}
              >
                {c.name}
              </button>
            </li>
          ))}
          {name && !exactMatch && (
            <li>
              <button
                type="button"
                disabled={createCompany.isPending}
                className="w-full px-3 py-2 text-left text-primary hover:bg-accent"
                onClick={() =>
                  createCompany.mutate(
                    { name },
                    { onSuccess: ({ company }) => onChange({ id: company.id, name: company.name }) },
                  )
                }
              >
                ＋「{name}」を新しく登録する
              </button>
            </li>
          )}
        </ul>
      )}
      <ApiErrorMessage error={createCompany.error} labels={{ name: "企業名" }} />
    </div>
  );
}
