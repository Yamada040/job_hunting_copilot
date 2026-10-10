# CLAUDE.md

このファイルは、このリポジトリで作業する際にClaude Code（claude.ai/code）へ向けたガイダンスを提供する。

## プロジェクト概要

**就活copilot** は、日本の就活生向けのMVP（Next.js の画面 + バックエンドのAPI + Supabase）。ES（エントリーシート）作成、企業管理、面接ログ、自己分析ツールを1つのダッシュボードに集約し、AIによる添削とゲーミフィケーション（XP/レベリング）を提供する。

**中核の目的**: 分断された就活タスクを1つの統合されたインターフェースに集約し、摩擦（フリクション）を取り除くこと。このアプリの価値は「もっと頑張らせること」ではなく、進捗を妨げる「フリクションタイム」を取り除くことにある。

## 技術スタック

- **フロントエンド**: Next.js 16（App Router）+ TypeScript + React 19。画面だけを担当する（SPA型）
- **バックエンド**: Go（`backend/`）。DBアクセス・外部API（AI・Tavily・SMTP）・ビジネスロジックのすべてを担当する
- **API契約**: OpenAPI（`backend/api/openapi.yaml` が唯一の正）。Go のサーバー（oapi-codegen）と TypeScript の型（openapi-typescript）を生成する
- **DB・認証**: Supabase（Postgres と Auth のみ。Google OAuth）。スキーマは Supabase CLI のマイグレーションで管理する
- **データ取得**: TanStack Query + openapi-fetch（`lib/api/`）
- **DBアクセス（Go）**: sqlc + pgx
- **スタイリング**: Tailwind CSS v4（`bg-linear-to-*` など推奨クラスを優先）
- **アニメーション**: Framer Motion
- **ホスティング**: Vercel（無料プラン）。Next.js と バックエンドを同じプロジェクトの Services で動かす（`vercel.json`）

すべての依存サービスは**無料プラン**で運用している（有料インフラなし）。設計の詳細と、各判断で採らなかった案は [docs/backend-design.md](./docs/backend-design.md) を参照。

## 開発コマンド

**フロントエンド（リポジトリのルート）**:

```bash
npm run dev           # Next.js開発サーバーを起動 (localhost:3000)。/v1 は手元のバックエンドに転送する
npm run build         # 本番ビルド
npm run lint          # ESLintを実行
npm run type-check    # TypeScriptの型チェック（変更後は必ず実行）
npm run format        # Prettierで整形
npm run format:check  # フォーマットをチェック
npm run generate:api  # openapi.yaml から lib/api/schema.d.ts を生成する（openapi.yaml を変えたら必ず実行）
npm run test          # Vitestで単体テストを実行
npm run test:e2e      # PlaywrightでE2Eテストを実行
```

**バックエンド（`backend/`）**:

```bash
supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,mailpit,postgres-meta  # ローカルのDB（リポジトリのルートで実行）
go generate ./...     # openapi.yaml と SQL（internal/db/queries）からGoのコードを生成する
go run ./cmd/server   # Goのサーバーを起動 (localhost:8080)。SUPABASE_URL と DATABASE_URL が必要
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go test ./...  # DBを使うテストも含めて実行
golangci-lint run ./...
```

**コミット前には必ず以下を実行する**:

```bash
npm run type-check && npm run lint && npm run format:check && npm run test
(cd backend && go generate ./... && golangci-lint run ./... && go test ./...)
```

`openapi.yaml` を変えたら `go generate`（Go側）と `npm run generate:api`（TypeScript側）の両方を実行する。生成コードが古いと CI が失敗する。

## コアアーキテクチャ

```mermaid
flowchart LR
    Browser["ブラウザ<br/>(Next.js の画面 + TanStack Query)"]
    Go["Go API /v1<br/>(Vercel Services)"]
    Supabase["Supabase<br/>(Postgres / Auth)"]
    AI["Gemini / GPT / Tavily"]
    SMTP["SMTP"]

    Browser -->|"Authorization: Bearer (Supabase JWT)"| Go
    Browser -->|ログイン| Supabase
    Go --> Supabase
    Go --> AI
    Go --> SMTP
```

詳細な図解は [docs/architecture.md](./docs/architecture.md) を参照。

