import { expect, test } from "@playwright/test";

test("home loads and shows watchlists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Watchlists")).toBeVisible();
});

test("symbol route loads", async ({ page }) => {
  await page.goto("/s/AAPL");
  await expect(page.getByText("AAPL")).toBeVisible();
});

