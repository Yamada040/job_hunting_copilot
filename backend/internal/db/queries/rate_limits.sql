-- name: HitRateLimit :one
-- 1つの文で「期間が切り替わっていれば数え直し、そうでなければ1つ足す」を行い、足した後の回数を返す。
-- 読んでから書く形にしないのは、同時にリクエストが来たときに数え漏れが起きないようにするため（docs/backend-design.md 6章）
insert into api_rate_limits (user_id, bucket, window_start, count)
values (@user_id, @bucket, @now, 1)
on conflict (user_id, bucket) do update set
  count        = case when api_rate_limits.window_start < @window_start then 1 else api_rate_limits.count + 1 end,
  window_start = case when api_rate_limits.window_start < @window_start then @now else api_rate_limits.window_start end
returning count;

-- name: AddAppRateLimit :one
-- アプリ全体で共有する枠に amount を足し、HitRateLimit と同じく1つの文で数える。回数の枠は1ずつ、AIの利用料の枠はマイクロドルを足す
insert into api_app_rate_limits (bucket, window_start, count)
values (@bucket, @now, @amount::integer)
on conflict (bucket) do update set
  count        = case when api_app_rate_limits.window_start < @window_start then @amount::integer else api_app_rate_limits.count + @amount::integer end,
  window_start = case when api_app_rate_limits.window_start < @window_start then @now else api_app_rate_limits.window_start end
returning count;

-- name: GetAppRateLimit :one
-- アプリ全体で共有する枠の、今の期間の量を返す。期間が切り替わっていれば（行が無ければ）0
select coalesce((
  select count from api_app_rate_limits
  where bucket = @bucket and window_start >= @window_start
), 0)::integer as count;
