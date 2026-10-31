import { test, expect, resultCount } from "./fixtures";

test("suggestions appear while typing and the keyboard picks one", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("combobox", { name: "Search products" });
  await box.fill("coors");
  const list = page.getByRole("listbox", { name: "Search suggestions" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("option").first()).toBeVisible();
  await box.press("ArrowDown");
  await expect(box).toHaveAttribute("aria-activedescendant", /opt-0$/);
  await box.press("Enter");
  await expect(page).not.toHaveURL(/\/$/);
});

test("pressing Enter searches; synonyms and typos still find products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Search products" }).fill("coors lite");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=coors(\+|%20)lite/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("coors lite");
  expect(await resultCount(page)).toBeGreaterThan(0);
  await expect(page.locator("main article").first()).toContainText(/Coors Light/i);
});

test("no results shows a helpful empty state", async ({ page }) => {
  await page.goto("/search?q=zzqxv");
  await expect(page.getByRole("heading", { name: /No matches for/ })).toBeVisible();
});
