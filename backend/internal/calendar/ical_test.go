package calendar

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
)

func unfold(s string) string { return strings.ReplaceAll(s, "\r\n ", "") }

func TestBuildICalWritesAllDayAndTimedEvents(t *testing.T) {
	id := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	items := []Item{
		{ID: id, Source: SourceESDeadline, Title: "本選考ES", Type: db.CalendarEventTypeEs, Date: *day("2026-11-05"), CompanyName: ptr("サンプル")},
		{ID: id, Source: SourceEvent, Title: "一次面接", Type: db.CalendarEventTypeInterview, Date: *day("2026-11-10"), Time: ptr("15:00"), URL: ptr("https://meet.example.com/abc")},
	}

	got := unfold(BuildICal(items, time.Date(2026, 10, 13, 0, 0, 0, 0, time.UTC)))

	for _, want := range []string{
		"BEGIN:VCALENDAR\r\n",
		"UID:es_deadline-11111111-1111-1111-1111-111111111111@shukatsu-copilot\r\n",
		// 時刻の無いESの締切は終日（終わりは翌日）
		"DTSTART;VALUE=DATE:20261105\r\nDTEND;VALUE=DATE:20261106\r\n",
		"SUMMARY:【ES締切】本選考ES\r\nDESCRIPTION:企業: サンプル\r\n",
		// 日本時間の15:00は UTC の6:00。長さは1時間
		"DTSTART:20261110T060000Z\r\nDTEND:20261110T070000Z\r\n",
		// リンクは URL の項目と、説明の両方に書く
		"URL:https://meet.example.com/abc\r\nDESCRIPTION:リンク: https://meet.example.com/abc\r\n",
		"END:VCALENDAR\r\n",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("iCal に %q がありません\n%s", want, got)
		}
	}
}

func TestBuildICalEscapesTextAndFoldsLongLines(t *testing.T) {
	title := strings.Repeat("あ", 40) + ", 面接; 二次"
	got := BuildICal([]Item{{ID: uuid.New(), Source: SourceEvent, Title: title, Type: db.CalendarEventTypeOther, Date: *day("2026-11-01")}}, time.Now())

	for _, line := range strings.Split(strings.TrimSuffix(got, "\r\n"), "\r\n") {
		if len(line) > 75 {
			t.Errorf("75バイトを超える行があります（%dバイト）: %q", len(line), line)
		}
	}
	if want := `SUMMARY:【予定】` + strings.Repeat("あ", 40) + `\, 面接\; 二次`; !strings.Contains(unfold(got), want) {
		t.Errorf("記号を書き換えていません: %q", unfold(got))
	}
}
