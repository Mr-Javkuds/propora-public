import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "locale.playwright.mjs",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
