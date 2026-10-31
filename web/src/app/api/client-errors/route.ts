import { z } from "zod";
import { apiError, invalid } from "@/lib/api";
import { reportError } from "@/lib/error-report";
import { rateLimit } from "@/lib/rate-limit";

/** POST /api/client-errors — browser errors sent by the beacon in the root layout and the error pages. */
const body = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).regex(/^\//),
  digest: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(req, "clientErrors");
  if (limited) return limited;
  const raw = await req.text();
  if (raw.length > 8_000) return apiError(413, "too_large", "Error report too large.");
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return apiError(400, "invalid_json", "Body is not valid JSON."); }
  const parsed = body.safeParse(json);
  if (!parsed.success) return invalid(parsed.error);
  const { message, stack, path, digest } = parsed.data;
  // Browser extensions throw into every page; they aren't our bugs
  if (/(chrome|moz|safari(-web)?)-extension:\/\//.test(stack ?? "") || /ResizeObserver loop/.test(message)) return new Response(null, { status: 204 });
  const err = Object.assign(new Error(message), { name: "BrowserError", stack: `BrowserError: ${message}\n${stack ?? ""}` });
  await reportError(err, { source: "browser", path: path.split("?")[0], tags: digest ? { digest } : {}, extra: { userAgent: req.headers.get("user-agent")?.slice(0, 200) } });
  return new Response(null, { status: 204 });
}
