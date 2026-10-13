-- カレンダーの購読用URL（iCal）。URLの秘密の部分（トークン）を知っていれば、ログインせずにその人の予定を読める。
-- トークンそのものは保存せず、SHA-256 のハッシュだけを持つ（DBの中身が漏れても、予定を読めるURLは作れないように）。
-- そのため、URLは作ったときにだけ見せ、あとから必要になったら作り直す。1人1つで、作り直すと古いURLは使えなくなる。
create table public.calendar_feeds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now()
);

-- 他のテーブルと同じく、Data API を塞ぐためだけに有効にする（ポリシーは作らない）
alter table public.calendar_feeds enable row level security;
