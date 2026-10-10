"use client";

import Image from "next/image";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { useMe, useUpdateMe, type Me, type ProfileUpdate } from "@/lib/api/me";
import { ApiErrorMessage } from "@/app/_components/api-error-message";

// backend/api/openapi.yaml の ProfileUpdate の maxLength と同じ値（超えた入力はバックエンドが400で拒否する）
const MAX_LENGTH = 100;

const avatarOptions = [
  { id: "sunrise", label: "Sunrise", src: "/avatars/sunrise.svg" },
  { id: "ocean", label: "Ocean", src: "/avatars/ocean.svg" },
];

const textFields = [
  { name: "fullName", label: "氏名", placeholder: "例）山田 太郎" },
  { name: "university", label: "大学", placeholder: "例）○○大学" },
  { name: "faculty", label: "学部・学科", placeholder: "例）経済学部 経済学科" },
  { name: "targetIndustry", label: "志望業界（任意）", placeholder: "例）IT、コンサル、メーカー など" },
  { name: "careerAxis", label: "大切にしたい軸（任意）", placeholder: "例）成長環境、技術志向、社会貢献 など" },
] as const;

export function ProfileForm({ email }: { email: string }) {
  const { data, error } = useMe();

  if (error) return <ApiErrorMessage error={error} />;
  if (!data) return <p className="dq-card p-8 text-sm text-white">読み込み中…</p>;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return <ProfileFormFields key={JSON.stringify(data)} me={data} email={email} />;
}

function ProfileFormFields({ me, email }: { me: Me; email: string }) {
  const updateMe = useUpdateMe();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (name: keyof ProfileUpdate) => String(form.get(name) ?? "");
    setSaved(false);
    updateMe.mutate(
      {
        fullName: value("fullName"),
        university: value("university"),
        faculty: value("faculty"),
        targetIndustry: value("targetIndustry"),
        careerAxis: value("careerAxis"),
        goalState: value("goalState"),
        avatarId: value("avatarId"),
      },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="dq-card p-8">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {textFields.map((field) => (
            <label key={field.name} className="block space-y-2">
              <span className="text-sm font-medium text-white">{field.label}</span>
              <input
                name={field.name}
                defaultValue={me[field.name] ?? ""}
                maxLength={MAX_LENGTH}
                className="dq-input text-sm"
                placeholder={field.placeholder}
              />
            </label>
          ))}
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white">メール</span>
            <input value={email} disabled className="dq-input text-sm" />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">就活で達成したい状態（短文）</span>
          <textarea
            name="goalState"
            defaultValue={me.goalState ?? ""}
            maxLength={MAX_LENGTH}
            rows={3}
            className="dq-input text-sm"
            placeholder="例）自社開発で技術を磨ける環境に入社する / 社会課題に取り組む事業で働く など"
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-white">アバターを選ぶ</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...avatarOptions, { id: "", label: "選択しない", src: null }].map((opt) => (
              <label
                key={opt.id || "none"}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/40 bg-black/70 px-4 py-4 text-white transition-colors hover:text-yellow-400 has-[:checked]:border-white has-[:checked]:bg-black"
              >
                <input
                  type="radio"
                  name="avatarId"
                  value={opt.id}
                  defaultChecked={(me.avatarId ?? "") === opt.id}
                  className="h-4 w-4 accent-amber-300"
                />
                {opt.src ? (
                  <Image
                    src={opt.src}
                    alt={opt.label}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl border border-white/30 bg-black/70 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/30 bg-black/70 text-xs">
                    なし
                  </div>
                )}
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <ApiErrorMessage error={updateMe.error} labels={Object.fromEntries(textFields.map((f) => [f.name, f.label]))} />
        {saved && <p className="text-sm text-emerald-300">保存しました</p>}

        <button type="submit" className="dq-button" disabled={updateMe.isPending}>
          <UserCircleIcon className="h-4 w-4" />
          {updateMe.isPending ? "保存中…" : "保存する"}
        </button>
      </div>
    </form>
  );
}
