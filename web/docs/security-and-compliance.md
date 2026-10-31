# Security and compliance

## HTTPS

- **At the host:** turn on "Always Use HTTPS" (Cloudflare: SSL/TLS → Edge Certificates) and set
  the minimum TLS version to 1.2. Vercel serves HTTPS only by default.
- **In the browser:** once `SITE_URL` starts with `https://`, every response carries
  `Strict-Transport-Security: max-age=31536000`, and the CSP adds `upgrade-insecure-requests`.
  Add `includeSubDomains` (and consider HSTS preload) only after confirming every subdomain of
  the store's domain serves HTTPS, because browsers will then refuse plain HTTP on all of them.

## Security headers (every response)

Defined in `security-headers.ts`, applied in `next.config.ts`, tested in `tests/security-headers.test.ts`.

| Header | Value | Why |
| --- | --- | --- |
| Content-Security-Policy | see below | Limits where scripts, frames and connections can come from |
| X-Content-Type-Options | nosniff | Files are only used as the type the server says |
| X-Frame-Options | DENY (plus CSP `frame-ancestors 'none'`) | No other site can frame ours (clickjacking) |
| Referrer-Policy | strict-origin-when-cross-origin | Other sites see only our domain, never full URLs |
| Permissions-Policy | camera, microphone, location, payment, USB, topics off | The site needs none of them |
| Cross-Origin-Opener-Policy | same-origin | Isolates our window from pages it opens |
| X-Robots-Tag | noindex on `/admin` and `/api` | Never in search results |

**Content Security Policy.** Only our own origin, plus Cloudflare Turnstile (contact form),
Cloudflare Web Analytics, and Google Maps (loaded only after "Show map"). It also sets
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`, with
no wildcards. Scripts allow `'unsafe-inline'` because Next.js needs inline bootstrap scripts.

The alternative is a per-request nonce, which removes `'unsafe-inline'`. But every page would
then be rendered on each request instead of served from cache, which breaks the performance
budgets and raises hosting cost. The risk is low because the site never renders HTML from users
or the database: React escapes all text, and structured data escapes `<`. Revisit this if user
content (reviews, comments) is ever added.

## Secrets

| Variable | Secret? | Used by |
| --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_WRITE`, `DATABASE_URL_OWNER` | yes | server, sync, migrations |
| `POS_WEBHOOK_SECRET`, `REVALIDATE_TOKEN` | yes | webhook, sync |
| `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO`, `CONTACT_FROM` | yes (the last two are private addresses) | contact form |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAILS` | yes | admin sign-in |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CF_ANALYTICS_TOKEN`, `SITE_URL`, `SITE_INDEXABLE`, `IMAGE_HOSTS` | no (public by design) | pages |

- Secrets live only in the host's environment settings and in GitHub Actions secrets. They are
  never in the repository: every `.env*` file except `.env.example` is git-ignored.
- **CI proves they stay out of the browser.** The build runs with fake "canary" values in every
  secret variable, then `npm run check:secrets` scans each file sent to browsers for those
  values and for anything shaped like a credential.
- **Gitleaks** scans the repository and its full history on every pull request and weekly.

## Dependencies

- `npm audit` runs on every pull request and every Monday (`.github/workflows/security.yml`).
  Any high or critical advisory in a **production** dependency fails the check.
- Advisories in **development** tooling are reported but don't block. This tooling (Lighthouse CI,
  drizzle-kit, Storybook) never runs on the live site. On Oct 31, 2026: 0 production advisories;
  27 in development tooling (13 high), all inside the Lighthouse CI, drizzle-kit and Storybook
  dependency trees. npm's suggested "fixes" for those are downgrades, so they wait for upstream releases.
- Dependabot opens weekly update pull requests, plus security fixes as advisories are published.

## Other protections already in place

- **Admin:** Cloudflare Access sign-in plus a signed-token check and an email allow-list on every request.
- **POS webhook:** HMAC-SHA256 signature over timestamp and body, with a 5-minute replay window.
- **Rate limits per IP:** public API 120/min, search suggestions 300/min, contact form 20/min.
  On Cloudflare, add a WAF rate-limit rule for `/api/*` too.
