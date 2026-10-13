"use client";

import Image from "next/image";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { useMe, useUpdateMe, type Me, type ProfileUpdate } from "@/lib/api/me";
import { ApiErrorMessage } from "@/app/_components/api-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton } from "@/app/_components/loading-skeletons";

// backend/api/openapi.yaml の ProfileUpdate の maxLength と同じ値（超えた入力はバックエンドが400で拒否する）
const MAX_LENGTH = 100;

const avatarOptions = [
  { id: "sunrise", label: "Sunrise", src: "/avatars/sunrise.svg" },
  { id: "ocean", label: "Ocean", src: "/avatars/ocean.svg" },
];

const textFields = [
  { name: "fullName", label: "氏名", placeholder: "例）山田 太郎", required: true },
  { name: "university", label: "大学", placeholder: "例）○○大学" },
  { name: "faculty", label: "学部・学科", placeholder: "例）経済学部 経済学科" },
  { name: "targetIndustry", label: "志望業界（任意）", placeholder: "例）IT、コンサル、メーカー など" },
  { name: "careerAxis", label: "大切にしたい軸（任意）", placeholder: "例）成長環境、技術志向、社会貢献 など" },
] as const;

export function ProfileForm({ email }: { email: string }) {
  const { data, error } = useMe();
  // 保存すると下の key が変わって作り直され、中で持つ状態は消えるので、「保存しました」はここで持つ
  const [saved, setSaved] = useState(false);

  if (error) return <ApiErrorMessage error={error} />;
  if (!data) return <FormSkeleton fields={4} />;
  // 保存後にキャッシュが置き換わったら、フォームの初期値も最新に揃える
  return (
    <ProfileFormFields key={JSON.stringify(data)} me={data} email={email} saved={saved} onSavedChange={setSaved} />
  );
}

function ProfileFormFields({
  me,
  email,
  saved,
  onSavedChange: setSaved,
}: {
  me: Me;
  email: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const updateMe = useUpdateMe();

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
    <Card>
      <CardContent className="px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {textFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`profile-${field.name}`}>{field.label}</Label>
                <Input
                  id={`profile-${field.name}`}
                  name={field.name}
                  defaultValue={me[field.name] ?? ""}
                  maxLength={MAX_LENGTH}
                  placeholder={field.placeholder}
                  required={"required" in field}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="profile-email">メール</Label>
              <Input id="profile-email" value={email} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-goalState">就活で達成したい状態（短文）</Label>
            <Textarea
              id="profile-goalState"
              name="goalState"
              defaultValue={me.goalState ?? ""}
              maxLength={MAX_LENGTH}
              rows={3}
              placeholder="例）自社開発で技術を磨ける環境に入社する / 社会課題に取り組む事業で働く など"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">アバターを選ぶ</legend>
            <RadioGroup name="avatarId" defaultValue={me.avatarId ?? ""} className="gap-3 sm:grid-cols-2">
              {[...avatarOptions, { id: "", label: "選択しない", src: null }].map((option) => (
                <Label
                  key={option.id || "none"}
                  htmlFor={`avatar-${option.id || "none"}`}
                  className="cursor-pointer gap-3 rounded-xl border bg-secondary/60 px-4 py-4 font-normal transition-colors hover:text-primary has-data-[state=checked]:border-ring has-data-[state=checked]:bg-accent"
                >
                  <RadioGroupItem id={`avatar-${option.id || "none"}`} value={option.id} />
                  {option.src ? (
                    <Image
                      src={option.src}
                      alt={option.label}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-xl border bg-card object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-card text-xs">
                      なし
                    </div>
                  )}
                  <span className="text-sm">{option.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>

          <ApiErrorMessage
            error={updateMe.error}
            labels={Object.fromEntries(textFields.map((f) => [f.name, f.label]))}
          />
          {saved && <p className="text-sm text-success">保存しました</p>}

          <Button type="submit" variant="default" disabled={updateMe.isPending}>
            <UserCircleIcon className="h-4 w-4" />
            {updateMe.isPending ? "保存中…" : "保存する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
