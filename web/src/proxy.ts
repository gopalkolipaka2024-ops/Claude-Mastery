import { NextResponse, type NextRequest } from "next/server";

/*
  Runs before every matched request:
   1. Rate limits public endpoints per client IP (sliding one-minute window, per server instance).
      On Cloudflare, also add a WAF rate-limiting rule for /api/* so limits hold across instances.
   2. Protects /admin (see adminGate below).
*/
const LIMITS: [RegExp, number][] = [
  [/^\/api\/v1\//, 120],
  [/^\/api\/suggest/, 300],
  [/^\/contact/, 20], // form posts (server action) come in on the page URL
];
const hits = new Map<string, number[]>();

function rateLimit(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;
  const rule = LIMITS.find(([re]) => re.test(path));
  if (!rule || (path.startsWith("/contact") && req.method !== "POST")) return null;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${rule[0].source}|${ip}`, now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  if (list.length <= rule[1]) return null;
  const retry = Math.ceil((60_000 - (now - list[0]!)) / 1000);
  return NextResponse.json({ error: { code: "rate_limited", message: `Too many requests. Try again in ${retry} seconds.` } }, { status: 429, headers: { "Retry-After": String(retry) } });
}

export async function proxy(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const { adminGate } = await import("./lib/admin-auth");
    return adminGate(req);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/v1/:path*", "/api/suggest", "/contact", "/admin/:path*", "/admin"] };
