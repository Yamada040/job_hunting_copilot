-- name: GetAptitudeResult :one
select * from aptitude_results where user_id = @user_id;

-- name: CreateAptitudeResult :execrows
-- 1人1回だけ（docs/backend-design.md 3章）。2回目はユニーク制約に任せて0行で返す
insert into aptitude_results (user_id, answers) values (@user_id, @answers) on conflict (user_id) do nothing;

-- name: SetAptitudeAiResultOnce :execrows
update aptitude_results set ai_result = @ai_result where user_id = @user_id and ai_result is null;

-- name: GetSelfAnalysisResult :one
select * from self_analysis_results where user_id = @user_id;

-- name: CreateSelfAnalysisResult :execrows
insert into self_analysis_results (user_id, answers) values (@user_id, @answers) on conflict (user_id) do nothing;

-- name: SetSelfAnalysisAiResultOnce :execrows
update self_analysis_results set ai_result = @ai_result where user_id = @user_id and ai_result is null;
