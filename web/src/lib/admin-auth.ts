import { createRemoteJWKSet, jwtVerify } from "jose";

/*
  /admin sits behind Cloudflare Access (free for up to 50 users): Cloudflare signs staff in
  with a one-time email code and forwards a signed JWT. We verify that JWT on every request
  and check the email against ADMIN_EMAILS.
    CF_ACCESS_TEAM_DOMAIN  e.g. https://adams-shore.cloudflareaccess.com
    CF_ACCESS_AUD          the Access application's audience tag
    ADMIN_EMAILS           comma-separated staff emails
  Local development only: ADMIN_DEV_EMAIL skips Cloudflare (ignored when NODE_ENV=production).
*/
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function adminEmail(headers: Headers, cookie?: string | null): Promise<string | null> {
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_DEV_EMAIL) return process.env.ADMIN_DEV_EMAIL;
  const team = process.env.CF_ACCESS_TEAM_DOMAIN, aud = process.env.CF_ACCESS_AUD;
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!team || !aud || !allowed.length) return null;
  const token = headers.get("cf-access-jwt-assertion") ?? cookie?.match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if (!token) return null;
  jwks ??= createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: team, audience: aud });
    const email = String(payload.email ?? "").toLowerCase();
    return allowed.includes(email) ? email : null;
  } catch {
    return null;
  }
}

export const adminConfigured = () =>
  (process.env.NODE_ENV !== "production" && !!process.env.ADMIN_DEV_EMAIL) ||
  !!(process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD && process.env.ADMIN_EMAILS);

/** Proxy gate for /admin. Passes the verified email to the page as x-admin-email (overwriting any client value). */
/** For server actions and admin pages: re-verify instead of trusting a header. */
export async function requireAdmin(): Promise<string> {
  const { headers, cookies } = await import("next/headers");
  const h = await headers();
  const c = (await cookies()).toString();
  const email = await adminEmail(h, c);
  if (!email) throw new Error("Not signed in as staff.");
  return email;
}
