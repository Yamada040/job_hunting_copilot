-- name: GetDailyReport :one
-- 運営に送る1日（@day_start から @day_end の前まで）の利用状況。全ユーザーを対象にするので、合言葉を確かめてから呼ぶ
select
  (select count(*) from profiles)                                                                                                          as total_users,
  (select count(*) from profiles where profiles.created_at >= @day_start and profiles.created_at < @day_end)                               as new_users,
  (select count(distinct xp_logs.user_id) from xp_logs where xp_logs.created_at >= @day_start and xp_logs.created_at < @day_end)           as active_users,
  (select count(*) from es_entries where es_entries.created_at >= @day_start and es_entries.created_at < @day_end)                         as new_es,
  (select count(*) from companies where companies.created_at >= @day_start and companies.created_at < @day_end)                            as new_companies,
  (select count(*) from interview_logs where interview_logs.created_at >= @day_start and interview_logs.created_at < @day_end)             as new_interviews;
