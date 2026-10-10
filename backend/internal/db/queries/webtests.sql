-- name: ListWebtestQuestions :many
select id, title, test_type, category, format, difficulty, time_limit, created_at
from webtest_questions
where user_id = @user_id and (sqlc.narg(test_type)::text is null or test_type = sqlc.narg(test_type)::text)
order by created_at desc;

-- name: GetWebtestQuestion :one
select * from webtest_questions where id = @id and user_id = @user_id;

-- name: CreateWebtestQuestion :one
insert into webtest_questions (user_id, title, body, test_type, choices, answer, explanation, category, format, difficulty, time_limit)
values (@user_id, @title, @body, @test_type, @choices, @answer, @explanation, @category, @format, @difficulty, @time_limit)
returning *;

-- name: ListWebtestAttempts :many
select * from webtest_attempts where question_id = @question_id and user_id = @user_id order by created_at desc;

-- name: CreateWebtestAttempt :one
insert into webtest_attempts (user_id, question_id, is_correct, time_spent)
values (@user_id, @question_id, @is_correct, @time_spent)
returning *;
