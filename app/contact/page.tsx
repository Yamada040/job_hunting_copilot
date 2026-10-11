import { AppLayout } from "@/app/_components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseReadonlyClient } from "@/lib/supabase/supabase-server";
import { ContactForm } from "./_components/contact-form";

export default async function ContactPage() {
  // メールアドレスとアカウント名はログイン情報（Supabase Auth）のものなので、セッションから読む
  const supabase = await createSupabaseReadonlyClient();
  const { data: userData } = await supabase.auth.getUser();
  const accountName = userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.name || "";
  const email = userData.user?.email ?? "";

  return (
    <AppLayout headerTitle="お問い合わせ" headerDescription="不具合やご要望を運営に送信できます" className="space-y-6">
      <Card className="py-6">
        <CardHeader className="px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Contact</p>
          <CardTitle>
            <h2 className="text-lg font-semibold">お問い合わせフォーム</h2>
          </CardTitle>
          <CardDescription>内容を入力して送信すると、そのまま運営に送信されます。</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Card variant="muted" className="px-4">
            <ContactForm accountName={accountName} email={email} />
          </Card>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
