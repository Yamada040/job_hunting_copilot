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
- **スタイリング**: Tailwind CSS v4（`bg-linear-to-*` など推奨クラスを優先）+ shadcn/ui（`components/ui/`）
- **アニメーション**: Framer Motion
- **ホスティング**: Vercel（無料プラン）。Next.js と バックエンドを同じプロジェクトの Services で動かす（`vercel.json`）

- **エラーの通知**: Google Cloud の Error Reporting（バックエンドの想定外のエラーだけ。`backend/internal/errorreport`）

すべての依存サービスは**無料プラン**で運用している（有料インフラなし）。設計の詳細と、各判断で採らなかった案は [docs/backend-design.md](./docs/backend-design.md) を参照。

## 開発コマンド

**まとめて起動（mise）**: `mise install` でツールを入れ、`mise run dev` で手元の Supabase・バックエンド・Next.js をまとめて起動する（`mise.toml`）。接続先は手元の Supabase だけ。手元で Google ログインするときの設定は README の「セットアップ」を参照

**フロントエンド（リポジトリのルート）**:

```bash
npm run dev           # Next.js開発サーバーを起動 (localhost:3000)。/v1 は手元のバックエンドに転送する（バックエンドは別に起動する）
npm run build         # 本番ビルド
npm run lint          # ESLintを実行
npm run type-check    # TypeScriptの型チェック（変更後は必ず実行）
npm run format        # Prettierで整形
npm run format:check  # フォーマットをチェック
npm run generate:api  # openapi.yaml から lib/api/schema.d.ts を生成する（openapi.yaml を変えたら必ず実行）
npm run test          # Vitestで単体テストを実行
npm run test:e2e      # PlaywrightでE2Eテストを実行（手元の Supabase を起動しておく。Next.js とバックエンドは自動で起動する）
```

**バックエンド（`backend/`）**:

```bash
npm run supabase:signing-key  # 手元の Supabase の JWT 署名鍵（ES256）を作る。最初の1回だけ（リポジトリのルートで実行）
supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,mailpit,postgres-meta  # ローカルのDBと認証（リポジトリのルートで実行）
go generate ./...     # openapi.yaml と SQL（internal/db/queries）からGoのコードを生成する
go run ./cmd/server   # Goのサーバーを起動 (localhost:8080)。SUPABASE_URL と DATABASE_URL が必要
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go test ./...  # DBを使うテストも含めて実行
golangci-lint run ./...
```

**コミットの前に秘密の値を止めるフック**: `npm install` で lefthook がフックを入れる。コミットのたびに、gitleaks が中身を、`scripts/check-secret-files.sh` がファイル名（`.env*`・`mise.local.toml`・`*.tfvars`・`tfplan`・state など）を確かめ、秘密の値があれば止める。gitleaks は `brew install gitleaks` で入れる（無いとコミットできない）

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
- **ログインが必要なAPI**: `openapi.yaml` の `security` で決まる。公開APIは `security: []` を付ける（稼働確認・カレンダーの購読用URL・問い合わせ）。`proxy.ts` は `/v1` を素通しし、ログインの判断はバックエンドに任せる
- **認可**: バックエンドがすべての問い合わせを `user_id` で絞り込む。DBにアクセスする関数は `userID` を必須の引数にする。他人のデータは存在しないデータと同じく 404 にする
- **RLS**: 全テーブルで有効だが、ポリシーは1つも作らない。Supabase が公開している Data API を塞ぐためだけに使い、バックエンドはRLSの対象外のロールで接続する
- **Next.js の Supabase クライアント**: 認証（セッション・ログイン・ログアウト・メールアドレスの表示）にだけ使い、データの読み書きには使わない

### データ取得・状態管理

