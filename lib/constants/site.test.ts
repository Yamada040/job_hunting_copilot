import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site";

const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;

const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("getSiteUrl", () => {
  it("falls back to the hardcoded production URL when nothing is set", () => {
    clearEnv();
    expect(getSiteUrl()).toBe("https://job-seeker-gray.vercel.app");
  });

  it("strips trailing slashes from a URL that already has a protocol", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "https://foo.com///";
    expect(getSiteUrl()).toBe("https://foo.com");
  });

  it("prefixes https:// onto a bare host name", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "my-app.vercel.app";
    expect(getSiteUrl()).toBe("https://my-app.vercel.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over NEXT_PUBLIC_VERCEL_URL", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_SITE_URL = "https://site-url.com";
    process.env.NEXT_PUBLIC_VERCEL_URL = "vercel-url.com";
    expect(getSiteUrl()).toBe("https://site-url.com");
  });

  it("prefers NEXT_PUBLIC_VERCEL_URL over VERCEL_PROJECT_PRODUCTION_URL", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_VERCEL_URL = "vercel-url.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "prod-url.com";
    expect(getSiteUrl()).toBe("https://vercel-url.com");
  });
});
