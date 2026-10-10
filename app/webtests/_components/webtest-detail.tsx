"use client";

import { useState } from "react";

import { useAnswerWebtestQuestion, useWebtestQuestion } from "@/lib/api/webtests";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

export function WebtestDetail({ id }: { id: string }) {
  const { data: question, error } = useWebtestQuestion(id);
  const answer = useAnswerWebtestQuestion(id);
  const [status, setStatus] = useState<"correct" | "incorrect" | null>(null);

  if (error) return <ApiErrorMessage error={error} />;
  if (!question) return <div className="dq-card p-6 text-sm text-white">読み込み中…</div>;
  const attempts = question.attempts.slice(0, 5);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const timeSpent = String(form.get("timeSpent") ?? "");
    setStatus(null);
    answer.mutate(
      { answer: String(form.get("answer") ?? ""), timeSpent: timeSpent ? Number(timeSpent) : undefined },
      { onSuccess: ({ attempt }) => setStatus(attempt.isCorrect ? "correct" : "incorrect") },
    );
  };

  return (
    <>
      <h2 className="text-lg font-semibold text-white">{question.title}</h2>
      {status === "correct" ? (
        <div className="dq-panel px-4 py-3 text-sm text-emerald-200">正解です！</div>
      ) : status === "incorrect" ? (
        <div className="dq-panel px-4 py-3 text-sm text-rose-200">不正解です。もう一度チャレンジしましょう。</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="dq-card space-y-4 p-6">
          <div className="flex flex-wrap gap-2 text-xs text-white/70">
            <Badge label="テスト形式" value={question.testType ?? "未設定"} />
            <Badge label="カテゴリ" value={question.category ?? "未設定"} />
            <Badge label="形式" value={question.format ?? "未設定"} />
            <Badge label="難易度" value={question.difficulty ?? "未設定"} />
            <Badge label="制限" value={question.timeLimit ? `${question.timeLimit}s` : "任意"} />
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-white/90">{question.body}</p>

          <form onSubmit={handleSubmit} className="dq-panel space-y-3 p-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white">解答</label>
              {question.choices.length > 0 ? (
                <select name="answer" className="dq-input text-sm" required>
                  <option value="">選択してください</option>
                  {question.choices.map((c, idx) => (
                    <option key={`${idx}-${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="answer" required maxLength={500} className="dq-input text-sm" placeholder="解答を入力" />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/70">解答時間（秒） 任意</label>
              <input type="number" name="timeSpent" min={0} max={36000} className="dq-input text-sm" placeholder="60" />
            </div>
            <div className="pt-2 flex justify-start">
              <button type="submit" className="dq-button" disabled={answer.isPending}>
                {answer.isPending ? "送信中…" : "解答を送信"}
              </button>
            </div>
          </form>

          <ApiErrorMessage error={answer.error} />

          {question.explanation ? (
            <div className="dq-panel p-4 text-sm text-white/80">
              <p className="text-xs font-semibold text-white/70">解説</p>
              <p className="mt-1 whitespace-pre-line leading-6">{question.explanation}</p>
            </div>
          ) : null}
        </div>

        <div className="dq-card space-y-3 p-4">
          <p className="text-sm font-semibold text-white">最近の解答 (5件)</p>
          <div className="space-y-2 text-xs text-white/70">
            {attempts.length === 0 ? (
              <p className="text-white/60">まだ解答履歴がありません。</p>
            ) : (
              attempts.map((a) => (
                <div key={a.id} className="dq-panel flex items-center justify-between px-3 py-2">
                  <span className={a.isCorrect ? "text-emerald-200" : "text-rose-200"}>
                    {a.isCorrect ? "正解" : "不正解"}
                  </span>
                  <span className="text-white/60">
                    {a.timeSpent ? `${a.timeSpent}s` : "-"} / {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const Badge = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[11px] text-white/80">
    {label}: {value}
  </span>
);
