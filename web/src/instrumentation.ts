import type { Instrumentation } from "next";

/** Every uncaught server error (pages, route handlers, server actions, proxy) goes to error tracking. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { reportError } = await import("./lib/error-report");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  await reportError(err, {
    source: "server",
    path: request.path.split("?")[0], // no query strings: they can hold search text
    method: request.method,
    tags: { route: context.routePath, routeType: context.routeType, ...(digest ? { digest } : {}) },
  });
};
