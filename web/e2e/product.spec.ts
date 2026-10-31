import { test, expect } from "./fixtures";

test("product page shows the product, how to get it, and related items", async ({ page }) => {
  await page.goto("/p/coors-light-30-pk");
  await expect(page.getByRole("heading", { level: 1, name: "Coors Light 30 pk" })).toBeVisible();
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Beer & Seltzers" })).toHaveAttribute("href", "/c/beer");
  await expect(page.locator('main a[href="tel:+16174726455"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^More in / })).toBeVisible();
  const related = page.locator("main article a").first();
  const href = await related.getAttribute("href");
  await related.click();
  await expect(page).toHaveURL(href!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("unknown products get a real 404 page", async ({ page }) => {
  const res = await page.goto("/p/not-a-real-product");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
});

test("the product page carries breadcrumb structured data", async ({ page }) => {
  await page.goto("/p/coors-light-30-pk");
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.map((x) => JSON.parse(x)["@type"])).toContain("BreadcrumbList");
});
