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
