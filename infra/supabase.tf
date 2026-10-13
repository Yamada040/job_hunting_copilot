# Supabase の認証（Google ログイン・リダイレクト先）と Data API の設定

resource "supabase_settings" "this" {
  project_ref = var.supabase_project_ref

  auth = jsonencode({
    site_url = var.site_url
    uri_allow_list = join(",", [
      "${var.site_url}/auth/callback",
      "${var.site_url}/dashboard",
      "http://localhost:3000/auth/callback",
      "http://localhost:3000/dashboard",
    ])
    external_google_enabled   = true
    external_google_client_id = var.google_oauth.client_id
    external_google_secret    = var.google_oauth.client_secret
    # ログインは Google だけ。メールアドレスでのログインを開けておくと、公開されている publishable キーで
    # 誰でもアカウントを量産でき、1人あたりのAIの回数制限が意味を失う（E2E は手元・CIの Supabase で行う）
    external_email_enabled = false
  })

  # データの読み書きはすべてバックエンドが行い、Data API（PostgREST）は使わない。
  # Data API を止める設定は API に無いため、テーブルの無い graphql_public だけを公開して public を外す
  # （RLS のポリシーも無いので二重に閉じる。docs/backend-design.md 6章）
  api = jsonencode({
    db_schema = "graphql_public"
  })
}