### 認証・認可

- **ログイン**: Supabase Auth（Google OAuth）。Next.js の `proxy.ts` がページへのアクセス時にセッションを確かめ、未ログインなら `/login` へリダイレクトする
- **バックエンドの認証**: ブラウザが Supabase のアクセストークンを `Authorization: Bearer` で送り、バックエンドが Supabase の公開鍵（JWKS）で検証する（`backend/internal/auth`）。ユーザーIDは検証したトークンからだけ取り出し、リクエストの本文やURLのIDは信用しない
- **ログインが必要なAPI**: `openapi.yaml` の `security` で決まる。公開APIは `security: []` を付ける
- **認可**: バックエンドがすべての問い合わせを `user_id` で絞り込む。DBにアクセスする関数は `userID` を必須の引数にする。他人のデータは存在しないデータと同じく 404 にする
- **RLS**: 全テーブルで有効だが、ポリシーは1つも作らない。Supabase が公開している Data API を塞ぐためだけに使い、バックエンドはRLSの対象外のロールで接続する
- **Next.js の Supabase クライアント**: 認証（セッション・ログイン・ログアウト・メールアドレスの表示）にだけ使い、データの読み書きには使わない

### データ取得・状態管理

- **ブラウザからバックエンドのAPIを直接呼ぶ**（SPA型）: バックエンドのAPIは `/v1/...` で Next.js と同じドメインに置かれている。`lib/api/client.ts` の生成クライアント経由で呼び、`fetch()` を直接書かない
- **サーバーのデータのキャッシュには TanStack Query を使う**（`lib/api/<機能>.ts` のフック）。更新のレスポンスで関連するキャッシュを書き換える。XPが付く操作は、レスポンスの `xp` で `applyXpResult` を呼びヘッダーの表示を更新する
- 画面だけの状態は props と hooks で扱い、Redux・Zustand などの汎用の状態管理ライブラリは使わない
- **ローカル開発**: `next dev` は `/v1` を `API_ORIGIN`（既定 `http://localhost:8080`）のバックエンドに転送する

### バックエンド（Go）の構成

```
backend/
├── api/openapi.yaml          # API仕様（唯一の正）
├── cmd/server/               # 起動・設定の読み込み・依存の組み立て
└── internal/
    ├── <機能>/               # company, es, interview, calendar, assessment, webtest, profile, contact, admin, health
    │   ├── service.go        # ドメインのルール
    │   └── handler.go        # HTTPの入出力（生成された StrictServerInterface を実装）
    ├── db/                   # sqlc が internal/db/queries/*.sql から生成した問い合わせ
    ├── xp/                   # XPの付与（各機能のサービスが、元の操作と同じトランザクションで呼ぶ）
    ├── ai/                   # Gemini / GPT / Tavily とプロンプト
    ├── ratelimit/            # AIの回数制限（短時間の連打と1日の上限）
    ├── auth/                 # JWTの検証
    └── platform/             # エラーの形式、ミドルウェア、トランザクション、DB接続
```

- **エラー**: service は `platform.Error`（`Kind` と日本語のメッセージ）を返し、RFC 9457（Problem Details）への変換は `platform.WriteError` の1か所で行う。想定外のエラーは利用者に詳細を見せずログにだけ出す
- **入力の検証**: 形式（必須・文字数・enum）は `openapi.yaml` で定義し、ミドルウェアが仕様と照らし合わせて弾く。ドメインのルール（空白だけの企業名など）は service で確かめる
- **トランザクション**: 複数の書き込みは `platform.InTx` でまとめる。XPの付与は元の操作と同じトランザクションで行う
- **企業へのひも付け**: ES・面接ログ・予定を企業にひも付けるときは、`company.EnsureOwned` で本人の企業かを確かめる

### AI

すべてのAI呼び出しは `backend/internal/ai` を経由する。AIへの入力は画面から受け取らず、バックエンドが保存済みのデータから組み立て、結果の保存まで1つの操作で行う。

