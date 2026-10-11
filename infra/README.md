# infra

Vercel・GitHub・Supabase の設定を Terraform で管理する（Issue #134）。

| ファイル      | 管理するもの                                                                      |
| ------------- | --------------------------------------------------------------------------------- |
| `vercel.tf`   | Vercel の環境変数（Production・Preview・Development）                             |
| `github.tf`   | GitHub Actions の Secrets、dev ブランチのルールセット、Dependabot の脆弱性の検知  |
| `supabase.tf` | Supabase Auth（サイトURL・リダイレクト先・ログイン方法）、Data API の公開スキーマ |

管理しないもの: Supabase のプロジェクト自体と JWT の署名鍵・APIキー、Google Cloud の OAuth クライアント、外部APIのキーの発行。

## 秘密の値と state

- 秘密の値は `terraform.tfvars` に、state は `terraform.tfstate` に置く。どちらも手元のPCだけに置き、git の対象外にしている
- state にも秘密の値が平文で入る。以前は Supabase Storage に置いていたが、置き場所が増えるぶん漏れる経路も増えるため、手元に移した
- 値はパスワードマネージャーにも控えておく（GitHub の Secrets などは後から読めないため）
- `plan -out` で保存したファイルにも秘密の値が平文で入る。`apply` したら消す
- コミットの前のフックが、これらのファイルをファイル名で止める（`scripts/check-secret-files.sh`）

## 初回の準備

1. Vercel の Account Settings → Tokens で、このプロジェクトだけを対象にしたトークンを発行する
2. Supabase の Account → Access Tokens で、Auth Config・Data API Config・Project の Read-write 権限のトークンを発行する
3. `terraform.tfvars.example` をコピーして `terraform.tfvars` を作り、値を埋める
4. Vercel に画面で登録した環境変数を消す（Terraform は既存の同名の変数を取り込めないため。デプロイ済みの本番は影響を受けない）

```bash
cd infra
terraform init
```

## 変更の適用

```bash
terraform plan
terraform apply
```

環境変数を変えたら、Vercel で再デプロイするまで本番には反映されない。

## state を失ったとき

PC を変えたなどで state が無いと、Terraform は作成済みのものを知らない状態になる。次の手順で作り直す。

- Vercel の環境変数を画面で消してから `apply` する（同名の変数があると作成に失敗するため）
- GitHub の Secrets は上書き、ルールセットは `github.tf` の `import` で取り込み、Supabase の設定は上書きになるので、そのまま `apply` してよい
