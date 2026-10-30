// Checks every text/background pair the components use against WCAG 2.2 AA.
// Normal text needs 4.5:1; large text (24px+, or 18.66px+ bold) and UI parts need 3:1.
// Reads hex values straight from src/styles/tokens.css. Exits 1 on any failure.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum, where it's used]
const pairs = [
  ["neutral-900", "neutral-0", 4.5, "body text on cards"],
  ["neutral-900", "neutral-25", 4.5, "body text on page"],
  ["neutral-600", "neutral-0", 4.5, "muted text on cards"],
  ["neutral-600", "neutral-25", 4.5, "muted text on page"],
  ["neutral-600", "neutral-50", 4.5, "muted text on sunken surfaces"],
  ["neutral-500", "neutral-0", 4.5, "subtle text (counts, captions)"],
  ["neutral-0", "brand-700", 4.5, "primary button / header"],
  ["neutral-0", "brand-600", 4.5, "primary button hover"],
  ["brand-700", "neutral-0", 4.5, "links and headings"],
  ["brand-700", "brand-50", 4.5, "selected chip"],
  ["accent-600", "neutral-0", 4.5, "sale price"],
  ["accent-700", "accent-50", 4.5, "sale tag"],
  ["neutral-0", "accent-600", 4.5, "accent button"],
  ["success-700", "success-50", 4.5, "In stock badge"],
  ["success-600", "neutral-0", 4.5, "open-now text"],
  ["warning-700", "warning-50", 4.5, "Low stock badge"],
  ["danger-700", "danger-50", 4.5, "Out of stock badge / error"],
  ["danger-600", "neutral-0", 4.5, "form error text"],
  ["info-700", "info-50", 4.5, "info banner"],
  ["neutral-0", "neutral-900", 4.5, "toast"],
  ["info-600", "neutral-0", 3, "focus ring on white"],
  ["info-600", "neutral-25", 3, "focus ring on page"],
  ["neutral-500", "neutral-0", 3, "input borders (UI component)"],
];

let failed = 0;
for (const [fg, bg, min, use] of pairs) {
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (needs ${min})  ${fg} on ${bg}  — ${use}`);
}
if (failed) {
  console.error(`\n${failed} pair(s) below WCAG 2.2 AA.`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length} pairs meet WCAG 2.2 AA.`);
