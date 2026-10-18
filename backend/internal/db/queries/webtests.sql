-- name: ListWebtestQuestions :many
select id, title, test_type, category, format, difficulty, time_limit, created_at
from webtest_questions
where user_id = @user_id and (sqlc.narg(test_type)::text is null or test_type = sqlc.narg(test_type)::text)
order by created_at desc;

-- name: CountWebtestQuestions :one
select count(*) from webtest_questions where user_id = @user_id;

-- name: GetWebtestQuestion :one
select * from webtest_questions where id = @id and user_id = @user_id;

-- name: CreateWebtestQuestion :one
insert into webtest_questions (user_id, title, body, test_type, choices, answer, explanation, category, format, difficulty, time_limit)
values (@user_id, @title, @body, @test_type, @choices, @answer, @explanation, @category, @format, @difficulty, @time_limit)
returning *;

-- name: UpdateWebtestQuestion :one
update webtest_questions set
  title = @title, body = @body, test_type = @test_type, choices = @choices, answer = @answer, explanation = @explanation,
  category = @category, format = @format, difficulty = @difficulty, time_limit = @time_limit
where id = @id and user_id = @user_id
returning *;

-- name: DeleteWebtestQuestion :execrows
delete from webtest_questions where id = @id and user_id = @user_id;

-- name: ListWebtestAttempts :many
select * from webtest_attempts where question_id = @question_id and user_id = @user_id order by created_at desc;

-- name: CreateWebtestAttempt :one
insert into webtest_attempts (user_id, question_id, is_correct, time_spent)
values (@user_id, @question_id, @is_correct, @time_spent)
returning *;

-- name: DeleteOldWebtestAttempts :exec
-- 問題ごとに、新しい方から kept_rows 件を残して古いものを消す
delete from webtest_attempts
where id in (
  select old.id from webtest_attempts as old
  where old.question_id = @question_id and old.user_id = @user_id
  order by old.created_at desc, old.id
  offset sqlc.arg(kept_rows)
);
