import localFont from "next/font/local";

/* Two self-hosted families. next/font serves them from our own domain, preloads them,
   and uses font-display: swap with a metric-matched fallback to avoid layout shift. */
export const display = localFont({
  src: [{ path: "./fonts/big-shoulders-display-latin-800-normal.woff2", weight: "800", style: "normal" }],
  variable: "--font-display-face",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const sans = localFont({
  // Normal style only: the site never sets body text in italic, so the italic file (28 KB) isn't shipped.
  src: [{ path: "./fonts/public-sans-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-sans-face",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});
