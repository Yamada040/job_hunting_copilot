-- name: GetAdminStats :one
-- 開発者向けの利用状況。全ユーザーを対象にするので、開発者の確認を済ませてから呼ぶ
select
  (select count(*) from profiles)                                                    as total_users,
  (select count(*) from profiles where profiles.created_at >= @since)                         as new_users,
  (select count(distinct xp_logs.user_id) from xp_logs where xp_logs.created_at >= @since)           as active_users,
  (select count(distinct xp_logs.user_id) from xp_logs where xp_logs.created_at >= @today_start)     as active_users_today,
  (select count(*) from es_entries)                                                  as total_es,
  (select count(*) from es_entries where es_entries.created_at >= @since)                       as new_es,
  (select count(*) from companies)                                                   as total_companies,
  (select count(*) from companies where companies.created_at >= @since)                        as new_companies,
  (select count(*) from interview_logs)                                              as total_interviews,
  (select count(*) from interview_logs where interview_logs.created_at >= @since)                   as new_interviews;

-- name: ListAiUsage :many
-- AIの機能ごとの、トークン数を記録した呼び出しの回数と合計。トークン数の列ができる前の結果は数えない
select usage.feature::text as feature, count(*) as calls,
  sum(usage.ai_input_tokens)::bigint as input_tokens, sum(usage.ai_output_tokens)::bigint as output_tokens
from (
  select 'es_review' as feature, ai_input_tokens, ai_output_tokens from es_reviews
  union all select 'interview_review', ai_input_tokens, ai_output_tokens from interview_logs
  union all select 'company_analysis', ai_input_tokens, ai_output_tokens from companies
  union all select 'aptitude_diagnosis', ai_input_tokens, ai_output_tokens from aptitude_results
  union all select 'self_analysis', ai_input_tokens, ai_output_tokens from self_analysis_results
) as usage
where usage.ai_input_tokens is not null
group by usage.feature;