| 機能                      | API                                      | 再実行                   |
| ------------------------- | ---------------------------------------- | ------------------------ |
| AI添削（ES）              | `POST /v1/es-entries/{id}/review`        | 何度でも（結果を上書き） |
| AI振り返り（面接ログ）    | `POST /v1/interview-logs/{id}/review`    | 何度でも（結果を上書き） |
| AI企業分析（Web検索あり） | `POST /v1/companies/{id}/analysis`       | 企業ごとに1回            |
| AI適性診断                | `POST /v1/aptitude-result/diagnosis`     | 1回                      |
| AI自己分析                | `POST /v1/self-analysis-result/analysis` | 1回                      |

- **回数制限**（`internal/ratelimit`）: 汎用のAIは1分12回・1日20回、企業分析は10分5回・1日3回（1人あたり、1日は日本時間）
- **プロバイダー**: `AI_PROVIDER=gemini|gpt`。キーが無いときはAI機能だけが 503 を返す（仮の文章は保存されてしまうので返さない）
- **用語**: 添削結果・振り返り結果・分析結果・診断結果。「サマリー」「要約」「AI回答」は使わない。DBの列名はすべて `ai_result`

### データベース

スキーマは `supabase/migrations/` が正。dev へのマージで GitHub Actions（`migrate.yml`）が本番に適用する。**マイグレーションは1つ前のバージョンのコードでも動く形で書く**（列の追加が先、不要な列の削除は次のリリース）。

- `profiles`: プロフィール、XP、レベル
- `companies`: 企業（中心のエンティティ）。正規化した企業名（`normalized_name`）はユーザーごとに一意
- `es_entries` / `interview_logs`: ES・面接ログ。`company_id` は必須
- `calendar_events`: ユーザーが登録した予定（`company_id` は任意）。カレンダーにはESの締切も混ぜて表示する（バックエンドが組み立てる）
- `xp_logs`: XPの獲得履歴。`(user_id, action, ref_id)` がユニークで、同じ対象への二重付与をDBが防ぐ
- `aptitude_results` / `self_analysis_results`: 1人1件
- `webtest_questions` / `webtest_attempts`: ユーザーが自分で作る問題と解答の記録
- `api_rate_limits`: AIの回数制限の状態

企業を削除すると、ひも付くES・面接ログ・予定も `on delete cascade` で消える。決まった値の列（選考状況など）は Postgres の enum で、値は英語のコード、日本語の表示名はフロントエンド（`lib/companies/stages.ts` など）に置く。

### APIルート

バックエンドのAPIの一覧は `backend/api/openapi.yaml` を参照する。Next.js に残っている Route Handler は次だけ:

- `/auth/callback`, `/auth/signout`: ログイン・ログアウト（Supabase Auth）
- `POST /api/test-support/login`: **E2Eテスト専用**。`E2E_TEST_MODE` と共有シークレットの多重ガード付きで、本番以外では絶対に有効化しない（後述の「テスト」セクション参照）

### UIパターン・スタイリング

**Tailwind v4の規約**:

- 推奨クラスを使う（`bg-linear-to-r`, `text-balance`, `text-wrap` など）
- v3の非推奨構文は警告を避けるため使わない
- テーマ: ライトモードは `<html>` に `theme-light` クラスを付与する方式（`app/globals.css` で属性セレクタによる上書きを実装。ハードコードされた色クラスに強く依存しており脆弱— Issue #116参照）

**DQ風UI**（ドラゴンクエスト風）:

- `dq-window`, `dq-title`, `dq-item`: クエストログパネル
- `dq-button`, `dq-button-secondary`: スタイル付きボタン
- `dq-menu-item`: ホバー状態を持つメニュー項目（左向き三角 `▶` がホバーで右へ移動）
- 用語: 「クエスト」「ログ」「追加へ」など

**コンポーネント構成**:

- ページレベルのレイアウト: `app/_components/layout/`（`AppLayout`）
- 機能単位: `_components/` サブディレクトリにコンポーネントをコロケーションする（例: `app/dashboard/_components/`）
- 共通部品: `app/_components/`（`CompanyPicker`: 企業の候補表示とその場での登録、`ApiErrorMessage`: バックエンドのエラーの表示、`ai-result/`: AIの結果の表示）
- APIのフック・型: `lib/api/`（生成した `schema.d.ts` とクライアント）

### ゲーミフィケーション（XPシステム）

