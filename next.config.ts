import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // 本番・プレビューでは vercel.json の Services が /v1 を Go に振り分ける。
    // next dev には Go が同居しないため、手元で起動した Go（既定は localhost:8080）に転送する
    if (process.env.NODE_ENV !== "development") return [];
    const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8080";
    return [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }];
  },
};

export default nextConfig;
