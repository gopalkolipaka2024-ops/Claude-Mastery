import { defineConfig } from "@playwright/test";

/*
  End-to-end and visual regression tests against a production build.
    npm run build && npm run test:e2e          (starts the server itself on port 3100)
    npm run test:e2e -- --update-snapshots     (after an intended visual change)
  Screenshots are compared within 2% of pixels, so font antialiasing differences between
  machines don't fail the run but a moved or missing element does.
  Against a deployed site (preview, staging): E2E_BASE_URL=https://... npm run test:e2e -- --grep-invert @visual
*/
const PORT = 3100;
const remote = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled", caret: "hide" } },
  use: { baseURL: remote ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1366, height: 900 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: remote ? undefined : {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true, // in CI, the server started for the earlier checks (same build)
    timeout: 60_000,
  },
});
