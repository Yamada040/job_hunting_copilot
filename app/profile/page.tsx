import { createSupabaseReadonlyClient } from "@/lib/supabase/supabase-server";
import { AppLayout } from "@/app/_components/layout";
import { ProfileForm } from "./_components/profile-form";

export default async function ProfilePage() {
  // メールアドレスはログイン情報（Supabase Auth）のものなので、プロフィールのAPIではなくセッションから読む
  const supabase = await createSupabaseReadonlyClient();
  const { data: userData } = await supabase.auth.getUser();

  return (
    <AppLayout
      headerTitle="プロフィール"
      headerDescription="基本情報と、志望業界・大切にしたい軸を設定します。"
      className="flex flex-col gap-8"
    >
      <ProfileForm email={userData.user?.email ?? ""} />
    </AppLayout>
  );
}
