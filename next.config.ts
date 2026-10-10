import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
