import { test, expect } from "./fixtures";

test("empty form lists each error, links to the field, and marks it invalid", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  const summary = page.getByText("Please fix these 3 things:");
  await expect(summary).toBeVisible();
  for (const field of ["Name", "Email", "Message"]) await expect(page.getByRole("link", { name: new RegExp(`^${field}:`) })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("link", { name: /^Email:/ }).click();
  await expect(page).toHaveURL(/#email$/);
});

test("a valid message is accepted, or the visitor is told to call when sending isn't set up", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Test Visitor");
  await page.getByLabel("Email").fill("visitor@example.com");
  await page.getByLabel("Message").fill("Do you carry Narragansett tall boys?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Thanks\. Your message was sent\.|Online messages aren.t switched on yet/)).toBeVisible();
  await expect(page.getByLabel("Email")).not.toHaveAttribute("aria-invalid", "true");
});
