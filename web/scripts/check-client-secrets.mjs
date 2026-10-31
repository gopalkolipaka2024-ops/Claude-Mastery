// Fails if a server secret could reach browsers: scans every file Next.js serves to the client
// (.next/static and public/) for the values of server-only environment variables, and for
// anything shaped like a credential. CI builds with fake "canary" values in these variables so
// a leak shows up even without real secrets.
// usage: node scripts/check-client-secrets.mjs   (after `next build`)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SERVER_ONLY = ["DATABASE_URL", "DATABASE_URL_WRITE", "DATABASE_URL_OWNER", "POS_WEBHOOK_SECRET", "REVALIDATE_TOKEN",
  "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "CF_ACCESS_AUD", "ADMIN_EMAILS", "CONTACT_TO"];
const PATTERNS = [
  [/postgres(?:ql)?:\/\/[^:\s"'/]+:[^@\s"']+@/, "database URL with a password"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/, "Resend API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\b(?:sk|rk)_live_[A-Za-z0-9]{10,}/, "live secret key"],
  [/\bghp_[A-Za-z0-9]{30,}/, "GitHub token"],
];
const values = SERVER_ONLY.map((k) => [k, process.env[k]]).filter(([, v]) => v && v.length >= 8);

function* files(dir) {
  let names = [];
  try { names = readdirSync(dir); } catch { return; }
  for (const n of names) { const p = join(dir, n); if (statSync(p).isDirectory()) yield* files(p); else yield p; }
}
const found = [];
let count = 0;
for (const f of [...files(".next/static"), ...files("public")]) {
  count++;
  const text = readFileSync(f, "latin1");
  for (const [k, v] of values) if (text.includes(v)) found.push(`${f}: value of ${k}`);
  for (const [re, what] of PATTERNS) if (re.test(text)) found.push(`${f}: looks like a ${what}`);
}
if (!count) { console.error("No client files found. Run `next build` first."); process.exit(1); }
if (found.length) { console.error("Secrets in files sent to browsers:\n  " + found.join("\n  ")); process.exit(1); }
console.log(`pass no secrets in ${count} client files (checked ${values.length} server-only values and ${PATTERNS.length} credential patterns)`);
