"use client";

import { useCompanies } from "@/lib/api/companies";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { companyListMessages } from "@/app/_components/avatar/guide-messages";

/** 企業一覧の見出しの横のアバター。一覧と同じキャッシュを読むので、通信は増えない。 */
export function CompanyListGuide() {
  const { data } = useCompanies();
  return <AvatarGuide messages={data ? companyListMessages(data) : []} />;
}