- **Contact form:** honeypot field, Turnstile, server-side validation. Next.js server actions
  reject posts from other origins.
- **Public API and pages** never expose stock counts, only "in stock / low / out".

## Privacy and cookies

- **The only cookie is the 21+ confirmation**, which is needed for the site to work. Recent searches stay in the
  visitor's browser (localStorage) and are never sent to us.
- **Analytics:** Cloudflare Web Analytics, which is free and sets no cookies or personal identifiers. Set
  `CF_ANALYTICS_TOKEN` at build time, or switch it on in the Cloudflare dashboard (the CSP allows either).
- **No cookie banner:** the site sets no tracking or advertising cookies, so none is needed. Revisit
  this if marketing pixels (Meta, Google Ads) are ever added; those need consent tooling.
- The privacy policy (`/privacy`) names each service: Cloudflare Turnstile, Cloudflare Web
  Analytics, Resend, and Google Maps on request.

## Alcohol compliance

**In place**
- **Age gate:** 21+ confirmation on first visit, with equal "Yes" and "No" buttons. "No" points to
  responsible-drinking resources. The answer is remembered for a year.
- **Footer on every page:** "You must be 21 or older to purchase alcohol. Please drink
  responsibly." Prices and availability can change; call to confirm.
- **`/responsible-drinking`:** don't drink and drive, don't buy for minors, a pregnancy warning,
  the SAMHSA helpline 1-800-662-4357, responsibility.org and NIAAA.

**Massachusetts rules to review with the ABCC or an attorney before launch (not legal advice)**

Sources: 204 CMR 2.00 (ABCC regulations), M.G.L. c. 138, and the ABCC "Frequently Asked
Questions" (Fall 2025 update), all on mass.gov.

1. **Sunday alcohol hours vs. posted store hours.** Package-store (§ 15) alcohol sales on Sunday
   may not begin before 10:00 a.m. (ABCC FAQ 19). The site shows store hours of 7 a.m.–10 p.m.
   every day. Should the site say "Beer, wine and spirits sold from 10 a.m. on Sundays"? Also
   confirm your weekday alcohol sale hours with the Quincy Licensing Board.
2. **Misleading advertising.** 204 CMR 2.03(2) treats any ad that "directly, or by ambiguity or
   omission tends to deceive" as false. Website prices and stock must match the register, so
   price sync timing matters once the POS feed is live. The footer's "call to confirm" helps but
   doesn't excuse wrong prices.
3. **Only advertise what you regularly stock.** 204 CMR 2.03(3) bars advertising brands not
   "regularly and usually kept for sale." The catalog comes from a one-time POS export, and 1,888
   of its 7,963 rows have a 0 in the number column (meaning still unconfirmed). Discontinued items should be marked inactive,
   so they disappear from the site.
4. **No below-cost deals.** 204 CMR 2.04(1) bars selling or offering alcohol below invoiced cost,
   by any "device, promotion or scheme." Check every deal entered in `/admin/deals` against invoice
   cost.
5. **No alcohol as prizes.** 204 CMR 2.04(2) bars donating alcohol as prizes in games of chance,
   so no alcohol giveaways or sweepstakes on the site or social media.
6. **Price lists.** 204 CMR 2.02(2) bars false or fictitious price lists. This covers the
   website's prices and the "was / now" sale display; a "was" price must be a real former price.
7. **Delivery.** Under c. 138 § 41, delivering alcohol from anywhere other than a private home is
   presumed to be a sale. The old prototype linked to DoorDash and Uber Eats; those links were
   placeholders and are not on the new site. Confirm the store's delivery arrangements comply
   before linking any delivery service for alcohol.
8. **Tastings.** § 15 package stores may hold tastings under conditions in c. 138. Check those
   conditions before advertising any tasting event.
9. **Local license conditions.** The Quincy Licensing Board may attach conditions (hours, signs,
   advertising) to the store's license. Check the license itself.
