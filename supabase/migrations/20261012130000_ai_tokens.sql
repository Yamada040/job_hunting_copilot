-- AIの呼び出しで使ったトークン数を、AIの結果と同じ行に残し、開発者ダッシュボードで機能ごとに集計する。
-- 結果を上書きする機能（面接の振り返り）や1回だけの機能では、最新の1回分だけが残る。
-- 思考（thinking）・推論のトークンは料金上は出力として数えられるので、出力に含める。
alter table public.companies add column ai_input_tokens integer, add column ai_output_tokens integer;
alter table public.es_reviews add column ai_input_tokens integer, add column ai_output_tokens integer;
alter table public.interview_logs add column ai_input_tokens integer, add column ai_output_tokens integer;
alter table public.aptitude_results add column ai_input_tokens integer, add column ai_output_tokens integer;
alter table public.self_analysis_results add column ai_input_tokens integer, add column ai_output_tokens integer;
