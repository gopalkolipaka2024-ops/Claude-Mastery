/*
  Structured logs: one JSON object per line, so the host's log viewer (Cloudflare, Vercel) and
  GitHub Actions output can be searched and filtered by field.
    log("info", "sync ok", { source: "export", created: 3 })
  → {"time":"2026-11-01T12:00:00.000Z","level":"info","msg":"sync ok","service":"web","source":"export","created":3}
*/
/** The deployed commit: set GIT_SHA yourself, or Vercel / Cloudflare Pages set theirs. */
export const release = () => process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || null;

export type Level = "debug" | "info" | "warn" | "error";
export type Fields = Record<string, unknown>;

export function log(level: Level, msg: string, fields: Fields = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, service: process.env.LOG_SERVICE ?? "web", ...fields });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}
