"use client";

import { useWebtestQuestions } from "@/lib/api/webtests";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { webtestListMessages } from "@/app/_components/avatar/guide-messages";

/** Webテスト一覧の見出しの横のアバター。一覧と同じキャッシュを読むので、通信は増えない。 */
export function WebtestListGuide() {
  const { data } = useWebtestQuestions();
  return <AvatarGuide messages={data ? webtestListMessages(data.length) : []} />;
}
