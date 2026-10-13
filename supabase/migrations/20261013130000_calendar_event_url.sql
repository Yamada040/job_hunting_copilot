-- 予定のリンク（オンライン面接のURLなど）。画面ではリンクとして開くので、javascript: などを入れられないよう http(s) に限る。
-- 列を足すだけなので、1つ前のバージョンのコードでも動く。
alter table public.calendar_events
  add column url text check (url is null or (url ~ '^https?://' and char_length(url) <= 500));
