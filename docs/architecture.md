# アーキテクチャ概要

このドキュメントはコードベース全体の構造と主要フローを図解する。個別の詳細ルールは [CLAUDE.md](../CLAUDE.md) を、設計の判断とその理由は [backend-design.md](./backend-design.md) を、DBスキーマは [database-schema.md](./database-schema.md) を、テストの設計は [testing/](./testing/) を参照。

## 全体構成

Next.js は画面だけを担当し、データの読み書き・外部APIの呼び出し・ビジネスロジックはすべてバックエンドが担当する。ブラウザはバックエンドのAPIを直接呼ぶ（SPA型）。

```mermaid
flowchart TB
    subgraph Browser["ブラウザ"]
        UI["Next.js の画面<br/>(TanStack Query でデータを保持)"]
    end

    subgraph Vercel["Vercel（同じドメイン・東京リージョン）"]
        Next["Next.js<br/>(画面の配信・ログイン関連のみ)"]
        Go["Go API /v1<br/>(Vercel Services)"]
    end

    subgraph External["外部サービス"]
        Auth["Supabase Auth<br/>(Google OAuth)"]
        DB["Supabase Postgres"]
        AI["Gemini / GPT"]
        Tavily["Tavily<br/>(Web検索)"]
        SMTP["SMTP"]
    end

    UI -->|画面| Next
    UI -->|"/v1/...（Bearer JWT）"| Go
    UI -->|ログイン| Auth
    Go -->|"sqlc + pgx（接続プーラー）"| DB
    Go -->|JWKS で JWT を検証| Auth
    Go --> AI
    Go --> Tavily
    Go --> SMTP
```

`vercel.json` の Services が、`/v1/*` をバックエンドに、それ以外を Next.js に振り分ける。同じドメインなので CORS は不要。

## 認証フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Next as Next.js（proxy.ts）
    participant Auth as Supabase Auth
    participant Go as Go API

    User->>Auth: Google でログイン
    Auth-->>User: セッションCookie発行、/dashboard へ

    User->>Next: ページへアクセス
    Next->>Auth: セッションを確認
    alt 未ログイン かつ 保護ルート
        Next-->>User: /login へリダイレクト
    end

    User->>Go: GET /v1/me（Authorization: Bearer アクセストークン）
    Go->>Go: Supabase の公開鍵で署名・期限・発行者を検証
    Go-->>User: 本人のデータだけを返す
```

- バックエンドは検証したトークンからだけユーザーIDを取り出し、すべての問い合わせを `user_id` で絞り込む
- ログインが必要かどうかは `openapi.yaml` の `security` で決まる
- RLS は全テーブルで有効だが、ポリシーは作らない。Supabase の Data API を塞ぐためだけに使う

## リクエストの流れ（Go）

```mermaid
flowchart LR
    Req["リクエスト"] --> ID["リクエストID"] --> Log["アクセスログ"] --> Recover["panicからの復旧"] --> JWT["JWT検証"] --> Validate["OpenAPIによる検証"] --> Handler["handler"] --> Service["service<br/>(ドメインのルール)"] --> DB["sqlc の問い合わせ"]
    Service -.エラー.-> Problem["RFC 9457<br/>Problem Details"]
```

- 入力の形式（必須・文字数・enum）は `openapi.yaml` の定義でミドルウェアが弾き、ドメインのルールは service が確かめる
- エラーは `platform.Error` から Problem Details への変換を1か所で行う

## AI連携

```mermaid
sequenceDiagram
    participant UI as 画面
    participant Go as Go API
    participant DB as Postgres
    participant AI as Gemini / GPT
    participant Tavily as Tavily

    UI->>Go: POST /v1/companies/{id}/analysis
    Go->>DB: 企業を取得（本人のものか確認、分析済みでないか確認）
    Go->>DB: 回数制限を数える（1つのSQL文で加算と判定）
    Go->>AI: 保存済みのデータから組み立てた入力
    AI-->>Go: search_web を呼びたい
    Go->>Tavily: 検索
    Tavily-->>Go: 検索結果
    Go->>AI: 検索結果を渡す
    AI-->>Go: 分析結果
    Go->>DB: 分析結果を保存（企業ごとに1回）
    Go-->>UI: 分析結果を保存した企業
```

- AIへの入力は画面から受け取らず、バックエンドが保存済みのデータから組み立てる。結果の保存まで1つの操作で行う
- AIは時間がかかるため、DBのトランザクションの外で呼ぶ。「1回だけ」の制限は、保存時の条件（`ai_result is null`）で守る

## XP（ゲーミフィケーション）フロー

```mermaid
sequenceDiagram
    participant UI as 画面
    participant Go as Go API
    participant DB as Postgres

    UI->>Go: POST /v1/es-entries/{id}/submit
    Go->>DB: BEGIN
    Go->>DB: ESを提出済みにする
    Go->>DB: profiles の行をロック（FOR UPDATE）
    Go->>DB: 日次上限・初回のみ等のルールを確認
    Go->>DB: xp_logs に追加（同じ対象はユニーク制約で弾く）
    Go->>DB: profiles の XP とレベルを更新
    Go->>DB: COMMIT
    Go-->>UI: ES と xp（付与量・合計・レベル・レベルアップしたか）
    UI->>UI: xp でヘッダーのキャッシュを書き換え、レベルアップなら演出
```

## テスト・CI

```mermaid
flowchart LR
    PR["PR"] --> Checks["checks<br/>lint / type-check / format / APIの型の鮮度"]
    PR --> Build["build"]
    PR --> Unit["unit (Vitest)"]
    PR --> GoJob["go<br/>生成コードの鮮度 / golangci-lint / go test（実際のDB）"]
    PR --> E2E["e2e (Playwright)"]
    Merge["dev へのマージ"] --> Migrate["migrate<br/>本番にマイグレーションを適用"]
    Merge --> Deploy["Vercel が本番にデプロイ"]
```

- バックエンドのDBを使うテストは、Supabase の Postgres イメージをサービスコンテナとして起動し、マイグレーションを当ててから実行する
- E2E は本番ビルドの Next.js だけを起動しているため、バックエンドに移した画面のE2Eは一時停止している（CLAUDE.md の「テスト」参照）

## ディレクトリ構成の要点

```mermaid
flowchart TB
    Root["リポジトリのルート"] --> App["app/ (Next.js の画面)"]
    Root --> Lib["lib/"]
    Lib --> LibApi["api/ (生成した型・クライアント・TanStack Query のフック)"]
    Root --> Backend["backend/ (Go)"]
    Backend --> Spec["api/openapi.yaml (API仕様の正本)"]
    Backend --> Cmd["cmd/server/ (起動)"]
    Backend --> Internal["internal/ (機能ごとのパッケージ)"]
    Root --> Supa["supabase/"]
    Supa --> Mig["migrations/ (DBスキーマの正本)"]
    Root --> E2e["e2e/ (Playwright)"]
    Root --> Docs["docs/"]
```

## 既知の技術的負債（アーキテクチャ観点）

- E2E がバックエンドを起動しておらず、バックエンドに移した画面をE2Eで確かめられない
- `error.tsx` / `loading.tsx` / `not-found.tsx` がリポジトリ全体に1つも無く、例外がNext標準のクラッシュ画面になる（Issue #109）
- ライトテーマは `globals.css` の属性セレクタによるハードコード色の力技上書きで、脆弱な構造（Issue #116、#91で本格対応予定）
