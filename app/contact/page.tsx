import type { Metadata } from "next";

import { AppLayout } from "@/app/_components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseReadonlyClient } from "@/lib/supabase/supabase-server";
import { ContactForm } from "./_components/contact-form";
import { AvatarGuide } from "@/app/_components/avatar/avatar-guide";
import { GUIDE_TIPS } from "@/app/_components/avatar/guide-messages";

export const metadata: Metadata = { title: "お問い合わせ" };

/** ログインしなくても開ける（ログインできなくて困っている人も連絡できるように）。 */
export default async function ContactPage() {
  // メールアドレスとアカウント名はログイン情報（Supabase Auth）のものなので、セッションから読む
  const supabase = await createSupabaseReadonlyClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const accountName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";

  return (
    <AppLayout
      avatar={<AvatarGuide messages={GUIDE_TIPS.contact} />}
      headerTitle="お問い合わせ"
      headerDescription="不具合やご要望、ログインできないときのご相談はこちらから"
      className="space-y-6"
    >
      <Card className="overflow-visible py-6">
        <CardHeader className="px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
          <CardTitle>
            <h2 className="text-lg font-semibold">お問い合わせフォーム</h2>
          </CardTitle>
          <CardDescription>
            送っていただいた内容は運営にメールで届きます。返信はメールで、数日以内にお送りします。
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Card variant="muted" className="overflow-visible px-4">
            {user ? (
              <ContactForm signedIn accountName={accountName} email={user.email ?? ""} />
            ) : (
              <ContactForm signedIn={false} />
            )}
          </Card>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
