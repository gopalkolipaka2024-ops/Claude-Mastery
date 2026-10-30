import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Every error the API returns has this shape: { error: { code, message, details? } } */
export function apiError(status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status, headers });
}
export const invalid = (e: ZodError) =>
  apiError(400, "invalid_request", "Some request fields are invalid.", e.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })));

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Webhook signature: hex HMAC-SHA256 of `${timestamp}.${rawBody}` with the shared secret,
 * sent as `X-ASM-Signature: sha256=<hex>` with `X-ASM-Timestamp: <unix seconds>`.
 * Requests older than 5 minutes are rejected so a captured request can't be replayed.
 */
export function verifySignature(secret: string, rawBody: string, timestamp: string | null, signature: string | null, now = Date.now()) {
  if (!timestamp || !signature?.startsWith("sha256=")) return "missing signature headers";
  const t = Number(timestamp);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return "timestamp outside the 5 minute window";
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return safeEqual(signature.slice(7), expected) ? null : "signature does not match";
}

export const sign = (secret: string, rawBody: string, timestamp: string) =>
  `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
