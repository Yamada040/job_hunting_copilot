-- 何日か続く予定（インターンなど）の最終日。null なら1日だけの予定。期間のある予定は終日として扱う。
-- 列を足すだけなので、1つ前のバージョンのコードでも動く（古いコードは最終日を見ず、初日だけに出す）。
alter table public.calendar_events
  add column end_date date check (end_date is null or end_date >= date);
