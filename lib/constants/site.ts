const fallbackUrl = "https://job-seeker-gray.vercel.app";

export function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "";

  if (!envUrl) return fallbackUrl;

  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
    return envUrl.replace(/\/+$/, "");
  }

  return `https://${envUrl.replace(/\/+$/, "")}`;
}

export const SITE_NAME = "就活copilot";
