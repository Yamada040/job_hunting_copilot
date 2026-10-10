# infra

Vercel・GitHub・Supabase の設定を Terraform で管理する（Issue #134）。

| ファイル      | 管理するもの                                                          |
| ------------- | --------------------------------------------------------------------- |
| `vercel.tf`   | Vercel の環境変数（Production・Preview・Development）                 |
| `github.tf`   | GitHub Actions の Secrets、dev ブランチのルールセット                 |
| `supabase.tf` | Supabase Auth（サイトURL・リダイレクト先・Google ログイン）、Data API |

管理しないもの: Supabase のプロジェクト自体と JWT の署名鍵、Google Cloud の OAuth クライアント、外部APIのキーの発行、state を置くバケット。

## 秘密の値と state

- 秘密の値は `terraform.tfvars`（git に入れない）に置き、手元から `apply` する。パスワードマネージャーにも控えておく
- state は Supabase Storage の非公開バケットに置く（S3 互換。`use_lockfile` で同時実行を防ぐ）。state には秘密の値が平文で入るため、バケットは必ず非公開にする

## 初回の準備

1. Supabase の Storage で非公開のバケット `terraform-state` を作る
2. Project Settings → Storage → S3 Connection で S3 のアクセスキーを発行する
3. Vercel の Account Settings → Tokens でトークンを発行する
4. Supabase の Account → Access Tokens で、Auth Config・Data API Config の Read-write 権限のトークンを発行する
5. `backend.hcl.example` と `terraform.tfvars.example` をコピーして値を埋める
6. Vercel に画面で登録した環境変数を消す（Terraform は既存の同名の変数を取り込めないため。デプロイ済みの本番は影響を受けない）

```bash
cd infra
export AWS_ACCESS_KEY_ID=...      # 2 のアクセスキー
export AWS_SECRET_ACCESS_KEY=...
terraform init -backend-config=backend.hcl
```

## 変更の適用

```bash
terraform plan
terraform apply
```

環境変数を変えたら、Vercel で再デプロイするまで本番には反映されない。