- **ブラウザからバックエンドのAPIを直接呼ぶ**（SPA型）: バックエンドのAPIは `/v1/...` で Next.js と同じドメインに置かれている。`lib/api/client.ts` の生成クライアント経由で呼び、`fetch()` を直接書かない
- **サーバーのデータのキャッシュには TanStack Query を使う**（`lib/api/<機能>.ts` のフック）。更新のレスポンスで関連するキャッシュを書き換える。XPが付く操作は、レスポンスの `xp` で `applyXpResult` を呼びヘッダーの表示を更新する
- 画面だけの状態は props と hooks で扱い、Redux・Zustand などの汎用の状態管理ライブラリは使わない
- **ブラウザに保存してよい値**: 業務データはバックエンドのDBを正とし、`localStorage` / `sessionStorage` に保存しない。ブラウザに残すのは、Supabase Auth のCookie（ログインセッション）だけ。端末ごとの表示設定が必要になったら、まず `profiles` の設定としてバックエンドに置けないか考える
- **ローカル開発**: `next dev` は `/v1` を `API_ORIGIN`（既定 `http://localhost:8080`）のバックエンドに転送する
- **ほかのアプリの Service Worker**: localhost:3000 はほかのアプリも使うので、そのアプリの Service Worker（Firebase の認証用など）が残っていると API の Authorization を書き換えられ、401 でログアウトされ続ける。開発環境でだけ `DevServiceWorkerReset`（`app/_components/dev-service-worker-reset.tsx`）が開いた時点ですべて解除して読み込み直す。このアプリは Service Worker を使わない

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
    ├── ratelimit/            # AI・問い合わせの回数制限（短時間の連打と1日の上限）と、AIの1日の利用料の上限
    ├── auth/                 # JWTの検証
    ├── errorreport/          # 想定外のエラーを Google Cloud の Error Reporting に送る
    └── platform/             # エラーの形式、ミドルウェア、トランザクション、DB接続
