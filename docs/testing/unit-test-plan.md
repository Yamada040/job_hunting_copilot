# 単体テスト計画

Go 移行（[backend-design.md](../backend-design.md)）で、ビジネスロジックとDBアクセスはすべて バックエンドに移った。そのため、テストの中心は Go 側にある。フロントエンド（Vitest）は、画面から使う小さな関数と、APIクライアントだけをテストする。

## Go（`go test`）

### 方針

- テストはテスト対象と同じパッケージに `*_test.go` で置く
- **DBを使う処理は、モックではなく実際の Postgres で確かめる**。`internal/dbtest` が `TEST_DATABASE_URL` のDBにつなぎ、テストごとに `auth.users` にユーザーを作って、終わったら削除する（アプリのテーブルは `on delete cascade` で一緒に消える）
  - 手元で `TEST_DATABASE_URL` が無いときはスキップし、CI では失敗させる（DBのテストが黙って実行されなくなるのを防ぐ）
  - CI は Supabase の Postgres イメージをサービスコンテナで起動し、`supabase/migrations/` を当ててから実行する
- 外部サービスは偽物に差し替える
  - Supabase Auth: `internal/auth/authtest`（JWKS を配信し、ES256 でトークンを署名する）
  - AI: `internal/ai/aitest`（受け取った入力を記録し、決まった文章を返す）
  - Gemini / GPT / Tavily の HTTP: `httptest.Server`（`internal/ai/client_test.go`）
  - SMTP: `contact.Handler.Send` に関数を渡す

### 必ず確かめること

| 観点             | 例                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| ユーザー間の分離 | 他人のIDで取得・更新・削除・提出すると 404 になる。他人の企業にESをひも付けられない                      |
| 同時実行         | XPの日次上限（10並列で5回まで）、回数制限（20並列で12回まで）                                            |
| ドメインのルール | 企業名の正規化と重複、ESの提出でXPが1回だけ付く、適性診断は1回だけ、AIへの入力に企業のメモを含めない     |
| エラーの形式     | 各 `platform.Kind` が正しいステータスと `code` の Problem Details になる。想定外のエラーの詳細は返さない |
| 認証             | 期限切れ・別の鍵・audience 違い・HS256 のトークンを拒否する。公開APIはトークン無しで通る                 |
| 入力の検証       | `openapi.yaml` の文字数制限や未知の項目を 400 で弾き、項目ごとのエラーを返す                             |

### 実行

```bash
cd backend
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go test ./...
```

## フロントエンド（Vitest）

### 方針

- テストファイルはテスト対象と同一ディレクトリに `*.test.ts` で置く
- 画面のコンポーネントのテストは書かず、画面から使う純粋な関数と、APIクライアントだけを対象にする

### 対象

| ファイル                                      | 確かめること                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api/client.ts`                           | Supabase のアクセストークンを Bearer で付ける（未ログインなら付けない）。エラーを `ApiError` にして、バックエンドの日本語のメッセージを取り出せる |
| `lib/xp/compute-level.ts`                     | レベルごとのXPのしきい値（ヘッダーの進捗バー）                                                                                                    |
| `app/_components/ai-result/sanitize.ts`       | AIの結果のMarkdownの記号を、画面で読める形に整える                                                                                                |
| `app/dashboard/_components/calendar/utils.ts` | 日付のキー（YYYY-MM-DD）の作り方                                                                                                                  |
| `lib/validation/schemas/contact.ts`           | 問い合わせフォームの入力チェック（使い勝手のため。正式な検証は Go）                                                                               |
| `lib/constants/site.ts`                       | サイトURLの決め方                                                                                                                                 |

### 実行

```bash
npm run test
```
