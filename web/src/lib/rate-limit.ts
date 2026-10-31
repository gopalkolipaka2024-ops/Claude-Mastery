import { apiError } from "./api";

/*
  Per-IP rate limits, called at the top of each public endpoint (sliding one-minute window,
  per server instance). On Cloudflare each instance keeps its own count, so also add a WAF
  rate-limiting rule for /api/* (one rule is free); see the runbook.
*/
export const LIMITS = { api: 120, suggest: 300, clientErrors: 30, contact: 20 } as const;
const hits = new Map<string, number[]>();

export const clientIp = (headers: Headers) =>
  headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

/** Records a hit; returns the seconds to wait if the caller is over the limit, otherwise null. */
export function hit(bucket: keyof typeof LIMITS, ip: string, now = Date.now()): number | null {
  const key = `${bucket}|${ip}`;
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  return list.length <= LIMITS[bucket] ? null : Math.ceil((60_000 - (now - list[0]!)) / 1000);
}

/** For route handlers: a 429 response when over the limit, otherwise null. */
export function rateLimit(req: Request, bucket: keyof typeof LIMITS) {
  const retry = hit(bucket, clientIp(req.headers));
  return retry == null ? null : apiError(429, "rate_limited", `Too many requests. Try again in ${retry} seconds.`, undefined, { "Retry-After": String(retry) });
}
