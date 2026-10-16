import type { Metadata } from "next";
import { SITE_NAME, getSiteUrl } from "@/lib/constants/site";
import "./globals.css";
import { DevServiceWorkerReset } from "./_components/dev-service-worker-reset";
import { Providers } from "./_components/providers";
import { AppHeader } from "./_components/layout/AppHeader";
import { Dock } from "./_components/layout/Dock";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} | 就活を整理して前進する`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "自己分析・適性チェック・ES管理・企業管理・面接ログを1つにまとめ、就活で次にやるべき行動を明確にするWebアプリ。",
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | 就活を整理して前進する`,
    description:
      "自己分析・適性チェック・ES管理・企業管理・面接ログを1つにまとめ、就活で次にやるべき行動を明確にするWebアプリ。",
    images: [
      {
        url: "/og-image.svg",
        width: 938,
        height: 352,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | 就活を整理して前進する`,
    description:
      "自己分析・適性チェック・ES管理・企業管理・面接ログを1つにまとめ、就活で次にやるべき行動を明確にするWebアプリ。",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <DevServiceWorkerReset />
        <Providers>
          <AppHeader />
          {children}
          <Dock />
        </Providers>
      </body>
    </html>
  );
}