```

- **エラー**: service は `platform.Error`（`Kind` と日本語のメッセージ）を返し、RFC 9457（Problem Details）への変換は `platform.WriteError` の1か所で行う。想定外のエラー（500。panic を含む）は利用者に詳細を見せずログに出し、応答を書く前に Error Reporting にも送る（締め切り2秒。送るのはエラーの文言・スタックトレース・メソッド・伏せたパス・版だけで、本文・クエリ・ヘッダー・ユーザーIDは送らない）。`platform.Error` の想定内のもの（4xx・503）は送らない
- **入力の検証**: 形式（必須・文字数・enum）は `openapi.yaml` で定義し、ミドルウェアが仕様と照らし合わせて弾く。ドメインのルール（空白だけの企業名など）は service で確かめる
- **トランザクション**: 複数の書き込みは `platform.InTx` でまとめる。XPの付与は元の操作と同じトランザクションで行う
- **企業へのひも付け**: ES・面接ログ・予定を企業にひも付けるときは、`company.EnsureOwned` で本人の企業かを確かめる

### 問い合わせ

- `POST /v1/contact` はログインせずに使える。ログインしていなければ返信先のメールアドレスが必須で、ログイン中はログインのメールアドレスに返信する
- **回数制限**: ログイン中は1人1日5通、ログインしていなければIPごとに1日3通、アプリ全体で1日50通（送信用の Gmail が止められないように）。IPは `platform.ClientIP` が `X-Real-IP`（Vercel が上書きするので偽れない）から読む
- 画面では隠した欄（`website`）に値があれば、自動送信として送ったことにして捨てる
- SMTP の設定が無ければ 503 を返し、画面にはその旨を出す

### AI

すべてのAI呼び出しは `backend/internal/ai` を経由する。AIへの入力は画面から受け取らず、バックエンドが保存済みのデータから組み立て、結果の保存まで1つの操作で行う。

| 機能                      | API                                      | 再実行                   |
| ------------------------- | ---------------------------------------- | ------------------------ |
| AI添削（ES）              | `POST /v1/es-entries/{id}/reviews`       | 何度でも（履歴を残す）   |
| AI振り返り（面接ログ）    | `POST /v1/interview-logs/{id}/review`    | 何度でも（結果を上書き） |
| AI企業分析（Web検索あり） | `POST /v1/companies/{id}/analysis`       | 企業ごとに1回            |
| AI適性診断                | `POST /v1/aptitude-result/diagnosis`     | 1回                      |
| AI自己分析                | `POST /v1/self-analysis-result/analysis` | 1回                      |

- **回数制限**（`internal/ratelimit`）: 汎用のAIは1分12回・1日20回、企業分析は10分5回・1日3回（1人あたり、1日は日本時間）。それとは別に、アプリ全体の1日の上限（既定は汎用のAI 300回・企業分析10回。Tavily の月1,000回に収まる値）を全員で共有し、環境変数で変えられる。本人の上限で断ったリクエストは全体の枠を減らさない。AIの呼び出しが失敗したら1日の上限の1回を戻す（連打の上限と、企業分析の時間切れは戻さない。戻せるのは1人1日3回まで）
- **利用料の上限**（`internal/ratelimit`）: AIの応答のトークン数から料金を出してアプリ全体で1日ずつ足し、1日の上限（既定は $1）に達したら、AIを呼ぶ前に全体の上限と同じメッセージの 429 を返す。確かめるのは呼ぶ前、足すのは呼んだ後なので、同時に処理中の数件分は超えうる。足すのは `Limiter.TrackCost` で包んだ Generator が1か所で行い（失敗した呼び出しもトークン数が分かれば数える）、各サービスでは足さない
- **Web検索**: 企業分析の検索は1回の分析で最大3回（実際に Tavily を呼んだ回数で数える）。検索が使えないとき（キーが無い・無料枠が尽きた・失敗した）は検索なしで分析を続け、結果の先頭にその旨を書く
- **プロバイダー**: `AI_PROVIDER=gemini|gpt`。キーが無いときはAI機能だけが 503 を返す（仮の文章は保存されてしまうので返さない）
- **用語**: 添削結果・振り返り結果・分析結果・診断結果。「サマリー」「要約」「AI回答」は使わない。DBの列名はすべて `ai_result`

### データベース

スキーマは `supabase/migrations/` が正。master へのリリースで GitHub Actions（`release.yml`）が本番に適用し、成功してからデプロイする。**マイグレーションは1つ前のバージョンのコードでも動く形で書く**（適用してからデプロイが終わるまでは古いコードが新しいDBで動く。列の追加が先、不要な列の削除は次のリリース）。

- `profiles`: プロフィール、XP、レベル
- `companies`: 企業（中心のエンティティ）。正規化した企業名（`normalized_name`）はユーザーごとに一意
- `es_entries` / `interview_logs`: ES・面接ログ。`company_id` は必須
- `es_reviews`: ESのAI添削の履歴（設問ごとの3観点の点数と修正版）。点数の推移を見せるため、上書きせず1回ずつ残す（画面へ返すのは新しい10件）
- `calendar_events`: ユーザーが登録した予定（`company_id` は任意。`url` はオンライン面接などのリンクで、画面でリンクとして開くので http(s) に限る）。カレンダーにはESの締切も混ぜて表示する（バックエンドが組み立てる）
- `calendar_feeds`: カレンダーの購読用URL（iCal。Googleカレンダーなどが `GET /v1/calendar-feed/{token}` をログインせずに読む）。トークンはハッシュだけを保存し、URLは作ったときにだけ見せる
- `xp_logs`: XPの獲得履歴。`(user_id, action, ref_id)` がユニークで、同じ対象への二重付与をDBが防ぐ
- `aptitude_results` / `self_analysis_results`: 1人1件
- `webtest_questions` / `webtest_attempts`: ユーザーが自分で作る問題と解答の記録（解答の記録は問題ごとに新しい20件だけを残す）
- `api_rate_limits`: AI・問い合わせの回数制限の状態（1人ごと）
- `api_app_rate_limits`: ユーザーに結び付かない回数制限の状態（`bucket` ごとに1行）。AIと問い合わせのアプリ全体の上限と、ログインしていない人の問い合わせのIPごとの上限（`contact_daily:ip:<IPのハッシュ>`）。AIの1日の利用料（`ai_cost_microdollars_daily`）も、`count` にマイクロドルを足してここで数える

**1人あたりの件数の上限**: 企業500・ES500・面接ログ500・予定2000・Webテストの問題500（各 service の定数。超えると 409）。スクリプトでの量産から無料プランのDB（500MB）と、一覧のレスポンス（Vercel の上限4.5MB）を守るため。数えてから作るので同時に作ると数件超えうるが、許容している（`platform.CheckLimit`）。

**一覧は軽くする**: 一覧のAPIは長い列を返さない（企業は分析結果の冒頭200文字だけ、ESは設問・本文・メモなし、面接ログは質問と回答・振り返り結果なしで `reviewed` だけ）。全文は詳細のAPIで返す。予定は画面が期間（`from`・`to`）を渡し、カレンダーは表示している月と直近7日、ホームは直近7日を取る。

企業を削除すると、ひも付くES・面接ログ・予定も `on delete cascade` で消える。企業・ES・Webテストの問題への外部キーは `(id, user_id)` の組で張っており、他人の行にはDBがひも付けさせない（バックエンドの確かめの多層防御）。全テーブルが `auth.users` を `on delete cascade` で参照しており、退会（`DELETE /v1/me`）はバックエンドが `auth.users` の行を消すだけで、その人のデータをすべて消す。テーブルを足すときも `auth.users` への参照は必ず `on delete cascade` にする（`internal/profile` のテストが確かめる）。決まった値の列（選考状況など）は Postgres の enum で、値は英語のコード、日本語の表示名はフロントエンド（`lib/companies/stages.ts` など）に置く。

### APIルート

バックエンドのAPIの一覧は `backend/api/openapi.yaml` を参照する。Next.js に残っている Route Handler は次だけ:

- `/auth/callback`, `/auth/signout`: ログイン・ログアウト（Supabase Auth）
- `POST /api/test-support/login`: **E2Eテスト専用**。`E2E_TEST_MODE` と共有シークレットの多重ガード付きで、本番以外では絶対に有効化しない（後述の「テスト」セクション参照）

### UIパターン・スタイリング

**Tailwind v4の規約**:

- 推奨クラスを使う（`bg-linear-to-r`, `text-balance`, `text-wrap` など）
- v3の非推奨構文は警告を避けるため使わない
- 色: `app/globals.css` の shadcn の変数（白い面・空色の枠・濃い紺の文字）を使い、`text-foreground` / `text-muted-foreground` / `bg-card` / `border` などのトークンで書く。うまくいったことは `success`、カレンダーの曜日は `sunday` / `saturday`、予定の種類は `category-es` / `category-interview` / `category-intern` を使う。`text-white` や `bg-[#111111]` のような色の直書きはしない。ダークモードは用意していない

**shadcn/ui**:

- 部品は `./node_modules/.bin/shadcn add <名前>` で `components/ui/` に追加する。select はフォームの値を保つため Radix の Select ではなく `NativeSelect` を使う
- `window.confirm` は使わず `app/_components/confirm-dialog.tsx`（`ConfirmDialog`）、モーダルは `Dialog` を使う

**世界観**: 普通の就活アプリ。ゲームの世界観（クエスト・戦歴などの言葉、ドラクエ風の窓）は使わない。続けるきっかけとしてのXP・レベルと、ダッシュボードの3Dのカルーセルは、世界観に頼らない仕組みとして残している

- 見出しのあるパネルは `Card` + `CardHeader`（`CardTitle` に `h2`）+ `CardContent`。淡い面は `Card` の `variant="muted"`
- `Button` の種類は役割で選ぶ: 主な操作（保存・送信・作成・AIの実行）は `default`、補助の操作は `outline`、コピーなどの小さな操作は `ghost`、削除は `destructive`
- 用語: 「ES」「企業」「面接ログ」「予定」など、就活でそのまま通じる言葉を使う
- UIの動き・演出の提案は https://motion-reference.takayustudio.jp/ の事例から選ぶ（事例は `#motion=<ID>` で個別に開ける）

**コンポーネント構成**:

- ページレベルのレイアウト: `app/_components/layout/`（`AppLayout`）。ヘッダー（`AppHeader`、レベル・XPの表示）と下のメニュー（`Dock`）は、画面を移っても動きや演出が途切れないよう、各画面ではなくルートのレイアウト（`app/layout.tsx`）に置く
- レベル・XPの表示: `app/_components/xp-badge.tsx` と `app/_components/xp/`（紋章・ゲージ・レベルアップの演出）。ゲージの繰り上がりの順番は `lib/xp/gauge.ts`
- 機能単位: `_components/` サブディレクトリにコンポーネントをコロケーションする（例: `app/dashboard/_components/`）
- 共通部品: `app/_components/`（`CompanyPicker`: 企業の候補表示とその場での登録、`ApiErrorMessage`: バックエンドのエラーの表示、`ai-result/`: AIの結果の表示と、実行ボタンの近くに置く外部のAIへ送ることの説明（`AiSendingNote`）、`ConfirmDialog`、`legal/`: プライバシーポリシー・利用規約の枠とリンク）
- 操作の結果は、画面の右下に飛び出すアバター（`AvatarNotice`）が話す。成功は `showSuccessNotice("ESを提出しました")`、失敗は操作の名前を渡して `showFailureNotice("AI添削", error)`、AIの実行のように時間がかかるものは `noticeWhenDone(mutation.mutateAsync(), { action, done, link })` で呼ぶ（待つ間に画面を移っても届く）。話す成功は、AIの実行が終わったとき・取り消せない操作（提出・削除）・フォームの保存。結果がその場に出る操作（Webテストの解答など）では話さない。入力欄ごとのエラーと、フォームの保存・読み込みの失敗は、直す場所が分かるよう欄の下に出す（`ApiErrorMessage`）。ダイアログの中のエラーも、アバターが暗い幕に隠れるので欄の下に出す
- 画面の見出し: `AppLayout` の `headerTitle`・`headerDescription`・`headerActions`（主な操作）・`avatar`（見出しの横で話す `AvatarGuide`。話す一言は `app/_components/avatar/guide-messages.ts`）
- フォーム: `app/_components/form/`。保存のボタンは `FormActions`（画面の下に付いてくる帯）に置き、`useFormEditing` で変更の有無と ⌘/Ctrl + Enter の送信、`LeaveGuard` で保存せずに離れる前の確認をする。項目は `FormSection` で区切る
- 一覧: `app/_components/list/`（`ListToolbar`・`FilterChips` の絞り込み、`StaggerList`・`ListCardLink` のカード）。読み込み中は `loading-skeletons.tsx` の枠を出す
- `overflow-hidden` の中では `sticky` が効かないので、はみ出しを切るだけなら `overflow-clip` を使う
- shadcn/ui の部品: `components/ui/`
- APIのフック・型: `lib/api/`（生成した `schema.d.ts` とクライアント）

### ゲーミフィケーション（XPシステム）

- レベル = XP ÷ 25（切り捨て）＋ 1。合計XPとレベルは `profiles` に保存する
- 付与のルールは `backend/internal/xp`（画面ではなく操作に結び付ける）

| 操作                         | XP  | 制限                        |
| ---------------------------- | --- | --------------------------- |
| ESを提出する                 | 25  | 同じESには1回、1日5回まで   |
| 面接ログを作る               | 20  | 同じログには1回、1日5回まで |
| 企業を登録する               | 5   | 1日5回まで                  |
| 適性診断・自己分析に回答する | 15  | 初回だけ                    |
| Webテストの問題を作る        | 5   | 1日3回まで                  |
| Webテストに解答する          | 15  | 1日2回まで                  |

- 付与はプロフィールの行をロックしてから行い、同時にリクエストが来ても上限を超えない（1日は日本時間）

### よくあるページフロー

**ダッシュボード（`/dashboard`）**:

- 専用のAPIは作らず、各機能の一覧APIを組み合わせる
- 表示内容: 3Dのカルーセル（`MenuCarousel`）。回して選ぶと各画面を開く。カードには各機能の今の状況（件数・締切が近いESなどの急ぎのもの）と、今日の獲得XPを出す。情報は必要になったら足していく
- AI企業分析の入口: 見出しの下の入力欄（`QuickAnalysis`）に企業名を入れると、企業の登録とAI企業分析をまとめて始めて詳細の画面へ移る。左右に「AI分析がまだの企業」（その場で分析できる）と「最近のAI分析」を、2社ずつのページ送りで置く（狭い画面ではカルーセルの下）。分析の状態は `useCompanyAnalysis` で企業ごとに読み、どの画面から始めた分析も詳細の画面で「処理中」と出す
- カルーセルは CSS の3D変形で作る（three.js などは使わない）。←→キー・ドラッグ・ホイールで回せ、OS の「視差効果を減らす」設定では動きを止める
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

- shadcn/ui の部品（`Card`・`Button`）をベースにする
- 画面の移動は、画面下のアイコンの帯（`Dock`、`app/_components/layout/Dock.tsx`）で行う。よく使う画面（ホーム・ES・企業・予定・面接）へはどの画面からも1回で、ほかの画面へは「その他」のメニューから移れる。印を滑らせるため、各画面ではなくルートのレイアウト（`app/layout.tsx`）に置く

### テスト

**Goのテスト**:

- テストはテスト対象と同じパッケージに `*_test.go` で置く
- DBを使うテストは `internal/dbtest` で実際のDB（`supabase start` のもの）に、本番と同じ接続設定（`platform.OpenDB`）でつなぐ。`TEST_DATABASE_URL` が無いと手元ではスキップし、CIでは失敗させる
- ユーザー間でデータが混ざらないこと（他人のIDで取得・更新・削除できないこと）と、同時実行（XPの日次上限・回数制限）は、実際のDBで確かめる
- テスト用の偽物: `internal/auth/authtest`（Supabase Auth の代わりにJWTを発行）、`internal/ai/aitest`（AIの代わり）

**単体テスト（Vitest）**:

- テストファイルはテスト対象と同一ディレクトリにコロケーションし、`*.test.ts` サフィックスを使う
- 詳細な設計は `docs/testing/unit-test-plan.md` を参照

**E2Eテスト（Playwright）**:

- テストは `e2e/` ディレクトリに配置する
- **本番ではなく、手元・CIで起動した Supabase（`supabase start`）につなぐ**。`playwright.config.ts` が `supabase status` からURLとキーを読み、バックエンド（ポート8180）と本番ビルドの Next.js（ポート3100）を起動する
- 手元の Supabase は、本番と同じ ES256 でトークンに署名する（`npm run supabase:signing-key`。バックエンドは HS256 を受け付けない）
- `e2e/global-setup.ts` が、手元の Supabase の管理APIでテストユーザーA/Bを作り、`POST /api/test-support/login` でログインして `storageState` を保存する。このルートは `E2E_TEST_MODE=true` かつ `x-e2e-secret` ヘッダー一致のときだけ動く
- 本番の Supabase はメールアドレスでのログインを止めているので、本番ではテストユーザーでログインできない
- 本番Vercel環境変数には **`E2E_TEST_MODE` を絶対に設定しない**
- 詳細な設計・セキュリティ上の注意点は `docs/testing/e2e-test-plan.md` を参照

**CI（GitHub Actions）**:

- `.github/workflows/ci.yml`: PR ごとに、変わった場所に関係するジョブだけを走らせる（`changes` ジョブで判定し、関係ないジョブは `if:` でスキップ。スキップは必須チェックで成功扱い）
  - `checks`（lint/type-check/format:check/APIの型の鮮度）: 常に
  - `build`（本番ビルド確認）・`unit`（Vitest）: フロント・依存・ワークフローの変更
  - `backend`（生成コードの鮮度・golangci-lint・govulncheck・DBを使うテスト。DBは Supabase の Postgres イメージをサービスコンテナで起動）: `backend/`・`supabase/`・ワークフローの変更
  - `e2e`（Playwright。CIの中で Supabase を起動する）: `backend/`・`supabase/`・`e2e/`・依存・ワークフローの変更。フロントだけの変更では走らせない
  - `migrations`: リリース PR（dev → master）でだけ、本番に当たるマイグレーションを `supabase db push --dry-run` で表示する
- `.github/workflows/cache.yml`: dev への push で、Go のモジュールとビルド結果・npm・Playwright のブラウザのキャッシュを dev に置く（PR は自分のキャッシュと dev のキャッシュしか読めないため）
- `.github/workflows/release.yml`: master へのマージで、本番の Supabase にマイグレーションを適用し、成功したら Vercel の本番にデプロイし、日付のタグと GitHub Release を作る
- `.github/workflows/keepalive.yml`: 毎日 `/v1/health` を呼び、Supabase の無料プランの一時停止（7日間アクセスが無いと止まる）を防ぐ
- Dependabot: 依存パッケージの既知の脆弱性を検知し、直すPRを作る。普段のバージョンアップのPRは作らない（`infra/github.tf`）
- devブランチには必須ステータスチェック（`checks`/`build`/`unit`/`backend`/`e2e`）を要求し、マージ前にブランチを最新化するルールセットが設定されている。master はそれに `migrations` を加え、マージコミットでのマージだけを許す（`infra/github.tf`）

### ブランチ運用

- GitHubのデフォルトブランチは `dev`。通常の開発ブランチ・PRのbase・作業開始地点は `dev`。dev へのマージでは本番に出ない
- `master` は本番用のブランチ。dev からのリリース PR でだけ更新し、直接 push や急ぎの修正の直接のマージはしない
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
AI_APP_DAILY_LIMIT=300               # 汎用のAIのアプリ全体の1日の上限（無ければ300）
COMPANY_ANALYSIS_APP_DAILY_LIMIT=10  # 企業分析のアプリ全体の1日の上限（無ければ10）
AI_DAILY_BUDGET_USD=1                    # AIの利用料のアプリ全体の1日の上限（ドル。無ければ1）
AI_INPUT_PRICE_PER_MILLION_TOKENS=0.30   # 入力100万トークンあたりの料金（ドル。無ければ gemini-2.5-flash の0.30）
AI_OUTPUT_PRICE_PER_MILLION_TOKENS=2.50  # 出力（思考を含む）100万トークンあたりの料金（ドル。無ければ gemini-2.5-flash の2.50）
SMTP_HOST=smtp.gmail.com    # 問い合わせ（ポート465は最初からTLS、それ以外はSTARTTLS）
SMTP_PORT=465
SMTP_USER=your-mail@example.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=contact-destination@example.com
DEV_ADMIN_USER_IDS=uuid1,uuid2   # 開発者向けページを使えるユーザー
GOOGLE_ERROR_REPORTING_CREDENTIALS={...}   # Error Reporting に書き込むサービスアカウントの鍵（JSON。送り先は鍵のプロジェクト）。無ければエラーを送らない
```

E2Eテストの値（テストユーザーなど）は、手元の Supabase 専用の固定値として `e2e/support/local-supabase.ts` に置いている。

**GitHub Actions（マイグレーションの適用）**: `SUPABASE_ACCESS_TOKEN`（Project Settings・API Keys・API Key Secrets・Connection Pooling の Read 権限）、`SUPABASE_DB_PASSWORD`、`SUPABASE_PROJECT_ID`

### Supabase Auth設定

`infra/supabase.tf` で管理する。Site URL は本番のURL、Redirect URL は本番の `/auth/callback`・`/dashboard` だけ（localhost は手元の Supabase の `supabase/config.toml` で許可する）。Google ログインの OAuth クライアントも同じファイルで設定する。

Data API（PostgREST）は使わないため、公開するスキーマを `graphql_public` だけにして `public` を外している。

### ページ構成

**レイアウト階層**:

- `/` — ホーム（MVP紹介、ログイン/サインアップ導線）
- `/login` — Google OAuthの入口
- `/auth/callback` — OAuthコールバックハンドラ。codeをセッションに交換する
- `/dashboard` — メインハブ（保護ルート）。カルーセルのメニュー
- `/calendar` — カレンダー（予定とESの締切）
- `/es`, `/es/new`, `/es/[id]` — ES管理
- `/companies`, `/companies/new`, `/companies/[id]` — 企業管理
- `/interviews`, `/interviews/new`, `/interviews/[id]` — 面接ログ
- `/self-analysis` — 自己分析アンケート＋AI自己分析
- `/aptitude` — 適性チェック＋AI診断
- `/webtests`, `/webtests/new`, `/webtests/[id]`, `/webtests/[id]/edit` — Webテスト練習
- `/profile` — プロフィール/目標の編集、退会（成功したらこの端末からログアウトして `/` へ移る）
- `/contact` — 問い合わせ（ログインせずに使える。LP のフッターとログイン画面からリンクする。ログインしていなければヘッダーはロゴとログインへの入口だけにし、下のメニューは出さない）
- `/developer` — 開発者向け管理ページ（バックエンドが `DEV_ADMIN_USER_IDS` で判定し、開発者以外には403。開発者にだけ下のメニューにリンクが出る）
- `/privacy` — プライバシーポリシー（預かる情報、外部のAIなどへ送る内容、削除の依頼方法）。Google の OAuth 同意画面にもこのURLを登録する
- `/terms` — 利用規約

すべての保護ページ: 未ログインなら `proxy.ts` が `/login` へリダイレクトする。ログインせずに開けるページ（`/`・`/login`・`/privacy`・`/terms`・`/contact`）は `lib/constants/routes.ts` の `PUBLIC_PAGES` にまとめ、ログインしていなければヘッダー（レベル・XP）と下のメニューを出さない。自分で枠を描くページ（`/contact` 以外）は `STANDALONE_PAGES` にも入れ、ログイン中でも出さない。外部のAIへ送る内容を変えたら、`/privacy` も直す

### 型定義

- フロントのAPIの型: `lib/api/schema.d.ts`（`openapi.yaml` から生成。手で編集しない）
- GoのAPIの型: `backend/internal/openapi/openapi.gen.go`（生成）
- GoのDBの型: `backend/internal/db/`（sqlc が生成）

### デプロイ

- **Vercel**（無料のHobbyプラン）でホスティング。`vercel.json` の Services で、`/v1/*` を Go、それ以外を Next.js に振り分ける。関数のリージョンは東京（`hnd1`、Supabase と同じ）
- 本番へのデプロイはリリース（下記）でだけ行う。Vercel の Git 連携はどのブランチもデプロイしない（`vercel.json` の `git.deploymentEnabled`）。マイグレーションとの順番を保証するため、`release.yml` が Vercel CLI でデプロイする
- 環境変数は `infra/vercel.tf`（Terraform）で設定する。変えたら Vercel で再デプロイするまで反映されない
- プレビューのデプロイは作らない（`vercel.json` の `git.deploymentEnabled: false`）。プレビューが本番の Supabase・AI のキーにつながると、レビュー前のコードが利用者のデータに届くため。秘密の環境変数も production にだけ置く。変更は手元（`mise run dev`）と CI の E2E で確かめる

### リリース

dev にたまった変更を、まとめて master に出す。

1. 手元で dev の最新を確かめる: `supabase db reset` でマイグレーションを最初から当て直し、`mise run dev` で主要な画面を一通り触る
2. dev → master のリリース PR を作る（`gh pr create --base master --head dev`）。CIの `migrations` ジョブの Summary に、本番に当たるマイグレーションが出る
3. マージコミットでマージする。`release.yml` が、マイグレーション → 本番へのデプロイ → 日付のタグ（`v2026.10.12`、同じ日の2回目からは `.2`）と GitHub Release の作成を順に行う

- **戻すとき**: コードは Vercel の Instant Rollback で1つ前のデプロイに戻す。マイグレーションは戻さない（1つ前のコードでも動く形で書いているため）
- **急ぎの修正**: いつも通り dev に PR を出してマージし、すぐにリリースする。master に直接入れない

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
