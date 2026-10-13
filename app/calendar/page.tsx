import { AppLayout } from "@/app/_components/layout";
import { CalendarView } from "./_components/calendar-view";
import { CalendarGuide } from "./_components/calendar-guide";
import { CalendarSubscription } from "./_components/calendar-subscription";

export default function CalendarPage() {
  return (
    <AppLayout
      avatar={<CalendarGuide />}
      headerTitle="カレンダー"
      headerDescription="ES・面接・インターンの予定と、ESの締切をまとめて確認します"
      className="space-y-6"
    >
      <CalendarView />
      <CalendarSubscription />
    </AppLayout>
  );
}
