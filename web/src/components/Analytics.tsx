/**
 * Cloudflare Web Analytics: free, cookieless, no personal data, so no cookie banner is needed.
 * Off unless CF_ANALYTICS_TOKEN is set at build time. Loads deferred, after the page is usable.
 * (On Cloudflare Pages it can instead be switched on in the dashboard with no code; the
 * Content-Security-Policy allows either.)
 */
export function Analytics() {
  const token = process.env.CF_ANALYTICS_TOKEN;
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) return null;
  return <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token })} />;
}
