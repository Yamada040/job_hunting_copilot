-- name: UpsertCalendarFeed :one
-- 作り直すときは同じ行のトークンを置き換え、古いURLを使えなくする
insert into calendar_feeds (user_id, token_hash)
values (@user_id, @token_hash)
on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now()
returning created_at;

-- name: GetCalendarFeed :one
select created_at from calendar_feeds where user_id = @user_id;

-- name: GetCalendarFeedUserID :one
select user_id from calendar_feeds where token_hash = @token_hash;

-- name: DeleteCalendarFeed :exec
delete from calendar_feeds where user_id = @user_id;
