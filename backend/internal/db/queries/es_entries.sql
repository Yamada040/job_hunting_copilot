-- name: ListEsEntries :many
-- company_id を渡すと、その企業のESだけに絞り込む
select sqlc.embed(es_entries), companies.name as company_name
from es_entries
join companies on companies.id = es_entries.company_id
where es_entries.user_id = @user_id
  and (sqlc.narg(company_id)::uuid is null or es_entries.company_id = sqlc.narg(company_id)::uuid)
order by es_entries.updated_at desc
limit sqlc.arg(max_rows);

-- name: GetEsEntry :one
select sqlc.embed(es_entries), companies.name as company_name
from es_entries
join companies on companies.id = es_entries.company_id
where es_entries.id = @id and es_entries.user_id = @user_id;

-- name: CreateEsEntry :one
insert into es_entries (user_id, company_id, position, title, content_md, questions, tags, deadline, memo)
values (@user_id, @company_id, @position, @title, @content_md, @questions, @tags, @deadline, @memo)
returning id;

-- name: UpdateEsEntry :execrows
-- PATCH なので、set_* が true の項目だけを書き換える
update es_entries set
  company_id = case when @set_company_id::boolean then sqlc.narg(company_id)::uuid   else company_id end,
  position   = case when @set_position::boolean   then sqlc.narg(position)           else position end,
  title      = case when @set_title::boolean      then sqlc.narg(title)::text        else title end,
  content_md = case when @set_content_md::boolean then sqlc.narg(content_md)         else content_md end,
  questions  = case when @set_questions::boolean  then sqlc.narg(questions)::jsonb   else questions end,
  tags       = case when @set_tags::boolean       then sqlc.narg(tags)::text[]       else tags end,
  deadline   = case when @set_deadline::boolean   then sqlc.narg(deadline)::date     else deadline end,
  memo       = case when @set_memo::boolean       then sqlc.narg(memo)               else memo end
where id = @id and user_id = @user_id;

-- name: SubmitEsEntry :execrows
update es_entries set status = 'submitted' where id = @id and user_id = @user_id;

-- name: DeleteEsEntry :execrows
delete from es_entries where id = @id and user_id = @user_id;

-- name: CompanyExists :one
-- ESなどを企業にひも付ける前に、その企業が本人のものかを確かめる（他人の企業IDを指定されても、ひも付けさせない）
select exists (select 1 from companies where id = @id and user_id = @user_id);