- レベル = XP ÷ 25（切り捨て）＋ 1。合計XPとレベルは `profiles` に保存する
- 付与のルールは `backend/internal/xp`（画面ではなく操作に結び付ける）

| 操作                         | XP  | 制限                      |
| ---------------------------- | --- | ------------------------- |
| ESを提出する                 | 25  | 同じESには1回、1日5回まで |
| 面接ログを作る               | 20  | 同じログには1回           |
| 企業を登録する               | 5   | 1日5回まで                |
| 適性診断・自己分析に回答する | 15  | 初回だけ                  |
| Webテストの問題を作る        | 5   | 1日3回まで                |
| Webテストに解答する          | 15  | 1日2回まで                |

- 付与はプロフィールの行をロックしてから行い、同時にリクエストが来ても上限を超えない（1日は日本時間）

### よくあるページフロー

**ダッシュボード（`/dashboard`）**:

- 専用のAPIは作らず、プロフィール・カレンダー・ES・面接ログ・XP履歴の一覧APIを組み合わせる
- 表示内容: サマリーカード、カレンダー、目標/軸エディタ、直近のアクティビティ
- 保護ルート: 未ログインならリダイレクト

**ES管理**（`/es`, `/es/new`, `/es/[id]`）:

- 企業を選んで作成（常に下書き）、設問と回答・本文を編集、削除
- 提出は取り消せない（提出でXP付与）
- AI添削
- 締切（`deadline`）はカレンダーに表示されるが、`calendar_events` には保存せずバックエンドがESから組み立てる

**企業管理**（`/companies`, `/companies/new`, `/companies/[id]`）:

- 選考状況（未エントリー／エントリー済み／書類選考／面接中／内定／不合格／辞退）を追跡
- マイページID・URLを保存し、一覧からマイページを開ける
- 志望度・お気に入り（一覧で絞り込める）
- AI企業分析（企業ごとに1回）
- 削除すると、ひも付くES・面接ログ・予定も消える

**ログイン（`/login`）**:

- Supabaseログイン（Google OAuth）へリダイレクトする
- 成功すると Supabase が `/auth/callback` → `/dashboard` へリダイレクトする

### 開発ルール

**原則**:

- **YAGNI**: 今必要なものだけ実装する。投機的な機能追加はしない
- **KISS**: 複雑な解決策よりシンプルな解決策を優先する
- **DRY**: 重複したロジックは共有のutils/componentsへ抽出する
- **型安全性**: 変更後は必ず `npm run type-check`（Goは `go vet`）を実行する
- **バリデーション**: ユーザー入力を信用せず、必ずバックエンドで検証する（`openapi.yaml` の制約と service のルール）。フロントの検証は使い勝手のためだけ

**実装上の注意**:

- データの読み書きとビジネスロジックはバックエンドに置き、Next.js には置かない
- API を足すときは `openapi.yaml` から書き、生成したインターフェースをバックエンドで実装する
- AI呼び出しは必ず `backend/internal/ai` を経由する
- AIキーやSMTPの設定が無くても、その機能だけが 503 を返し、サーバーは止めない
- コンポーネントは最大200行程度。それを超えたら分割する
- ディレクトリ構造: 種類別ではなく機能/責務別にグルーピングする

**UIの一貫性**:

- DQ-window/buttonクラスをベースにする
- メニュー項目は左向き三角のホバー効果を使う（ボックス状のボタンにしない）
- クエスト/ログ用語を使う

### テスト

**Goのテスト**:

- テストはテスト対象と同じパッケージに `*_test.go` で置く
- DBを使うテストは `internal/dbtest` で実際のDB（`supabase start` のもの）につなぐ。`TEST_DATABASE_URL` が無いと手元ではスキップし、CIでは失敗させる
- ユーザー間でデータが混ざらないこと（他人のIDで取得・更新・削除できないこと）と、同時実行（XPの日次上限・回数制限）は、実際のDBで確かめる
- テスト用の偽物: `internal/auth/authtest`（Supabase Auth の代わりにJWTを発行）、`internal/ai/aitest`（AIの代わり）

**単体テスト（Vitest）**:

- テストファイルはテスト対象と同一ディレクトリにコロケーションし、`*.test.ts` サフィックスを使う
- 詳細な設計は `docs/testing/unit-test-plan.md` を参照

