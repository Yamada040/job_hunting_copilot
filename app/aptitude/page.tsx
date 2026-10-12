import { AppLayout } from "@/app/_components/layout";
import AptitudeForm from "./_components/aptitude-form";

export default function AptitudePage() {
  return (
    <AppLayout
      headerTitle="適性チェック"
      headerDescription="興味・強み・価値観を整理して、AI診断で適性の方向性を確認します"
      className="space-y-6"
    >
      <AptitudeForm />
    </AppLayout>
  );
}
