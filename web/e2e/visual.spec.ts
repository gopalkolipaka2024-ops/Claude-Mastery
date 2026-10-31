import { test, expect } from "./fixtures";

/* Visual regression: the top of each key page, desktop and phone. The clock is frozen on a
   Wednesday afternoon so "Open now" and today's hours always render the same. */
const PAGES = [["home", "/"], ["category", "/c/beer"], ["search", "/search?q=coors"], ["product", "/p/coors-light-30-pk"], ["store", "/store"]] as const;

for (const [name, path] of PAGES) {
  test(`${name} looks right @visual`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-04T15:00:00-05:00"));
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot(`${name}.png`, { mask: [page.locator("iframe")] });
  });
}
