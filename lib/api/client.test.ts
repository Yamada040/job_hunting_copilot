import { afterEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/supabase/supabase-browser", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession } }),
}));

import { api, ApiError, unwrap, type Problem } from "./client";

const problem: Problem = {
  type: "about:blank",
  title: "ログインが必要です",
  status: 401,
  code: "unauthorized",
};

function fakeFetch(response: Response) {
  return vi.fn<(req: Request) => Promise<Response>>().mockResolvedValue(response);
}

afterEach(() => {
  getSession.mockReset();
});

describe("api", () => {
  it("sends the Supabase access token as a bearer token", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    const fetchMock = fakeFetch(Response.json({ status: "ok" }));

    await api.GET("/v1/health", { baseUrl: "http://localhost", fetch: fetchMock });

    expect(fetchMock.mock.calls[0][0].headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("sends no Authorization header when the user is not logged in", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const fetchMock = fakeFetch(Response.json({ status: "ok" }));

    await api.GET("/v1/health", { baseUrl: "http://localhost", fetch: fetchMock });

    expect(fetchMock.mock.calls[0][0].headers.has("Authorization")).toBe(false);
  });
});

describe("unwrap", () => {
  it("returns the data on success", async () => {
    await expect(unwrap(Promise.resolve({ data: { status: "ok" } }))).resolves.toEqual({ status: "ok" });
  });

  it("throws an ApiError carrying the problem so the UI can show its Japanese message", async () => {
    const error = await unwrap(Promise.resolve({ error: problem })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("ログインが必要です");
    expect((error as ApiError).problem.code).toBe("unauthorized");
  });

  it("throws a plain Error, not an ApiError, when the response is not a problem (the backend was unreachable)", async () => {
    const error = await unwrap(Promise.resolve({ error: "Internal Server Error" })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