**E2Eテスト（Playwright）**:

- テストは `e2e/` ディレクトリに配置する
- 認証は「本番Supabaseに固定のテストユーザーA/Bを作成して流用」する方式。テストユーザーは Supabase の画面であらかじめ作っておく（全権限の secret キーをCIに置かないため）。`POST /api/test-support/login` が `E2E_TEST_MODE=true` かつ `x-e2e-secret` ヘッダー一致という多重ガードの下でのみ、固定ユーザーのセッションを発行する
- `e2e/global-setup.ts` がテストユーザーA/Bでログインし、`storageState` を保存する
- E2Eは本番ビルドの Next.js だけを起動しており、`/v1` を受けるバックエンドがいない。バックエンドに移した画面（ESなど）のE2Eは、E2Eでバックエンドを起動する方法を決めてから書き直す
- 本番Vercel環境変数には **`E2E_TEST_MODE` を絶対に設定しない**
- 詳細な設計・セキュリティ上の注意点は `docs/testing/e2e-test-plan.md` を参照

**CI（GitHub Actions）**:

- `.github/workflows/checks.yml`: 静的チェック（`checks` = lint/type-check/format:check/APIの型の鮮度）+ `build`（本番ビルド確認）
- `.github/workflows/test.yml`: `unit`（Vitest）+ `check-e2e-secrets`/`e2e`（Playwright。E2E用Secretsが未設定の間は自動スキップ）
- `.github/workflows/go.yml`: `go`（生成コードの鮮度・golangci-lint・DBを使うテスト。DBは Supabase の Postgres イメージをサービスコンテナで起動）
- `.github/workflows/migrate.yml`: dev へのマージで、本番の Supabase にマイグレーションを適用する
- devブランチには必須ステータスチェック（`checks`/`build`/`unit`/`go`）を要求し、マージ前にブランチを最新化するルールセットが設定されている（`infra/github.tf`）

### ブランチ運用

- GitHubのデフォルトブランチは `dev`。通常の開発ブランチ・PRのbase・CI保護ルール・Vercelの本番デプロイは `dev` を基準にする。
- `master` は現在の開発フローでは使用しない。古い履歴が残っているだけの非アクティブブランチとして扱い、新規PRのbaseや作業開始地点にしない。
- リリース運用を `master` に戻す場合は、事前に運用方針をIssue/PRで明文化し、`dev` との差分を解消してから切り替える。
- ローカル作業を始めるときは `git checkout dev && git pull --rebase origin dev` で最新の `dev` から作業ブランチを作成する。

### 環境変数

Vercel の環境変数は Next.js と バックエンドで共有される。Vercel の環境変数・GitHub Actions の Secrets・Supabase Auth の設定は `infra/`（Terraform）で管理しており、画面から直接変えない（`infra/README.md` 参照）。

**Next.js**:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # sb_publishable_ で始まるキー
NEXT_PUBLIC_SITE_URL=https://job-seeker-gray.vercel.app (ローカルは localhost:3000)
API_ORIGIN=http://localhost:8080 (ローカル開発のみ。/v1 の転送先)
```

**バックエンド（必須）**:

```env
SUPABASE_URL=https://<プロジェクトID>.supabase.co   # JWTの公開鍵（JWKS）の取得元
DATABASE_URL=postgresql://...:6543/postgres         # Supabase の接続プーラー（トランザクションモード）
```

**バックエンド（任意。無ければその機能だけが 503 を返す）**:

```env
AI_PROVIDER=gemini|gpt
AI_PROVIDER_API_KEY=...
AI_MODEL=gemini-2.5-flash (Geminiの場合) または gpt-4o-mini (GPTの場合)
AI_ENDPOINT=https://api.openai.com/v1/chat/completions (カスタムOpenAIエンドポイントを使う場合)
AI_API_VERSION=v1beta (Geminiの場合)
TAVILY_API_KEY=...          # AI企業分析のWeb検索
SMTP_HOST=smtp.gmail.com    # 問い合わせ（ポート465は最初からTLS、それ以外はSTARTTLS）
SMTP_PORT=465
SMTP_USER=your-mail@example.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=contact-destination@example.com
DEV_ADMIN_USER_IDS=uuid1,uuid2   # 開発者向けページを使えるユーザー
```

**E2Eテスト用（任意。ローカルは `.env.test.local` に設定。CIはGitHub Secretsから注入）**:

```env
E2E_TEST_MODE=true
E2E_TEST_SECRET=...
E2E_TEST_USER_EMAIL=...
E2E_TEST_USER_PASSWORD=...
E2E_TEST_USER2_EMAIL=...
E2E_TEST_USER2_PASSWORD=...
```

**GitHub Actions（マイグレーションの適用）**: `SUPABASE_ACCESS_TOKEN`（Project Settings・API Keys・API Key Secrets・Connection Pooling の Read 権限）、`SUPABASE_DB_PASSWORD`、`SUPABASE_PROJECT_ID`

### Supabase Auth設定

`infra/supabase.tf` で管理する。Site URL は本番のURL、Redirect URL は本番と `http://localhost:3000` の `/auth/callback`・`/dashboard`。Google ログインの OAuth クライアントも同じファイルで設定する。

