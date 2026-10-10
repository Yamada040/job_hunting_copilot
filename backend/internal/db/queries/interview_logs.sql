-- name: ListInterviewLogs :many
-- company_id を渡すと、その企業の面接ログだけに絞り込む
select sqlc.embed(interview_logs), companies.name as company_name
from interview_logs
join companies on companies.id = interview_logs.company_id
where interview_logs.user_id = @user_id
  and (sqlc.narg(company_id)::uuid is null or interview_logs.company_id = sqlc.narg(company_id)::uuid)
order by interview_logs.interview_date desc nulls last, interview_logs.created_at desc
limit sqlc.arg(max_rows);

-- name: GetInterviewLog :one
select sqlc.embed(interview_logs), companies.name as company_name
from interview_logs
join companies on companies.id = interview_logs.company_id
where interview_logs.id = @id and interview_logs.user_id = @user_id;

-- name: CreateInterviewLog :one
insert into interview_logs (user_id, company_id, format, round, interview_date, questions, improvement, unexpected)
values (@user_id, @company_id, @format, @round, @interview_date, @questions, @improvement, @unexpected)
returning id;

-- name: UpdateInterviewLog :execrows
-- PATCH なので、set_* が true の項目だけを書き換える
update interview_logs set
  company_id     = case when @set_company_id::boolean     then sqlc.narg(company_id)::uuid               else company_id end,
  format         = case when @set_format::boolean         then sqlc.narg(format)::interview_format       else format end,
  round          = case when @set_round::boolean          then sqlc.narg(round)                          else round end,
  interview_date = case when @set_interview_date::boolean then sqlc.narg(interview_date)::date           else interview_date end,
  questions      = case when @set_questions::boolean      then sqlc.narg(questions)::jsonb               else questions end,
  improvement    = case when @set_improvement::boolean    then sqlc.narg(improvement)                    else improvement end,
  unexpected     = case when @set_unexpected::boolean     then sqlc.narg(unexpected)                     else unexpected end
where id = @id and user_id = @user_id;

-- name: DeleteInterviewLog :execrows
delete from interview_logs where id = @id and user_id = @user_id;

-- name: SetInterviewAiResult :execrows
update interview_logs set ai_result = @ai_result where id = @id and user_id = @user_id;
