import { test, expect } from "./fixtures";

test.use({ ageConfirmed: false });

test("first visit asks for age; 'No' explains, 'Yes' is remembered", async ({ page, context }) => {
  await page.goto("/");
  const gate = page.getByRole("dialog", { name: "Are you 21 or older?" });
  await expect(gate).toBeVisible();
  await gate.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Sorry" })).toContainText("You must be 21 or older");
  await page.getByRole("dialog").getByRole("button", { name: "Go back", exact: true }).click();
  await gate.getByRole("button", { name: "Yes, I'm 21+", exact: true }).click();
  await expect(gate).toBeHidden();
  expect((await context.cookies()).find((c) => c.name === "asm_age_ok")?.value).toBe("1");
  await page.goto("/c/beer");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("product content is in the page even before the age question is answered (for search engines)", async ({ request }) => {
  const html = await (await request.get("/p/coors-light-30-pk")).text();
  expect(html).toContain("Coors Light 30 pk");
});
