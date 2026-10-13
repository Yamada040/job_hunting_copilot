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

  # state は手元の terraform.tfstate に置く（git の対象外）。state には秘密の値が平文で入るため、
  # 置き場所を terraform.tfvars と同じ手元だけにする。リモート（Supabase Storage）に置いていたときは、
  # 漏れた service_role キーでバケットを読める経路があった
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}
