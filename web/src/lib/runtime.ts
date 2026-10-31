/** On Cloudflare Workers (OpenNext), the current request's context object; undefined on Node. */
export const workerRequest = (): object | undefined =>
  (globalThis as unknown as Record<symbol, { ctx?: object } | undefined>)[Symbol.for("__cloudflare-context__")]?.ctx;

/** True when running on Cloudflare Workers, where the edge compresses responses itself. */
export const onCloudflare = () => workerRequest() !== undefined || (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");
