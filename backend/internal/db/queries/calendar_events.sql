-- name: ListCalendarEvents :many
-- 期間（from 〜 to、どちらも含む）で絞り込む。どちらも省略できる。何日か続く予定は、期間に少しでも重なれば含める。company_id を渡すと、その企業の予定だけに絞る
select sqlc.embed(calendar_events), companies.name as company_name
from calendar_events
left join companies on companies.id = calendar_events.company_id
where calendar_events.user_id = @user_id
  and (sqlc.narg(company_id)::uuid is null or calendar_events.company_id = sqlc.narg(company_id)::uuid)
  and (sqlc.narg(from_date)::date is null or coalesce(calendar_events.end_date, calendar_events.date) >= sqlc.narg(from_date)::date)
  and (sqlc.narg(to_date)::date is null or calendar_events.date <= sqlc.narg(to_date)::date)
order by calendar_events.date, calendar_events.time nulls last;

-- name: ListEsDeadlines :many
-- カレンダーには、ユーザーが登録した予定に加えてESの締切も表示する（docs/backend-design.md 3章）
select es_entries.id, es_entries.title, es_entries.deadline::date as deadline, es_entries.company_id, companies.name as company_name
from es_entries
join companies on companies.id = es_entries.company_id
where es_entries.user_id = @user_id
  and es_entries.deadline is not null
  and (sqlc.narg(company_id)::uuid is null or es_entries.company_id = sqlc.narg(company_id)::uuid)
  and (sqlc.narg(from_date)::date is null or es_entries.deadline >= sqlc.narg(from_date)::date)
  and (sqlc.narg(to_date)::date is null or es_entries.deadline <= sqlc.narg(to_date)::date)
order by es_entries.deadline;

-- name: CountCalendarEvents :one
select count(*) from calendar_events where user_id = @user_id;

-- name: GetCalendarEvent :one
select sqlc.embed(calendar_events), companies.name as company_name
from calendar_events
left join companies on companies.id = calendar_events.company_id
where calendar_events.id = @id and calendar_events.user_id = @user_id;

-- name: CreateCalendarEvent :one
insert into calendar_events (user_id, company_id, title, type, date, end_date, time, url, note)
values (@user_id, @company_id, @title, @type, @date, @end_date, @time, @url, @note)
returning id;

-- name: UpdateCalendarEvent :execrows
-- PATCH なので、set_* が true の項目だけを書き換える
update calendar_events set
  company_id = case when @set_company_id::boolean then sqlc.narg(company_id)::uuid              else company_id end,
  title      = case when @set_title::boolean      then sqlc.narg(title)::text                   else title end,
  type       = case when @set_type::boolean       then sqlc.narg(type)::calendar_event_type     else type end,
  date       = case when @set_date::boolean       then sqlc.narg(date)::date                    else date end,
  end_date   = case when @set_end_date::boolean   then sqlc.narg(end_date)::date                else end_date end,
  time       = case when @set_time::boolean       then sqlc.narg(time)::time                    else time end,
  url        = case when @set_url::boolean        then sqlc.narg(url)::text                     else url end,
  note       = case when @set_note::boolean       then sqlc.narg(note)::text                    else note end
where id = @id and user_id = @user_id;

-- name: DeleteCalendarEvent :execrows
delete from calendar_events where id = @id and user_id = @user_id;
