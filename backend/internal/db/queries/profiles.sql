-- name: CreateProfileIfMissing :exec
-- ログイン済みでもプロフィールの行がまだ無いユーザーがいるため、最初の取得のときに作る
insert into profiles (id) values (@id) on conflict (id) do nothing;

-- name: GetProfile :one
select * from profiles where id = @id;

-- name: UpdateProfile :one
-- PATCH なので、set_* が true の項目だけを書き換える（値に null を渡せば空にできる）
update profiles set
  full_name       = case when @set_full_name::boolean       then sqlc.narg(full_name)       else full_name end,
  university      = case when @set_university::boolean      then sqlc.narg(university)      else university end,
  faculty         = case when @set_faculty::boolean         then sqlc.narg(faculty)         else faculty end,
  avatar_id       = case when @set_avatar_id::boolean       then sqlc.narg(avatar_id)       else avatar_id end,
  target_industry = case when @set_target_industry::boolean then sqlc.narg(target_industry) else target_industry end,
  career_axis     = case when @set_career_axis::boolean     then sqlc.narg(career_axis)     else career_axis end,
  goal_state      = case when @set_goal_state::boolean      then sqlc.narg(goal_state)      else goal_state end
where id = @id
returning *;
