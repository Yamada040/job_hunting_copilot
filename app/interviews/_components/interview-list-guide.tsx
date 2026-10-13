"use client";

import { useInterviewLogs } from "@/lib/api/interviews";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { interviewListMessages } from "@/app/_components/avatar/guide-messages";

/** 面接ログ一覧の見出しの横のアバター。一覧と同じキャッシュを読むので、通信は増えない。 */
export function InterviewListGuide() {
  const { data } = useInterviewLogs();
  return <AvatarGuide messages={data ? interviewListMessages(data) : []} />;
}
