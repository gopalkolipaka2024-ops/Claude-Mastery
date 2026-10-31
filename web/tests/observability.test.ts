import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEnvelope, parseDsn, reportError, stackFrames } from "@/lib/error-report";
import { GET as health } from "@/app/api/health/route";
import { POST as clientErrors } from "@/app/api/client-errors/route";

const DSN = "https://abc123@o42.ingest.us.sentry.io/7";

describe("error reporting", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("turns a Sentry DSN into the envelope endpoint and key", () => {
    expect(parseDsn(DSN)).toEqual({ endpoint: "https://o42.ingest.us.sentry.io/api/7/envelope/", key: "abc123", raw: DSN });
    expect(parseDsn("not a dsn")).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
  });

  it("reads V8 stack frames, oldest call first", () => {
    const frames = stackFrames("Error: boom\n    at inner (/app/src/lib/a.ts:10:5)\n    at outer (/app/node_modules/x/b.js:2:1)");
    expect(frames).toEqual([
      { function: "outer", filename: "/app/node_modules/x/b.js", lineno: 2, colno: 1, in_app: false },
      { function: "inner", filename: "/app/src/lib/a.ts", lineno: 10, colno: 5, in_app: true },
    ]);
  });

  it("builds a three-line envelope with only the path, method and error", () => {
    const { body } = buildEnvelope(new TypeError("bad thing"), { source: "server", path: "/p/x", method: "GET", tags: { route: "/p/[slug]" } }, parseDsn(DSN)!);
    const [header, item, event] = body.split("\n").map((l) => JSON.parse(l));
    expect(header.dsn).toBe(DSN);
    expect(item).toEqual({ type: "event" });
    expect(event).toMatchObject({ level: "error", tags: { source: "server", route: "/p/[slug]" }, request: { url: "/p/x", method: "GET" }, exception: { values: [{ type: "TypeError", value: "bad thing" }] } });
    expect(JSON.stringify(event)).not.toMatch(/cookie|headers/i);
  });

  it("logs structured JSON and posts to Sentry only when a DSN is set", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await reportError(new Error("no dsn"), { source: "sync" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(err.mock.calls[0]![0] as string)).toMatchObject({ level: "error", msg: "error reported", source: "sync", error: "no dsn" });
    vi.stubEnv("SENTRY_DSN", DSN);
    await reportError(new Error("with dsn"), { source: "sync" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://o42.ingest.us.sentry.io/api/7/envelope/");
    expect((init.headers as Record<string, string>)["X-Sentry-Auth"]).toContain("sentry_key=abc123");
  });
});

describe("browser error endpoint", () => {
  afterEach(() => vi.restoreAllMocks());
  const post = (body: unknown) => clientErrors(new Request("http://x/api/client-errors", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("accepts a valid report and logs it", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ message: "x is undefined", stack: "at a (https://site/_next/x.js:1:2)", path: "/c/beer" })).status).toBe(204);
    expect(JSON.parse(err.mock.calls[0]![0] as string)).toMatchObject({ source: "browser", path: "/c/beer" });
  });
  it("rejects malformed reports and ignores browser-extension noise", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ message: "x", path: "no-slash" })).status).toBe(400);
    expect((await post("x".repeat(9000))).status).toBe(413);
    const ext = await post({ message: "boom", stack: "at chrome-extension://abc/content.js:1:1", path: "/" });
    expect(ext.status).toBe(204);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("health endpoint", () => {
  it("reports ok with the catalog when no database is configured", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", problems: [], checks: { database: "not configured", catalog: { products: 7380 } } });
  });
});
