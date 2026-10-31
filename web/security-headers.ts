/*
  Security headers for every response (applied in next.config.ts).

  Content Security Policy: pages stay static (fast, cacheable), so per-request nonces aren't
  possible; Next.js and React need inline bootstrap scripts, hence 'unsafe-inline' for scripts.
  Everything else is locked down: only our own origin plus the few services the site uses,
  no plugins, no <base> changes, forms only post to us, and no other site may frame us.
  The site renders no user-supplied HTML (React escapes text; JSON-LD escapes "<").

  Third parties allowed, and why:
    challenges.cloudflare.com           Turnstile spam check on the contact form
    static.cloudflareinsights.com       Cloudflare Web Analytics beacon (cookieless)
    cloudflareinsights.com              where that beacon reports page views
    maps.google.com, www.google.com     the store map, only after someone taps "Show map"
*/
export function contentSecurityPolicy({ dev = false, https = true } = {}) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), "https://challenges.cloudflare.com", "https://static.cloudflareinsights.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : []), "https://cloudflareinsights.com", "https://challenges.cloudflare.com"],
    "frame-src": ["https://challenges.cloudflare.com", "https://maps.google.com", "https://www.google.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (https) csp.push("upgrade-insecure-requests");
  return csp.join("; ");
}

export function securityHeaders({ dev = false, siteUrl = "" } = {}) {
  const https = siteUrl.startsWith("https://");
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev, https }) },
    // One year, this host only. Add includeSubDomains (and consider preload) once every
    // subdomain of the store's domain is known to serve HTTPS.
    ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
