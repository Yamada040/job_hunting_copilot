-- name: LockProfileXP :one
-- 同じユーザーのXP付与を1つずつ処理させるため、プロフィールの行をロックする（docs/backend-design.md 6章）
select xp from profiles where id = @id for update;

-- name: CountXPLogsSince :one
select count(*) from xp_logs where user_id = @user_id and action = @action and created_at >= @since;

-- name: HasXPLog :one
select exists (select 1 from xp_logs where user_id = @user_id and action = @action);

-- name: InsertXPLog :execrows
-- 同じ対象（ref_id）への二重付与は、ユニーク制約に任せて0行で返す
insert into xp_logs (user_id, xp, action, ref_id) values (@user_id, @xp, @action, @ref_id)
on conflict (user_id, action, ref_id) do nothing;

-- name: SetProfileXP :exec
update profiles set xp = @xp, level = @level where id = @id;
