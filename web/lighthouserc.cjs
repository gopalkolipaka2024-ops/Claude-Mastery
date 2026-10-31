// Lighthouse CI: mobile emulation with simulated slow 4G (Lighthouse defaults), median of 7 runs.
// Budgets from the performance spec. INP can't be measured in a page-load test; Total Blocking
// Time is its lab stand-in (field INP is collected by real-user monitoring).
const PAGES = ["/", "/c/beer", "/search?q=coors", "/p/coors-light-30-pk"];
const base = "http://localhost:3100";

// Judge each value by its median across runs, not the best run (Lighthouse CI's default).
const median = (rule) => [rule[0], { ...rule[1], aggregationMethod: "median" }];
const budgets = Object.fromEntries(Object.entries({
  "categories:performance": ["error", { minScore: 0.95 }],
  "categories:accessibility": ["error", { minScore: 0.95 }],
  "categories:best-practices": ["error", { minScore: 0.95 }],
  "categories:seo": ["error", { minScore: 0.95 }],
  "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
  "total-blocking-time": ["error", { maxNumericValue: 200 }],
}).map(([k, v]) => [k, median(v)]));

module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start -- -p 3100",
      startServerReadyPattern: "Ready",
      url: PAGES.map((p) => base + p),
      numberOfRuns: 7,
      settings: { chromeFlags: "--headless=new --no-sandbox", extraHeaders: JSON.stringify({ Cookie: "asm_age_ok=1" }) },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: "^(?!.*/search).*$", assertions: budgets },
        // Search results are deliberately noindex (Google advises keeping internal search pages
        // out of the index), so the crawlability audit is skipped there; every other SEO audit still counts.
        { matchingUrlPattern: ".*/search.*", assertions: { ...budgets, "categories:seo": "off", "is-crawlable": "off",
          "document-title": "error", "meta-description": "error", "link-text": "error", "crawlable-anchors": "error", "hreflang": "error", "canonical": "error" } },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
