terraform {
  required_version = ">= 1.11"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.21"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.11"
    }
  }

  # state は Supabase Storage（S3互換）の非公開バケットに置く（サービスを増やさないため）。
  # 接続先は backend.hcl、S3用のキーは環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY で渡す（README.md 参照）
  backend "s3" {
    key          = "job-seeker/terraform.tfstate"
    use_lockfile = true

    # AWS 以外の S3 互換ストレージなので、AWS 固有の確認は飛ばす
    use_path_style              = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}
