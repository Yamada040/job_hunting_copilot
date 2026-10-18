-- AIの利用のアプリ全体の上限（全員で共有する1日の枠）の状態。
-- api_rate_limits に入れないのは、user_id が主キーの一部で auth.users を参照しており、ユーザーに属さない行を置けないため。
-- テーブルを足すだけなので、1つ前のバージョンのコードでも動く。
create table public.api_app_rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

-- 他のテーブルと同じく、Supabase の Data API を塞ぐためだけに RLS を有効にする（ポリシーは作らない）
alter table public.api_app_rate_limits enable row level security;
