# GitHub Actions の Secrets と、dev・master ブランチのルールセット

locals {
  # どちらのブランチでも、PR のマージ前に通っていなければならない ci.yml のジョブ
  required_checks = ["checks", "build", "unit", "backend", "e2e"]

  actions_secrets = {
    # build・e2e ジョブが Next.js をビルド・起動するのに使う
    NEXT_PUBLIC_SUPABASE_URL             = local.supabase_url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = var.supabase_publishable_key
    # release.yml が本番にマイグレーションを当てる。ci.yml の migrations ジョブがリリース PR で当たるものを表示する
    SUPABASE_ACCESS_TOKEN = var.supabase_migration_access_token
    SUPABASE_DB_PASSWORD  = var.supabase_db_password
    SUPABASE_PROJECT_ID   = var.supabase_project_ref
    # release.yml が Vercel の本番にデプロイする
    VERCEL_TOKEN      = var.vercel_deploy_token
    VERCEL_ORG_ID     = var.vercel_team_id
    VERCEL_PROJECT_ID = var.vercel_project_id
  }
}

resource "github_actions_secret" "this" {
  for_each = nonsensitive(toset(keys(local.actions_secrets)))

  repository  = var.github_repository
  secret_name = each.key
  value       = local.actions_secrets[each.key]
}

# 既存のルールセット（画面で作ったもの）を取り込んで管理する
import {
  to = github_repository_ruleset.default_branch
  id = "${var.github_repository}:11721838"
}

resource "github_repository_ruleset" "default_branch" {
  name        = "branch protection"
  repository  = var.github_repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    pull_request {
      allowed_merge_methods             = ["merge", "squash", "rebase"]
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = false
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }

    # マージ前にブランチを dev の最新に追従させる（組み合わせて初めて壊れる変更に気づくため）
    required_status_checks {
      strict_required_status_checks_policy = true

      dynamic "required_check" {
        for_each = local.required_checks
        content {
          context        = required_check.value
          integration_id = 15368 # GitHub Actions
        }
      }
    }
  }
}

# 本番用の master ブランチ。dev からのリリース PR でだけ更新する
resource "github_repository_ruleset" "production_branch" {
  name        = "production branch"
  repository  = var.github_repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/master"]
      exclude = []
    }
  }

  rules {
    deletion         = true
    non_fast_forward = true

    # スカッシュやリベースでは dev のコミットが master に入らず、次のリリース PR で同じ変更が衝突するため、マージコミットだけにする
    pull_request {
      allowed_merge_methods             = ["merge"]
      required_approving_review_count   = 0
      dismiss_stale_reviews_on_push     = false
      require_code_owner_review         = false
      require_last_push_approval        = false
      required_review_thread_resolution = false
    }

    # リリースのマージコミットは master にだけあり dev には戻さないので、dev に master の最新を取り込むことは求めない
    required_status_checks {
      strict_required_status_checks_policy = false

      dynamic "required_check" {
        for_each = concat(local.required_checks, ["migrations"])
        content {
          context        = required_check.value
          integration_id = 15368 # GitHub Actions
        }
      }
    }
  }
}

# 依存パッケージ（npm・Go・GitHub Actions）の既知の脆弱性を検知し、直すPRを Dependabot に作らせる。
# 普段のバージョンアップのPRは作らせない（dependabot.yml を置かない）。脆弱性の修正だけに絞り、PRを増やさないため
resource "github_repository_vulnerability_alerts" "this" {
  repository = var.github_repository
  enabled    = true
}

resource "github_repository_dependabot_security_updates" "this" {
  repository = var.github_repository
  enabled    = true

  # 修正のPRは、脆弱性のアラートが有効でないと作れない
  depends_on = [github_repository_vulnerability_alerts.this]
}
