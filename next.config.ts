import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Vercel の Services で動かしていると、画像最適化の /_next/image が本番で 404 になり画像が表示されない。
  // Services 側で通す設定は見当たらず、画像は少数なので、最適化に頼らず軽くした画像をそのまま配信する
  images: { unoptimized: true },
  // next dev が AGENTS.md に Next.js 向けの注意書きを足し続けるのを止める。
  // AGENTS.md は CLAUDE.md を参照するだけにして、規約を CLAUDE.md の1か所にまとめているため
  agentRules: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  async rewrites() {
    // 本番・プレビューでは vercel.json の Services が /v1 をバックエンドに振り分けるので、API_ORIGIN を置かない。
    // 手元（next dev）と E2E（本番ビルド）にはバックエンドが同居しないため、別に起動したバックエンドに転送する
    const apiOrigin =
      process.env.API_ORIGIN ?? (process.env.NODE_ENV === "development" ? "http://localhost:8080" : undefined);
    if (!apiOrigin) return [];
    return [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }];
  },
};

export default nextConfig;
