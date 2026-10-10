-- Go移行に合わせて public スキーマを新しい設計で作り直す（docs/backend-design.md 4章）。
-- 本番に残すべきデータは無いことを確認済みのため、旧テーブルは移行せずに削除する。Supabase Auth のユーザー（auth スキーマ）は残す。

drop table if exists
  public.webtest_attempts,
  public.webtest_questions,
  public.xp_logs,
  public.interview_logs,
  public.es_entries,
  public.calendar_events,
  public.aptitude_results,
  public.self_analysis_results,
  public.api_rate_limits,
  public.companies,
  public.profiles
  cascade;

create extension if not exists moddatetime with schema extensions;

create type public.company_stage as enum (
  'not_entered', 'entered', 'screening', 'interviewing', 'offered', 'rejected', 'declined'
);
create type public.es_status as enum ('draft', 'submitted');
create type public.calendar_event_type as enum ('es', 'interview', 'intern', 'other');
create type public.interview_format as enum ('in_person', 'online', 'hybrid');
create type public.xp_action as enum (
  'es_submitted',
  'interview_log',
  'company_new',
  'aptitude_complete',
  'self_analysis_complete',
  'webtest_question_create',
  'webtest_attempt_complete'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  university text,
  faculty text,
  avatar_id text,
  target_industry text,
  career_axis text,
  goal_state text,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  industry text,
  url text,
  mypage_id text,
  mypage_url text,
  memo text,
  stage public.company_stage not null default 'not_entered',
  preference smallint check (preference between 1 and 5),
  favorite boolean not null default false,
  ai_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create table public.es_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  position text,
  title text,
  status public.es_status not null default 'draft',
  content_md text,
  questions jsonb,
  tags text[] not null default '{}',
  deadline date,
  memo text,
  ai_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index es_entries_user_id_idx on public.es_entries (user_id);
create index es_entries_company_id_idx on public.es_entries (company_id);

create table public.interview_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  format public.interview_format,
  round text,
  interview_date date,
  questions jsonb,
  improvement text,
  unexpected text,
  ai_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_logs_user_id_idx on public.interview_logs (user_id);
create index interview_logs_company_id_idx on public.interview_logs (company_id);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  title text not null,
  type public.calendar_event_type not null default 'other',
  date date not null,
  time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_events_user_id_date_idx on public.calendar_events (user_id, date);
create index calendar_events_company_id_idx on public.calendar_events (company_id);

create table public.xp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  xp integer not null,
  action public.xp_action not null,
  ref_id uuid,
  created_at timestamptz not null default now(),
  -- 同じ対象への二重付与を、同時にリクエストが来てもDBで防ぐ（ref_id が null の操作は対象外）
  unique (user_id, action, ref_id)
);
create index xp_logs_user_id_action_created_at_idx on public.xp_logs (user_id, action, created_at);

create table public.aptitude_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  answers jsonb not null,
  ai_result text,
  created_at timestamptz not null default now()
);

create table public.self_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  answers jsonb not null,
  ai_result text,
  created_at timestamptz not null default now()
);

create table public.webtest_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  test_type text,
  choices jsonb,
  answer text not null,
  explanation text,
  category text,
  format text,
  difficulty text,
  time_limit integer,
  created_at timestamptz not null default now()
);
create index webtest_questions_user_id_idx on public.webtest_questions (user_id);

create table public.webtest_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.webtest_questions (id) on delete cascade,
  is_correct boolean,
  time_spent integer,
  created_at timestamptz not null default now()
);
create index webtest_attempts_question_id_idx on public.webtest_attempts (question_id);

create table public.api_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (user_id, bucket)
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger companies_updated_at before update on public.companies
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger es_entries_updated_at before update on public.es_entries
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger interview_logs_updated_at before update on public.interview_logs
  for each row execute procedure extensions.moddatetime (updated_at);
create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute procedure extensions.moddatetime (updated_at);

-- RLS は Supabase が公開している Data API を塞ぐためだけに有効にする。
-- ポリシーを1つも作らないので、anon / authenticated ロールからは一切読み書きできない。
-- Go はテーブルの所有者ロールで接続するため RLS の対象外になり、user_id での絞り込みは Go が必ず行う（6章）。
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.es_entries enable row level security;
alter table public.interview_logs enable row level security;
alter table public.calendar_events enable row level security;
alter table public.xp_logs enable row level security;
alter table public.aptitude_results enable row level security;
alter table public.self_analysis_results enable row level security;
alter table public.webtest_questions enable row level security;
alter table public.webtest_attempts enable row level security;
alter table public.api_rate_limits enable row level security;
