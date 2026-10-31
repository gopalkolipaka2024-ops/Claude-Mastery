import { test as base, expect, type Page } from "@playwright/test";

/** Every test starts as a returning 21+ visitor unless it opts out with `ageConfirmed: false`. */
export const test = base.extend<{ ageConfirmed: boolean }>({
  ageConfirmed: [true, { option: true }],
  context: async ({ context, ageConfirmed, baseURL }, use) => {
    if (ageConfirmed) await context.addCookies([{ name: "asm_age_ok", value: "1", url: baseURL! }]);
    await use(context);
  },
});
export { expect };

/** The number in "1,234 products" above a listing. */
export async function resultCount(page: Page) {
  const text = await page.locator("main p[aria-live]").first().textContent();
  return Number(text?.replace(/[^\d]/g, ""));
}
