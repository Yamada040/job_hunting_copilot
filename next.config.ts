import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel の Services で動かしていると、画像最適化の /_next/image が本番で 404 になり画像が表示されない。
  // Services 側で通す設定は見当たらず、画像は少数なので、最適化に頼らず軽くした画像をそのまま配信する
  images: { unoptimized: true },
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
