import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const local = baseURL.startsWith("http://localhost");

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: local
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
