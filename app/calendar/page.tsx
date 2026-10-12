import { AppLayout } from "@/app/_components/layout";
import { CalendarView } from "./_components/calendar-view";

export default function CalendarPage() {
  return (
    <AppLayout
      headerTitle="カレンダー"
      headerDescription="ES・面接・インターンの予定と、ESの締切をまとめて確認します"
      className="space-y-6"
    >
      <CalendarView />
    </AppLayout>
  );
}
