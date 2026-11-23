import { defineConfig, devices } from "@playwright/test";

if (process.env.BOOKMARKS_TEST_RUN !== "1") throw new Error("Use the isolated verification harness.");
const baseURL = process.env.BOOKMARKS_TEST_BASE_URL;
if (!baseURL || !/^http:\/\/127\.0\.0\.1:\d+$/.test(baseURL)) throw new Error("An owned loopback server is required.");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: `test-results/${process.env.BOOKMARKS_TEST_SCENARIO}`,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: `playwright-report/${process.env.BOOKMARKS_TEST_SCENARIO}` }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The harness owns startup/shutdown. Never reuse a developer's server.
});
