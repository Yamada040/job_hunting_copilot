# 就活copilot (MVP)

就活の ES 作成・添削、企業管理、進捗確認を AI とゲーミフィケーションで支援する Next.js + Supabase 製の MVP です。Gemini/GPT は環境変数で差し替え可能なラッパー構成です。
このアプリの本質的価値は

就活を頑張らせること
ではなく
就活を“やらない時間”を消していくこと
にあります。

## 制作背景

### 原体験 — 情報が分散している

本アプリは、開発者自身が学部 3 年の就活中に抱えた一次体験から生まれました。当時は **ES 管理は Word、企業管理は Excel**、締切や面接のメモは別のツール……と、就活に必要な情報が複数のプラットフォームに散らばっていました。

その結果、

- 必要な情報を探すために **複数のツール／マイページを行き来する煩雑さ** が常につきまとう。
- 全体像（応募状況・締切・次にやること）が一覧できず、把握だけで消耗する。
- この「探す・切り替える」手間そのものが、就活への着手を後回しにさせる。

**「こういうサービスがあればよかった」** という問題意識が、開発の出発点です。

### 一番の理由 — 「一元管理」できること

本アプリの最大の存在意義は、**就活に必要な情報と作業を 1 つの場所で完結できる（一元管理）** ことにあります。ES・企業・面接ログ・自己分析・カレンダー（締切/面接/インターン）をダッシュボードに集約し、「探す・切り替える」コストをゼロに近づけます。

> このリポジトリとは別に、開発者個人の就活情報は `profile/`・`companies/`・`skills/`・`outputs/` …と多数のファイルに分散管理されていました（`就活skills` ワークスペース）。**その散らばりこそが本アプリで解決したい課題そのもの** であり、それを 1 つのアプリに集約することが制作の一番の動機です。

### 目的・コンセプト

一元管理を土台に、本アプリは **「就活を頑張らせる」のではなく「就活を“やらない時間”を消す」** ことをコンセプトに据えています。

- **一元管理（最重要）**: 散らばった情報を 1 つのダッシュボードに集約し、全体像と「次にやること」を可視化する。
- **AI による伴走**: ES 添削・企業分析・自己分析サマリーを AI が補助し、着手と判断のハードルを下げる。
- **ゲーミフィケーション**: XP やクエスト風 UI で、成果が見えにくい作業に小さな達成感と継続のきっかけを与える。
- **MVP として最小構成**: 過剰実装を避け、就活の中核タスクに体験を絞ることで、まず価値を検証する。

## 主要機能

散らばりがちな就活タスクを、1つのダッシュボードに集約する構成です。

```mermaid
flowchart LR
    subgraph Before["Before（分散管理）"]
        W["Word (ES)"]
        E["Excel (企業管理)"]
        M["メモアプリ (面接/締切)"]
    end
    subgraph After["After（就活copilot）"]
        D["ダッシュボード"]
        ES["ES管理 + AI添削"]
        Co["企業管理 + AI分析"]
        Iv["面接ログ"]
        Cal["カレンダー(締切/面接/インターン)"]
        Sa["自己分析/適性チェック"]
        Xp["XP・レベル(ゲーミフィケーション)"]
    end

    W -.-> D
    E -.-> D
    M -.-> D
    D --> ES
    D --> Co
    D --> Iv
    D --> Cal
    D --> Sa
    ES --> Xp
    Co --> Xp
    Iv --> Xp
```

- 認証: Supabase Auth（Google OAuth）。認証後は `/dashboard` へ。未ログイン時は各ページで `/login` にリダイレクト。
- ダッシュボード: ES/企業カード/XP のサマリー、フォーカス、カレンダー表示。カレンダーでは ES 締切・面接・インターンなどの予定を追加/更新して保存し、ES 締切も自動表示。
- ES 管理: 一覧・作成/編集・削除、Markdown 入力、タグ/ステータス、AI 添削パネル。
- 企業管理: 企業カード作成/編集/削除、ステージ・志望度・メモ、AI 企業分析パネル。
- 面接ログ: 面接質問・回答・振り返りの記録、AI活用前提のデータ整形。
- 自己分析/適性チェック: 回答保存と AI サマリーで軸整理を支援。
- プロフィール: 氏名/大学/学部/アバター（固定画像）を保存。
- お問い合わせ: ログインユーザー情報付きでアプリ内から直接送信（`/api/contact`）。
- ホーム（MVP紹介）: 白基調のガラス風 UI。ログイン/新規登録導線と機能紹介。
- 共通: Tailwind v4 推奨クラス（`bg-linear-to-*` など）で警告回避、`sitemap.xml`/`robots.txt` 自動生成。

## 技術選定およびその意図

個人開発の MVP であることを前提に、**コストをかけずに（無料枠だけで）素早く価値を検証する** ことを最優先に技術を選定しています。

