-- name: ListCompanies :many
-- query を渡すと、正規化した企業名の部分一致で絞り込む（企業の候補の表示に使う）
-- 分析結果は長いので、一覧では冒頭だけを返す（全文は詳細で返す）。sqlc は left() の結果を null にならない型にするため、未分析は空文字で返す
select id, name, industry, url, mypage_id, mypage_url, memo, stage, preference, favorite,
  coalesce(left(ai_result, 200), '')::text as ai_result_preview, created_at, updated_at
from companies
where user_id = @user_id
  and (sqlc.narg(query)::text is null or normalized_name like '%' || sqlc.narg(query)::text || '%')
order by updated_at desc;

-- name: CountCompanies :one
select count(*) from companies where user_id = @user_id;

-- name: GetCompany :one
select * from companies where id = @id and user_id = @user_id;

-- name: CreateCompany :one
insert into companies (user_id, name, normalized_name, industry, url, mypage_id, mypage_url, memo, stage, preference, favorite)
values (@user_id, @name, @normalized_name, @industry, @url, @mypage_id, @mypage_url, @memo, @stage, @preference, @favorite)
returning *;

-- name: UpdateCompany :one
-- PATCH なので、set_* が true の項目だけを書き換える
update companies set
  name            = case when @set_name::boolean       then @name::text            else name end,
  normalized_name = case when @set_name::boolean       then @normalized_name::text else normalized_name end,
  industry        = case when @set_industry::boolean   then sqlc.narg(industry)    else industry end,
  url             = case when @set_url::boolean        then sqlc.narg(url)         else url end,
  mypage_id       = case when @set_mypage_id::boolean  then sqlc.narg(mypage_id)   else mypage_id end,
  mypage_url      = case when @set_mypage_url::boolean then sqlc.narg(mypage_url)  else mypage_url end,
  memo            = case when @set_memo::boolean       then sqlc.narg(memo)        else memo end,
  stage           = case when @set_stage::boolean      then sqlc.narg(stage)::company_stage else stage end,
  preference      = case when @set_preference::boolean then sqlc.narg(preference) else preference end,
  favorite        = case when @set_favorite::boolean   then @favorite::boolean     else favorite end
where id = @id and user_id = @user_id
returning *;

-- name: DeleteCompany :execrows
delete from companies where id = @id and user_id = @user_id;

-- name: SetCompanyAiResultOnce :execrows
-- 企業分析は企業ごとに1回だけ（docs/backend-design.md 3章）。同時に2回実行されても、先に保存した方だけを残す
update companies set ai_result = @ai_result, ai_input_tokens = @ai_input_tokens, ai_output_tokens = @ai_output_tokens where id = @id and user_id = @user_id and ai_result is null;
