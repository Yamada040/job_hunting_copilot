-- name: HitRateLimit :one
-- 1つの文で「期間が切り替わっていれば数え直し、そうでなければ1つ足す」を行い、足した後の回数を返す。
-- 読んでから書く形にしないのは、同時にリクエストが来たときに数え漏れが起きないようにするため（docs/backend-design.md 6章）
insert into api_rate_limits (user_id, bucket, window_start, count)
values (@user_id, @bucket, @now, 1)
on conflict (user_id, bucket) do update set
  count        = case when api_rate_limits.window_start < @window_start then 1 else api_rate_limits.count + 1 end,
  window_start = case when api_rate_limits.window_start < @window_start then @now else api_rate_limits.window_start end
returning count;

-- name: HitAppRateLimit :one
-- アプリ全体で共有する枠を、HitRateLimit と同じく1つの文で数える
insert into api_app_rate_limits (bucket, window_start, count)
values (@bucket, @now, 1)
on conflict (bucket) do update set
  count        = case when api_app_rate_limits.window_start < @window_start then 1 else api_app_rate_limits.count + 1 end,
  window_start = case when api_app_rate_limits.window_start < @window_start then @now else api_app_rate_limits.window_start end
returning count;

-- name: RefundRateLimit :exec
-- HitRateLimit で数えた1回を戻す。数えた後に期間が切り替わって数え直していれば（window_start が数えた時刻より後）、新しい期間の回数なので戻さない
update api_rate_limits set count = count - 1
where user_id = @user_id and bucket = @bucket and window_start <= @hit_at and count > 0;

-- name: RefundAppRateLimit :exec
-- HitAppRateLimit で数えた1回を、RefundRateLimit と同じ条件で戻す
update api_app_rate_limits set count = count - 1
where bucket = @bucket and window_start <= @hit_at and count > 0;
