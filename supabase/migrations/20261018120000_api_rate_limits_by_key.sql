-- ユーザーに結び付かない回数制限（ログインしていない人の問い合わせのIPごとの上限と、アプリ全体の上限）。
-- api_rate_limits の user_id は auth.users を参照するので、IPや「全体」を入れられない。
-- 主キーを変えて api_rate_limits を広げると、今動いているコードの on conflict (user_id, bucket) が使えなくなるため、別の表にする。
-- 表を足すだけなので、1つ前のバージョンのコードでも動く。
create table public.api_rate_limits_by_key (
  key text not null,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (key, bucket)
);

alter table public.api_rate_limits_by_key enable row level security;
