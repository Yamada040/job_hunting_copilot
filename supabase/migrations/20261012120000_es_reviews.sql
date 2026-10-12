-- AI添削の添削結果を1回ずつ残し、点数の推移を見せる。
-- es_entries.ai_result は1つ前のバージョンのコードが読むので、この版では消さずに残し、次のリリースで削除する。
create table public.es_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  es_entry_id uuid not null references public.es_entries (id) on delete cascade,
  ai_result jsonb not null,
  created_at timestamptz not null default now()
);
create index es_reviews_es_entry_id_created_at_idx on public.es_reviews (es_entry_id, created_at desc);

-- 他のテーブルと同じく、Data API を塞ぐためだけに有効にする（ポリシーは作らない）
alter table public.es_reviews enable row level security;
