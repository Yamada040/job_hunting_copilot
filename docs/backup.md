# 本番の DB のバックアップ

Supabase の無料プランは自動のバックアップが使えないため、GitHub Actions でダンプを取り、暗号化して成果物に残す。

| いつ                                   | ワークフロー  | 成果物の名前                          | 保存期間 |
| -------------------------------------- | ------------- | ------------------------------------- | -------- |
| 毎日 3:00（日本時間）・手動            | `backup.yml`  | `db-backup-<実行ID>`                  | 7日      |
| リリースでマイグレーションを当てる直前 | `release.yml` | `db-backup-before-release-<コミット>` | 30日     |

- 中身は `roles.sql`（ロール）・`schema.sql`（スキーマ）・`data.sql`（データ。`auth` スキーマのユーザーを含む）を tar にまとめ、`gpg --symmetric`（AES256）で暗号化したもの
- パスフレーズは Secret の `BACKUP_PASSPHRASE`（`infra/github.tf`）。未設定だとバックアップが失敗し、リリースも止まる
- 退会したユーザーのデータも、保存期間が切れるまではバックアップに残る

## 復元

新しく作った Supabase のプロジェクトに流し込むのを基本にする（今の本番に重ねると、残っている行と衝突する）。

```bash
# 1. 成果物を落とす（実行IDは Actions の画面か gh run list --workflow backup.yml で調べる）
gh run download <実行ID> -n <成果物の名前>

# 2. 復号して展開する（パスフレーズを聞かれる）
gpg --decrypt -o db-backup.tar.gz db-backup.tar.gz.gpg
tar -xzf db-backup.tar.gz

# 3. 流し込む。接続先は Supabase の Connect → Session pooler（または Direct）の URL
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file db-backup/roles.sql \
  --file db-backup/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file db-backup/data.sql \
  --dbname "$DATABASE_URL"
```

`session_replication_role = replica` は、流し込む間だけ外部キーとトリガーを止め、表の順番に関係なく入れるため。

新しいプロジェクトに移したら、`infra/terraform.tfvars` の `supabase_project_ref` などを差し替えて `terraform apply` し、Vercel で再デプロイする。終わったら、展開したファイルは消す（平文の個人情報が入っている）。
