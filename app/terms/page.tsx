import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import { SITE_NAME } from "@/lib/constants/site";
import { LegalPage, LegalSection, OPERATOR_NAME } from "@/app/_components/legal/legal-page";

export const metadata: Metadata = {
  title: "利用規約",
  description: `${SITE_NAME}を使うときの約束ごとです。`,
  alternates: { canonical: ROUTES.TERMS },
};

export default function TermsPage() {
  return (
    <LegalPage title="利用規約">
      <p className="text-sm leading-7">
        この利用規約は、{SITE_NAME}（以下「このサービス」）を使うときの約束ごとです。ログインした時点で、この規約と
        <Link href={ROUTES.PRIVACY} className="text-primary underline underline-offset-4">
          プライバシーポリシー
        </Link>
        に同意したものとします。
      </p>

      <LegalSection title="1. このサービスについて">
        <p>
          このサービスは、{OPERATOR_NAME}
          が個人で開発・運営している無料のMVP（試作版）です。機能の追加・変更・停止を、予告なく行うことがあります。
        </p>
      </LegalSection>

      <LegalSection title="2. アカウント">
        <ul>
          <li>Googleアカウントでログインして使います。</li>
          <li>アカウントは本人だけが使い、他人に貸したり譲ったりしないでください。</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 禁止事項">
        <ul>
          <li>法令や公序良俗に反すること</li>
          <li>他人の個人情報や、他人の権利を侵害する内容を登録すること</li>
          <li>サーバーに過度な負荷をかけること、不正にアクセスすること、AIの利用回数の上限をすり抜けようとすること</li>
          <li>このサービスやAIの結果を、そのまま商用のサービスとして提供すること</li>
          <li>そのほか、運営者が不適切と判断すること</li>
        </ul>
        <p>これらに当てはまる利用があったときは、利用を止めることがあります。</p>
      </LegalSection>

      <LegalSection title="4. AIの結果">
        <p>
          AI添削・AI振り返り・AI企業分析・AI適性診断・AI自己分析の結果は、AIが自動で作ったものです。内容の正確さ・最新さ・選考への効果は保証しません。企業の情報は企業の公式の情報で確かめ、ESや面接の受け答えはご自身の判断で使ってください。
        </p>
        <p>
          AIの機能を使うと、入力した内容の一部が外部のAIに送られます。送る内容は
          <Link href={ROUTES.PRIVACY} className="text-primary underline underline-offset-4">
            プライバシーポリシー
          </Link>
          をご覧ください。
        </p>
      </LegalSection>

      <LegalSection title="5. 無保証と責任">
        <ul>
          <li>このサービスは現状のまま提供し、不具合が無いこと・いつでも使えることは保証しません。</li>
          <li>データが失われることもあり得ます。ESの本文など大事な内容は、ご自身でも控えを残してください。</li>
          <li>
            このサービスを使ったこと、または使えなかったことで生じた損害について、運営者に故意または重大な過失がある場合を除き、責任を負いません。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. 登録した内容">
        <p>
          登録した内容の権利は、登録した本人にあります。運営者は、このサービスを提供するために必要な範囲でだけ扱います。
        </p>
      </LegalSection>

      <LegalSection title="7. 退会とサービスの終了">
        <p>
          退会は
          <Link href={ROUTES.CONTACT} className="text-primary underline underline-offset-4">
            問い合わせフォーム
          </Link>
          から依頼してください。運営者は、このサービスを終了することがあります。終了するときは、できるだけ前もってサービスの画面でお知らせします。
        </p>
      </LegalSection>

      <LegalSection title="8. 規約の改定">
        <p>
          この規約は改定することがあります。改定したあとにこのサービスを使った場合、改定後の規約に同意したものとします。大事な変更は、このページやサービスの画面でお知らせします。
        </p>
      </LegalSection>

      <LegalSection title="9. 準拠法">
        <p>この規約は日本の法律に従って解釈します。</p>
      </LegalSection>
    </LegalPage>
  );
}
