# Launch checklist

The site is **not live**. Work through this when you decide to launch. Items marked
**(owner)** need your accounts or decisions; the rest are checks to run.

## Before launch

**Data and content**
- [ ] (owner) Bottle POS feed connected (webhook or scheduled export) with price, stock, UPC and
      item IDs. Until then the site shows "Call for price" and no stock badges.
- [ ] (owner) The meaning of the export's number column confirmed, and the low-stock
      threshold set (`src/config/stock.ts`).
- [ ] (owner) Discontinued items marked inactive in the feed, so only regularly stocked items
      are listed (204 CMR 2.03(3)).
- [ ] (owner) Contact email, holiday hours, parking details and deli menu provided; the email
      and holidays entered in admin.
- [ ] (owner) Legal review of the items in [security-and-compliance.md](security-and-compliance.md#alcohol-compliance),
      including Sunday alcohol hours (sales from 10 a.m.) versus 7 a.m. store hours.

**Accounts and settings** (see [runbook.md](runbook.md#first-time-setup))
- [ ] Cloudflare: resources created, secrets set, Access protecting `/admin`, staging and previews.
- [ ] Neon: production and staging branches, roles applied, catalog synced.
- [ ] Contact form: Turnstile and Resend keys set; a test message arrives at `CONTACT_TO`.
- [ ] Sentry DSN set; a test error appears (open the browser console on the site and run
      `setTimeout(() => { throw new Error("launch test") })`).
- [ ] Cloudflare Web Analytics on; the dashboard shows visits.
- [ ] GitHub: `production` environment with required reviewer, `BACKUP_PASSPHRASE` saved in a
      password manager.

**Domain, HTTPS and redirects**
- [ ] Domain on Cloudflare; `routes` set in `wrangler.jsonc` for the bare name and `www`;
      `workers_dev` set to false for production.
- [ ] `SITE_URL` (production environment) is the canonical address, e.g. `https://example.com`.
- [ ] *Always Use HTTPS* on, minimum TLS 1.2. `curl -sI http://<domain>` returns 301 to `https://`.
- [ ] The other spelling 301s: `curl -sI https://www.<domain>/c/beer` returns
      `location: https://<domain>/c/beer` (or the reverse).
- [ ] 301s in place for old addresses. The old prototype was a single page, so there are no
      old deep links. Renamed products redirect automatically (`slug_redirects`). If the store
      had an earlier website on this domain, list its main URLs and add redirects for them.

## Launch day

- [ ] Set `PRODUCTION_ENABLED=true`, run **Deploy** → `production`, approve. The health check passes.
- [ ] `https://<domain>/api/health` shows `"status":"ok"`.
- [ ] Spot-check: home, a category with filters, search, a product, store hours, contact form,
      `/admin` sign-in, the age gate in a private window.
- [ ] `https://<domain>/robots.txt` **allows** crawling and lists the sitemap. If it says
      `Disallow: /`, `SITE_INDEXABLE` wasn't set for the build.
- [ ] View a page's source: `<meta name="robots" content="index, follow">` and canonical links
      on the real domain.

## Right after launch

- [ ] **Google Search Console:** add the domain property (verify with a DNS record in Cloudflare),
      submit `https://<domain>/sitemap.xml`, and check *Pages* for errors over the next days.
- [ ] **Bing Webmaster Tools:** import from Search Console, which also submits the sitemap.
- [ ] **Google Business Profile:** set the website field to `https://<domain>`. Check the name,
      address, phone and hours match the site exactly.
- [ ] **Rich results:** test a product page and the store page in Google's Rich Results Test.
      Product results appear only once prices are in the feed.
- [ ] **Uptime monitor:** keyword monitor on `/api/health` sends a test alert to your phone.
- [ ] **Backups:** run **Database backup** once by hand, download the artifact and confirm it
      decrypts with the passphrase. Check Neon's point-in-time restore window.
- [ ] **Analytics:** after a week, Cloudflare Web Analytics → Core Web Vitals shows LCP < 2.5 s,
      INP < 200 ms, CLS < 0.1 for at least 75% of visits.
- [ ] **Rollback drill:** run **Roll back** on staging once so the steps are familiar.
