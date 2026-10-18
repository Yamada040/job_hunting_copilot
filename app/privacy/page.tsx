import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import { SITE_NAME } from "@/lib/constants/site";
import { LegalPage, LegalSection, OPERATOR_NAME } from "@/app/_components/legal/legal-page";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: `${SITE_NAME}で預かる情報、その使い道、外部のAIなどへの送信について説明します。`,
  alternates: { canonical: ROUTES.PRIVACY },
};

// 送る内容は、バックエンドがAIへの入力を組み立てる処理（backend/internal/es/review.go など）と合わせる
const recipients = [
  {
    name: "Google（Gemini API）または OpenAI（OpenAI API）",
    purpose: "AI添削・AI振り返り・AI企業分析・AI適性診断・AI自己分析（どちらか一方を使います）",
    content:
      "AIの機能を実行したときに、その機能に必要な内容だけを送ります。AI添削ではESの企業名・タイトル・職種・設問と回答・本文と、保存済みの企業分析・自己分析の結果。AI振り返りでは面接ログの企業名・回次・形式・実施日・質問と回答・手応え・改善点・想定外だった質問。AI企業分析では企業名・業界・企業サイトのURL。AI適性診断・AI自己分析ではそれぞれの回答。",
  },
  {
    name: "Tavily",
    purpose: "AI企業分析のWeb検索",
    content: "AIが企業名などから作った検索語。",
  },
  {
    name: "Supabase",
    purpose: "ログイン（Googleアカウント）とデータの保存",
    content: "このサービスで登録・入力したすべての情報と、Googleアカウントのメールアドレス・名前。",
  },
  {
    name: "Vercel",
    purpose: "サービスの配信（画面とAPIの実行）",
    content: "アクセスしたときの通信の内容と、IPアドレスなどのアクセスの記録。",
  },
  {
    name: "メール送信サービス",
    purpose: "問い合わせを運営者のメールに届けるため",
    content:
      "問い合わせの件名・本文と返信先のメールアドレス。ログインして送ったときは、プロフィールの氏名・ログインのメールアドレス・ユーザーIDも。",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー">
      <p className="text-sm leading-7">
        {SITE_NAME}
        （以下「このサービス」）は、就活の情報を1か所にまとめるための無料のWebアプリで、個人が開発・運営しています。このページでは、このサービスが預かる情報と、その扱いを説明します。
      </p>

      <LegalSection title="1. 運営者">
        <p>
          {OPERATOR_NAME}（個人での開発・運営）です。お問い合わせは
          <Link href={ROUTES.CONTACT} className="text-primary underline underline-offset-4">
            問い合わせフォーム
          </Link>
          （ログインしなくても使えます）からお願いします。
        </p>
      </LegalSection>

      <LegalSection title="2. 預かる情報">
        <ul>
          <li>Googleアカウントの情報: メールアドレス、名前（Googleでログインしたときに受け取ります）</li>
          <li>プロフィール: 氏名、大学、学部、志望業界、就活の軸、目標など</li>
          <li>登録した内容: 企業、ES、面接ログ、予定、自己分析・適性チェックの回答、Webテストの問題と解答</li>
          <li>AIの結果: 添削結果・振り返り結果・分析結果・診断結果と、AIの利用回数</li>
          <li>問い合わせの内容: 件名、本文、返信先のメールアドレス</li>
          <li>アクセスの記録: IPアドレス、ブラウザの種類など、サービスの配信で自動的に残る記録</li>
          <li>
            問い合わせの送信回数: ログインせずに送ったときは、IPアドレスを元に戻せない形（ハッシュ）にして数えます
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 使い道">
        <ul>
          <li>このサービスの機能を提供するため（登録した内容の表示、AIの機能、XP・レベルの計算など）</li>
          <li>不正な利用を防ぎ、AIの利用回数と問い合わせの送信回数の上限を守るため</li>
          <li>問い合わせに答えるため</li>
          <li>不具合の調査とサービスの改善のため</li>
        </ul>
        <p>預かった情報を広告に使ったり、第三者に売ったりはしません。</p>
      </LegalSection>

      <LegalSection title="4. 外部のサービスへの送信">
        <p>
          このサービスは、次の外部のサービスを使っています。氏名・大学・学部・メールアドレスは、AI（Gemini・OpenAI）にもTavilyにも送りません。
        </p>
        <dl className="space-y-4">
          {recipients.map((r) => (
            <div key={r.name} className="space-y-1">
              <dt className="font-semibold">{r.name}</dt>
              <dd className="text-muted-foreground">使い道: {r.purpose}</dd>
              <dd className="text-muted-foreground">送る内容: {r.content}</dd>
            </div>
          ))}
        </dl>
        <p>
          このサービスは、Gemini API を無料枠で使っています。Gemini API
          の無料枠では、送った内容がGoogleのサービスの改善に使われ、品質の確認のために人が読むことがあります。OpenAI
          API・Tavily に送った内容も、それぞれの会社の規約に従って一定の期間保存されることがあります。
          外部のサービスに送った内容は、このサービスから消すことができません。AIの機能を使うときは、他人に知られたくない情報（他人の個人情報など）をESや面接ログに書かないようにしてください。
        </p>
      </LegalSection>

      <LegalSection title="5. 保存する場所と期間">
        <p>
          登録した内容は、Supabase
          のデータベース（日本のリージョン）に保存します。ほかの利用者からは見えません。退会するまで保存し、退会すると消します。
        </p>
      </LegalSection>

      <LegalSection title="6. 退会とデータの削除">
        <p>
          <Link href={ROUTES.PROFILE} className="text-primary underline underline-offset-4">
            プロフィールの画面
          </Link>
          から退会できます。退会すると、アカウントと預かったすべての情報が消えます。企業・ES・面接ログ・予定などは、画面から1件ずつ消すこともできます。
        </p>
        <p>
          ログインできないときなどは、
          <Link href={ROUTES.CONTACT} className="text-primary underline underline-offset-4">
            問い合わせフォーム
          </Link>
          から削除を依頼できます。登録したGoogleアカウントのメールアドレスを返信先にしてください。運営者が本人の依頼であることを確かめてから、アカウントと登録した内容をまとめて消します。
        </p>
      </LegalSection>

      <LegalSection title="7. Cookie">
        <p>
          ログインの状態を保つためのCookie（Supabase
          Auth）だけを使います。アクセス解析や広告のためのCookieは使いません。
        </p>
      </LegalSection>

      <LegalSection title="8. このポリシーの改定">
        <p>
          使う外部のサービスや送る内容が変わったときなどに、このポリシーを改定することがあります。大事な変更は、このページやサービスの画面でお知らせします。
        </p>
      </LegalSection>
    </LegalPage>
  );
}
