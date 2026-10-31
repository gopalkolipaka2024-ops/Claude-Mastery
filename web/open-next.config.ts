// Cloudflare Workers adapter (OpenNext). How pages are cached and refreshed on Cloudflare:
//   - rendered pages: R2 (free tier: 10 GB)
//   - on-demand refresh after a POS sync or admin change (revalidatePath): D1 tag cache
//   - timed refresh (products hourly, deals every 5 minutes): Durable Object queue
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
