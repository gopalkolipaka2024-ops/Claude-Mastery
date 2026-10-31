import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "../security-headers";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(name + " "))?.split(" ").slice(1) ?? null;

describe("Content-Security-Policy", () => {
  const csp = contentSecurityPolicy();
  it("blocks plugins, base-tag hijacking, foreign form posts and framing", () => {
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
  });
  it("allows scripts only from us and the two named Cloudflare services, never eval in production", () => {
    expect(directive(csp, "script-src")).toEqual(["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://static.cloudflareinsights.com"]);
    expect(csp).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'");
  });
  it("has no wildcard sources", () => {
    expect(csp).not.toMatch(/(^|\s)\*(\s|;|$)|https:(\s|;|$)/);
  });
});

describe("security headers", () => {
  const byKey = (h: { key: string; value: string }[]) => Object.fromEntries(h.map((x) => [x.key, x.value]));
  it("sends HSTS and upgrades requests only when the site is on HTTPS", () => {
    const prod = byKey(securityHeaders({ siteUrl: "https://shop.example" }));
    expect(prod["Strict-Transport-Security"]).toBe("max-age=31536000");
    expect(prod["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    const local = byKey(securityHeaders({ siteUrl: "http://localhost:3100" }));
    expect(local).not.toHaveProperty("Strict-Transport-Security");
    expect(local["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
  });
  it("sets the standard hardening headers", () => {
    const h = byKey(securityHeaders({ siteUrl: "https://shop.example" }));
    expect(h).toMatchObject({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Cross-Origin-Opener-Policy": "same-origin" });
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });
});
