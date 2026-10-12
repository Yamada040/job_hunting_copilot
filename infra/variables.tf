# ---- Terraform が各サービスを操作するための鍵 ----

variable "vercel_api_token" {
  description = "Vercel の Account Settings → Tokens で発行したトークン"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "リポジトリの Secrets とルールセットを書き換えられる GitHub のトークン（gh auth token の値でよい）"
  type        = string
  sensitive   = true
}

variable "vercel_deploy_token" {
  description = "GitHub Actions（release.yml）が Vercel の本番にデプロイするためのトークン。Terraform 用とは別に発行し、漏れたときに個別に止められるようにする"
  type        = string
  sensitive   = true
}

variable "supabase_access_token" {
  description = "Supabase の Access Token。Auth Config・Data API Config の Read-write 権限が必要"
  type        = string
  sensitive   = true
}

# ---- 管理対象の識別子（秘密ではない） ----

variable "vercel_project_id" {
  type    = string
  default = "prj_RvozCC16Ybrk0Ym5eT83w16WVHZh"
}

variable "vercel_team_id" {
  type    = string
  default = "team_SdVSOgPcd6j56NQxtmXBCgbR"
}

variable "github_owner" {
  type    = string
  default = "Yamada040"
}

variable "github_repository" {
  type    = string
  default = "job_hunting_copilot"
}

variable "supabase_project_ref" {
  description = "Supabase のプロジェクトID（URL の https://<ここ>.supabase.co）"
  type        = string
}

variable "site_url" {
  description = "本番のURL"
  type        = string
  default     = "https://job-seeker-gray.vercel.app"
}

# ---- アプリが使う値 ----

variable "supabase_publishable_key" {
  description = "Supabase の publishable キー（sb_publishable_）。ブラウザに公開される値"
  type        = string
}

variable "supabase_db_password" {
  description = "Supabase の DB のパスワード"
  type        = string
  sensitive   = true
}

variable "supabase_pooler_host" {
  description = "接続プーラーのホスト名（例: aws-0-ap-northeast-1.pooler.supabase.com）"
  type        = string
}

variable "supabase_migration_access_token" {
  description = "GitHub Actions がマイグレーションを適用するための Supabase の Access Token（Project Settings・API Keys・API Key Secrets・Connection Pooling の Read）"
  type        = string
  sensitive   = true
}

variable "ai_provider" {
  type    = string
  default = "gemini"
}

variable "ai_model" {
  description = "空なら、プロバイダーごとの既定のモデルを使う"
  type        = string
  default     = ""
}

variable "ai_provider_api_key" {
  type      = string
  sensitive = true
}

variable "tavily_api_key" {
  description = "AI企業分析のWeb検索。空なら検索せずに分析する"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp" {
  description = "問い合わせのメール送信。to が空なら問い合わせは 503 を返す"
  type = object({
    host = string
    port = string
    user = string
    pass = string
    to   = string
  })
  sensitive = true
}

variable "dev_admin_user_ids" {
  description = "開発者向けページを使えるユーザーのID（カンマ区切り）"
  type        = string
  default     = ""
}

variable "google_oauth" {
  description = "Google ログインの OAuth クライアント（Google Cloud Console で発行したもの）"
  type = object({
    client_id     = string
    client_secret = string
  })
  sensitive = true
}