| 領域           | 採用技術                                  | 選定意図                                                                                                                                           |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| フロントエンド | **Next.js (App Router) + TypeScript**     | 画面だけを担当する（SPA型）。TanStack Query でデータをブラウザに保持し、画面を移動しても取り直さずに済む。                                         |
| バックエンド   | **Go**                                    | DBアクセス・外部API・ビジネスロジックを Next.js から切り離す。単一のバイナリで起動が速く、Vercel の無料枠でもコールドスタートが軽い。              |
| API の契約     | **OpenAPI（スキーマファースト）**         | `openapi.yaml` からバックエンドのサーバーと TypeScript の型を生成し、フロントとバックエンドの型がずれないようにする。                              |
| DB・認証       | **Supabase（Postgres / Auth）**           | 無料枠で Postgres と Google ログインを賄える。データの読み書きはバックエンドに集め、Supabase は DB と認証の基盤としてだけ使う。                    |
| DB アクセス    | **sqlc + pgx**                            | SQL を書いて型付きの Go のコードを生成する。XP の付与のような同時実行で正しさが必要な処理を、SQL として正確に書ける。                              |
| AI             | **Gemini / GPT（`backend/internal/ai`）** | 環境変数（`AI_PROVIDER`）でプロバイダーを切り替え、特定ベンダーへのロックインを避ける。企業分析では AI が Web 検索（Tavily）を呼びながら分析する。 |
| スタイリング   | **Tailwind CSS v4**                       | ユーティリティファーストで UI を高速に実装でき、デザインの一貫性を保ちやすい。クエスト風 UI（`dq-*` クラス）もクラス単位で完結。                   |
| アニメーション | **Framer Motion**                         | ゲーミフィケーション体験を支える滑らかな UI 演出を、宣言的かつ軽量に実装。                                                                         |
| ホスティング   | **Vercel**                                | Next.js と バックエンドを同じプロジェクト・同じドメインで動かせる（Services）。**無料枠（Hobby プラン）** でデプロイでき、インフラ管理も不要。     |

> いずれも「**無料枠だけで完結させ運用コストをゼロにする**」「マネージド/サーバーレスで個人開発でも運用負荷を下げる」「ベンダーロックインを避ける」「型安全と入力検証でデータを守る」という方針に沿って選んでいます。Supabase・Vercel・AI（Gemini 無料枠）・SMTP（Gmail）とも無料の範囲で運用でき、**追加コストなしで公開・運用** できます。

## ドキュメント

- [docs/backend-design.md](docs/backend-design.md) — バックエンド（Go）の設計と、各判断で採らなかった案
- [docs/architecture.md](docs/architecture.md) — 全体構成・認証フロー・AI連携・XPフロー・CIの図解
- [docs/database-schema.md](docs/database-schema.md) — DBスキーマのリファレンス（ER図付き）
- [docs/testing/unit-test-plan.md](docs/testing/unit-test-plan.md) — 単体テスト（Vitest）の設計
- [docs/testing/e2e-test-plan.md](docs/testing/e2e-test-plan.md) — E2Eテスト（Playwright）の設計
- [CLAUDE.md](CLAUDE.md) — AIエージェント（Claude Code）向けの開発ガイド。アーキテクチャ規約の要点はこちらにも集約

## セットアップ

```bash
# DB（Docker が必要）
supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,mailpit,postgres-meta

# バックエンドの API（localhost:8080）
cd backend
SUPABASE_URL=... DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres go run ./cmd/server

# Next.js（localhost:3000。/v1 は localhost:8080 のバックエンドに転送される）
npm install
npm run dev
```

## 環境変数

必要な環境変数の一覧と説明は [CLAUDE.md](CLAUDE.md) の「環境変数」を参照。Vercel では Next.js と バックエンドが同じ環境変数を共有する。

## 認証設定 (Supabase)

Supabase Dashboard → Authentication → URL Configuration

- Site URL:
  - Local: `http://localhost:3000`
  - Production: `https://job-seeker-gray.vercel.app`（本番確認時）
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/dashboard`
  - `https://job-seeker-gray.vercel.app/auth/callback`
  - `https://job-seeker-gray.vercel.app/dashboard`

Next.js 認証コールバック: `app/auth/callback/route.ts` で `exchangeCodeForSession` を実行。

## DB スキーマ概要

`supabase/migrations/` に定義（Supabase CLI で管理）。全テーブルの説明は [docs/database-schema.md](docs/database-schema.md) を参照。企業を中心に、ES・面接ログ・予定が企業にひも付く。

## 開発ルール

- YAGNI/DRY を徹底、MVP 以外の過剰実装は避ける。
- データの読み書きとビジネスロジックはバックエンドに置き、Next.js には置かない。API は `backend/api/openapi.yaml` から書く。
- バックエンドのすべての問い合わせは `user_id` で絞り込む（RLS のポリシーには頼らない）。
- Tailwind は推奨クラス（`bg-linear-to-*` など）を優先して警告を回避。
- AI 呼び出しは `backend/internal/ai` 経由。キー未設定時は AI 機能だけが 503 を返す。
- 詳細は [CLAUDE.md](CLAUDE.md) を参照。

## ページ一覧

- `/` ホーム（MVP紹介、ログイン導線）
- `/login` ログイン
- `/auth/callback` 認証コールバック
- `/dashboard` ダッシュボード（ログイン必須）
- `/es`, `/es/new`, `/es/[id]` ES 管理（ログイン必須）
- `/companies`, `/companies/new`, `/companies/[id]` 企業管理（ログイン必須）
- `/interviews`, `/interviews/new`, `/interviews/[id]` 面接ログ（ログイン必須）
- `/self-analysis` 自己分析（ログイン必須）
- `/aptitude` 適性チェック（ログイン必須）
- `/webtests`, `/webtests/new`, `/webtests/[id]` Webテスト対策（ログイン必須）
- `/profile` プロフィール編集（ログイン必須）
- `/contact` お問い合わせ（ログイン必須）

## 必要なキー

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Next.js）、`SUPABASE_URL`, `DATABASE_URL`（Go）
- AI: `AI_PROVIDER`, `AI_PROVIDER_API_KEY`, `TAVILY_API_KEY`（Go）
- Contact: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO_EMAIL`（Go）
- SEO: `NEXT_PUBLIC_SITE_URL`
