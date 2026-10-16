import { redirect } from "next/navigation";

import { createSupabaseReadonlyClient } from "@/lib/supabase/supabase-server";
import { OAuthConsent } from "./oauth-consent";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationID } = await searchParams;
  if (!authorizationID) redirect("/dashboard");

  const supabase = await createSupabaseReadonlyClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationID}`)}`);
  }

  return <OAuthConsent authorizationID={authorizationID} />;
}
