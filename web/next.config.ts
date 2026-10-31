import type { NextConfig } from "next";
import { securityHeaders } from "./security-headers";

// Hosts allowed to serve product photos through the image optimizer, e.g. IMAGE_HOSTS=images.example-cdn.com
// The public address (read at build). On the real domain, the other spelling (www. or not)
// 301s to it: SITE_URL=https://example.com sends www.example.com/* to example.com/*.
const site = process.env.SITE_URL?.startsWith("https://") ? new URL(process.env.SITE_URL) : null;
const otherHost = site && (site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`);

const imageHosts = (process.env.IMAGE_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return otherHost ? [{ source: "/:path*", has: [{ type: "host" as const, value: otherHost }], destination: `${site!.origin}/:path*`, statusCode: 301 as const }] : [];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders({ dev: process.env.NODE_ENV === "development", siteUrl: process.env.SITE_URL }) },
      // Never in search results, whatever the page says
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  // ~9 KB of Tailwind CSS: inlining it saves a render-blocking request for first-time visitors on phones.
  experimental: { inlineCss: true },
  // pg loads its Cloudflare socket adapter conditionally, so file tracing misses it; the
  // Cloudflare Workers build needs it for database writes (webhook, sync, admin).
  outputFileTracingIncludes: { "/*": ["./node_modules/pg-cloudflare/**/*"] },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280],
    imageSizes: [64, 128, 200, 280, 400],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
};

export default nextConfig;
