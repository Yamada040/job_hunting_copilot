import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import { createSupabaseReadonlyClient } from "@/lib/supabase/supabase-server";
import { ROUTES } from "@/lib/constants/routes";
import { AppLayout } from "@/app/_components/layout";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./_components/profile-form";

export default async function ProfilePage() {
  // メールアドレスはログイン情報（Supabase Auth）のものなので、プロフィールのAPIではなくセッションから読む
  const supabase = await createSupabaseReadonlyClient();
  const { data: userData } = await supabase.auth.getUser();

  return (
    <AppLayout
      headerTitle="プロフィール"
      headerDescription="基本情報と、志望業界・大切にしたい軸を設定します。"
      headerActions={
        <div className="flex gap-3">
          <Button asChild variant="quest-muted">
            <Link href={ROUTES.DASHBOARD}>
              <ArrowLeftIcon className="h-4 w-4" />
              ダッシュボードへ
            </Link>
          </Button>
        </div>
      }
      className="flex flex-col gap-8"
    >
      <ProfileForm email={userData.user?.email ?? ""} />
    </AppLayout>
  );
}
