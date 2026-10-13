"use client";

import { useEsEntries } from "@/lib/api/es";
import { formatDateKey } from "@/app/calendar/_components/calendar/utils";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { esListMessages } from "@/app/_components/avatar/guide-messages";

/** ES一覧の見出しの横のアバター。一覧と同じキャッシュを読むので、通信は増えない。 */
export function EsListGuide() {
  const { data } = useEsEntries();
  const today = formatDateKey(new Date());
  return <AvatarGuide messages={data ? esListMessages(data, today) : []} />;
}
