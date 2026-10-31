/*
  Error tracking. Every reported error is logged as structured JSON and, when SENTRY_DSN is set,
  sent to Sentry over its HTTP API (no SDK: works on Node and Cloudflare Workers, and adds
  nothing to the browser bundle). Never sends cookies, headers or form contents; only the path,
  the method and the error itself. At most 30 events a minute per server, so a crash loop
  can't exhaust the free plan's quota.
*/
import { log, release, type Fields } from "./log";

type Dsn = { endpoint: string; key: string; raw: string };
export function parseDsn(dsn: string | undefined): Dsn | null {
  const m = dsn?.match(/^(https?):\/\/([^@:/]+)@([^/]+)\/(\d+)$/);
  return m ? { endpoint: `${m[1]}://${m[3]}/api/${m[4]}/envelope/`, key: m[2]!, raw: dsn! } : null;
}

/** V8 stack lines → Sentry frames, oldest call first (Sentry's order). */
export function stackFrames(stack: string | undefined) {
  const frames = [];
  for (const line of (stack ?? "").split("\n").slice(1, 40)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (m) frames.push({ function: m[1] ?? "<anonymous>", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !m[2]!.includes("node_modules") });
  }
  return frames.reverse();
}

export type ErrorContext = { source: "server" | "browser" | "sync" | "webhook"; path?: string; method?: string; level?: "error" | "warning" | "fatal"; tags?: Record<string, string>; extra?: Fields };

export function buildEnvelope(err: unknown, ctx: ErrorContext, dsn: Dsn, now = new Date()) {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "javascript",
    level: ctx.level ?? "error",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
    release: release() ?? undefined,
    tags: { source: ctx.source, ...ctx.tags },
    ...(ctx.path ? { request: { url: ctx.path, method: ctx.method ?? "GET" } } : {}),
    exception: { values: [{ type: e.name || "Error", value: e.message.slice(0, 2000), stacktrace: { frames: stackFrames(e.stack) } }] },
    ...(ctx.extra ? { extra: ctx.extra } : {}),
  };
  const body = [JSON.stringify({ event_id: eventId, sent_at: now.toISOString(), dsn: dsn.raw }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
  return { eventId, body };
}

const sent: number[] = [];
export async function reportError(err: unknown, ctx: ErrorContext) {
  const message = err instanceof Error ? err.message : String(err);
  log(ctx.level === "warning" ? "warn" : "error", "error reported", { source: ctx.source, path: ctx.path, error: message.slice(0, 500), ...ctx.tags });
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return;
  const now = Date.now();
  while (sent.length && now - sent[0]! > 60_000) sent.shift();
  if (sent.length >= 30) return;
  sent.push(now);
  try {
    const { body } = buildEnvelope(err, ctx, dsn);
    await fetch(dsn.endpoint, {
      method: "POST", body, signal: AbortSignal.timeout(3000),
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=adams-shore/1.0` },
    });
  } catch (e) {
    log("warn", "error report not delivered", { error: String((e as Error).message ?? e) });
  }
}
