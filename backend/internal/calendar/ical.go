package calendar

import (
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Yamada040/job_hunting_copilot/backend/internal/db"
)

// iCal（RFC 5545）を組み立てる。予定の時刻は日本時間として扱い、UTC に直して書く
// （タイムゾーンの定義 VTIMEZONE を書かずに済み、どのカレンダーでも同じ時刻に出るため）。

var jst = time.FixedZone("Asia/Tokyo", 9*60*60)

// 時刻のある予定の長さ。予定には終わりの時刻が無いので、1時間として出す
const eventDuration = time.Hour

var typeLabel = map[db.CalendarEventType]string{
	db.CalendarEventTypeEs:        "ES締切",
	db.CalendarEventTypeInterview: "面接",
	db.CalendarEventTypeIntern:    "インターン",
	db.CalendarEventTypeOther:     "予定",
}

// BuildICal は、予定とESの締切を iCal の文字列にする。now は各予定の作成日時（DTSTAMP）に使う。
func BuildICal(items []Item, now time.Time) string {
	var b strings.Builder
	write := func(line string) { b.WriteString(fold(line)) }
	write("BEGIN:VCALENDAR")
	write("VERSION:2.0")
	write("PRODID:-//shukatsu-copilot//calendar//JA")
	write("CALSCALE:GREGORIAN")
	write("METHOD:PUBLISH")
	write("X-WR-CALNAME:就活copilot")
	write("X-WR-TIMEZONE:Asia/Tokyo")
	// 読み直す間隔の希望。Googleカレンダーは従わず、自分の間隔（数時間〜1日ほど）で読み直す
	write("REFRESH-INTERVAL;VALUE=DURATION:PT1H")
	write("X-PUBLISHED-TTL:PT1H")
	stamp := now.UTC().Format("20060102T150405Z")
	for _, item := range items {
		write("BEGIN:VEVENT")
		write(fmt.Sprintf("UID:%s-%s@shukatsu-copilot", item.Source, item.ID))
		write("DTSTAMP:" + stamp)
		if item.EndDate != nil {
			// 何日か続く予定は終日。iCal の終日の終わりは「最終日の翌日」を書く
			write("DTSTART;VALUE=DATE:" + item.Date.Format("20060102"))
			write("DTEND;VALUE=DATE:" + item.EndDate.AddDate(0, 0, 1).Format("20060102"))
		} else if start, ok := startTime(item); ok {
			write("DTSTART:" + start.UTC().Format("20060102T150405Z"))
			write("DTEND:" + start.Add(eventDuration).UTC().Format("20060102T150405Z"))
		} else {
			write("DTSTART;VALUE=DATE:" + item.Date.Format("20060102"))
			write("DTEND;VALUE=DATE:" + item.Date.AddDate(0, 0, 1).Format("20060102"))
		}
		write("SUMMARY:" + escapeText(fmt.Sprintf("【%s】%s", typeLabel[item.Type], item.Title)))
		var description []string
		if item.CompanyName != nil && *item.CompanyName != "" {
			description = append(description, "企業: "+*item.CompanyName)
		}
		if item.URL != nil {
			// URL の項目を表示しないカレンダーもあるので、説明にも書いておく
			write("URL:" + *item.URL)
			description = append(description, "リンク: "+*item.URL)
		}
		if item.Note != nil && *item.Note != "" {
			description = append(description, "備考: "+*item.Note)
		}
		if len(description) > 0 {
			write("DESCRIPTION:" + escapeText(strings.Join(description, "\n")))
		}
		write("END:VEVENT")
	}
	write("END:VCALENDAR")
	return b.String()
}

// startTime は、時刻のある予定の始まり（日本時間）を返す。時刻が無ければ終日の予定として false を返す。
func startTime(item Item) (time.Time, bool) {
	if item.Time == nil {
		return time.Time{}, false
	}
	t, err := time.Parse("15:04", *item.Time)
	if err != nil {
		return time.Time{}, false
	}
	d := item.Date
	return time.Date(d.Year(), d.Month(), d.Day(), t.Hour(), t.Minute(), 0, 0, jst), true
}

// escapeText は、iCal の文字列の中で意味を持つ記号（\ ; , 改行）を書き換える。
func escapeText(s string) string {
	return strings.NewReplacer(`\`, `\\`, ";", `\;`, ",", `\,`, "\r\n", `\n`, "\n", `\n`).Replace(s)
}

// fold は、1行を75バイト以内に折り返し、行末を CRLF にする（RFC 5545 3.1）。
// 日本語の文字の途中で切らないよう、文字の区切りで折る。続きの行は空白1つで始める。
func fold(line string) string {
	const limit = 75
	var b strings.Builder
	width := 0
	for _, r := range line {
		size := utf8.RuneLen(r)
		if width+size > limit {
			b.WriteString("\r\n ")
			width = 1
		}
		b.WriteRune(r)
		width += size
	}
	b.WriteString("\r\n")
	return b.String()
}
