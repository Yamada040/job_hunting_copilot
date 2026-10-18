-- sqlc に、Supabase Auth が持つ auth.users の存在だけを教える（DBには適用しない）。
-- auth スキーマは Supabase が作るので supabase/migrations には無く、これが無いと auth.users への問い合わせを生成できない。
-- アプリが使う列だけを書く。
create schema auth;
create table auth.users (
  id uuid primary key
);
