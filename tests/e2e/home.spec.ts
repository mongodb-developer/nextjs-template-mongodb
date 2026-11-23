import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("renders the template hero content", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Next.js with MongoDB" })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /Deploy to Vercel/i })
    ).toBeVisible();
  });

  test("shows a successful MongoDB connection status", async ({ page }) => {
    await page.goto("/");

    // The status badge text is produced by db/connection-status.ts after a
    // successful `ping`. A reachable MongoDB instance is required for this to pass.
    await expect(
      page.getByText("Database connected", { exact: true })
    ).toBeVisible();
  });
});