Data API（PostgREST）は使わないため、公開するスキーマを `graphql_public` だけにして `public` を外している。

### ページ構成

**レイアウト階層**:

- `/` — ホーム（MVP紹介、ログイン/サインアップ導線）
- `/login` — Google OAuthの入口
- `/auth/callback` — OAuthコールバックハンドラ。codeをセッションに交換する
- `/dashboard` — メインハブ（保護ルート）
- `/es`, `/es/new`, `/es/[id]` — ES管理
- `/companies`, `/companies/new`, `/companies/[id]` — 企業管理
- `/interviews`, `/interviews/new`, `/interviews/[id]` — 面接ログ
- `/self-analysis` — 自己分析アンケート＋AI自己分析
- `/aptitude` — 適性チェック＋AI診断
- `/webtests`, `/webtests/new`, `/webtests/[id]` — Webテスト練習
- `/profile` — プロフィール/目標の編集
- `/contact` — フィードバックフォーム（ログイン済みユーザー向け）
- `/developer` — 開発者向け管理ページ（バックエンドが `DEV_ADMIN_USER_IDS` で判定し、開発者以外には403。開発者にだけサイドバーにリンクが出る）

すべての保護ページ: 未ログインなら `proxy.ts` が `/login` へリダイレクトする。

### 型定義

- フロントのAPIの型: `lib/api/schema.d.ts`（`openapi.yaml` から生成。手で編集しない）
- GoのAPIの型: `backend/internal/openapi/openapi.gen.go`（生成）
- GoのDBの型: `backend/internal/db/`（sqlc が生成）

### デプロイ

- **Vercel**（無料のHobbyプラン）でホスティング。`vercel.json` の Services で、`/v1/*` を Go、それ以外を Next.js に振り分ける。関数のリージョンは東京（`hnd1`、Supabase と同じ）
- `dev` ブランチへのマージで自動デプロイ
- 環境変数は `infra/vercel.tf`（Terraform）で設定する。変えたら Vercel で再デプロイするまで反映されない
- ブランチごとにプレビューデプロイが作成される

### 既知のパターン・落とし穴

**避けるべきこと**:

- Next.js から Supabase のデータを直接読み書きする（RLSのポリシーが無いので読めない。データは必ずバックエンドのAPI経由）
- `user_id` で絞り込まない問い合わせを書く（RLSは守ってくれない）
- 画面から受け取った文章をAIに渡す・AIの結果として保存する
- `openapi.yaml` を変えて、生成コードを更新し忘れる
- マイグレーションで、今動いているコードが使っている列をいきなり削除する

**やるべきこと**:

- 他人のデータを取得・更新・削除できないことを、実際のDBのテストで確かめる
- 複数の書き込みは `platform.InTx` で1つのトランザクションにまとめる
- 更新のレスポンスで TanStack Query のキャッシュを書き換え、取り直しの通信を減らす

## 他ツール向けの参照

`AGENTS.md`（Codex/Cursor等が参照する規約ファイル）はこのファイルを `@CLAUDE.md` で参照する形にしており、内容はここに一本化されている。二重メンテナンスを避けるため、開発ルールの追記・変更は本ファイルにのみ行うこと。
