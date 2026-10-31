import { test, expect, resultCount } from "./fixtures";

test("filters, sort and load more are shareable URLs and Back undoes them", async ({ page, isMobile }) => {
  test.skip(isMobile, "the phone sheet is covered below");
  await page.goto("/c/beer");
  const all = await resultCount(page);
  await page.getByRole("complementary", { name: "Filters" }).getByRole("link", { name: /^Light beer/ }).click();
  await expect(page).toHaveURL(/aisle=light-beer/);
  await expect.poll(() => resultCount(page)).toBeLessThan(all);
  const filtered = await resultCount(page);
  await page.getByLabel("Sort by").selectOption("name-asc");
  await expect(page).toHaveURL(/sort=name-asc/);
  const names = await page.locator("main article h3").allTextContents();
  expect(names.slice(0, 5)).toEqual([...names.slice(0, 5)].sort((a, b) => a.localeCompare(b)));
  expect(await resultCount(page)).toBe(filtered);
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/c\/beer$/);
  await expect.poll(() => resultCount(page)).toBe(all);
  await page.getByRole("link", { name: /Load \d+ more/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator("main article")).toHaveCount(72);
});

test("phone: the filter sheet applies a filter and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/c/beer");
  const all = await resultCount(page);
  await page.getByRole("button", { name: /^Filter/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filter" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("link", { name: /^Light beer/ }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/aisle=light-beer/);
  await expect.poll(() => resultCount(page)).toBeLessThan(all);
  await expect(page.getByRole("button", { name: /^Filter/ })).toContainText("1");
});
