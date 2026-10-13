-- 予定の任意の備考。列を足すだけなので、1つ前のバージョンのコードでも動く。
alter table public.calendar_events
  add column note text check (note is null or char_length(note) <= 2000);
