# Vercel の環境変数。Next.js とバックエンドで共有される（CLAUDE.md の「環境変数」参照）

locals {
  supabase_url = "https://${var.supabase_project_ref}.supabase.co"
  # Supabase の接続プーラー（トランザクションモード、ポート6543）。パスワードの記号は URL エンコードする
  database_url = "postgresql://postgres.${var.supabase_project_ref}:${urlencode(var.supabase_db_password)}@${var.supabase_pooler_host}:6543/postgres"

  # ブラウザに公開される値・秘密でない設定。手元の開発（vercel env pull）でも使えるよう development にも置く。
  # どちらも空の値は登録しない（Vercel が空の値を受け付けないため。未設定の機能は 503 を返す）
  public_env = { for k, v in {
    NEXT_PUBLIC_SUPABASE_URL             = local.supabase_url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
    NEXT_PUBLIC_SITE_URL                 = var.site_url
    SUPABASE_URL                         = local.supabase_url
    AI_PROVIDER                          = var.ai_provider
    DEV_ADMIN_USER_IDS                   = var.dev_admin_user_ids
  } : k => v if v != "" }

  # 秘密の値。Vercel の画面でも読めないようにする（sensitive は development に置けない）。
  # 本番だけに置く。プレビューのデプロイは止めているが、手でデプロイしても本番の DB・AI のキーに届かないようにする
  secret_env = { for k, v in {
    DATABASE_URL                       = local.database_url
    AI_MODEL                           = var.ai_model
    AI_PROVIDER_API_KEY                = var.ai_provider_api_key
    TAVILY_API_KEY                     = var.tavily_api_key
    SMTP_HOST                          = var.smtp.host
    SMTP_PORT                          = var.smtp.port
    SMTP_USER                          = var.smtp.user
    SMTP_PASS                          = var.smtp.pass
    CONTACT_TO_EMAIL                   = var.smtp.to
    GOOGLE_ERROR_REPORTING_CREDENTIALS = var.google_error_reporting_credentials
  } : k => v if v != "" }
}

resource "vercel_project_environment_variable" "public" {
  # 値ではなく名前で for_each する（秘密の値を含む map をそのまま for_each に渡せないため）
  for_each = nonsensitive(toset(keys(local.public_env)))

  project_id = var.vercel_project_id
  key        = each.key
  value      = local.public_env[each.key]
  target     = ["production", "preview", "development"]
  sensitive  = false
}

resource "vercel_project_environment_variable" "secret" {
  for_each = nonsensitive(toset(keys(local.secret_env)))

  project_id = var.vercel_project_id
  key        = each.key
  value      = local.secret_env[each.key]
  target     = ["production"]
  sensitive  = true
}

moved {
  from = vercel_project_environment_variable.production_secret["GOOGLE_ERROR_REPORTING_CREDENTIALS"]
  to   = vercel_project_environment_variable.secret["GOOGLE_ERROR_REPORTING_CREDENTIALS"]
}
