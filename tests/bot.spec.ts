// Mirrors the EdTech Challenge grading bot. Run: npm run test:bot  (BASE_URL=https://… for the live app)
import { expect, test, type Browser, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const DOMAIN = process.env.TEST_EMAIL_DOMAIN ?? "example.com";
const TABLES = ["applications", "profiles", "documents", "comparisons", "ai_runs"];

const rand = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const user1 = { email: `bot-${rand().toLowerCase()}@${DOMAIN}`, password: `Test-${rand()}` };
const user2 = { email: `bot-${rand().toLowerCase()}@${DOMAIN}`, password: `Test-${rand()}` };
const itemText = `QA-${rand()} grading bot test`;

test.describe.configure({ mode: "serial" });

async function signup(page: Page, u: typeof user1) {
  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(u.email);
  await page.getByTestId("signup-password").fill(u.password);
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
}

async function freshPage(browser: Browser) {
  const ctx = await browser.newContext();
  return { ctx, page: await ctx.newPage() };
}

test("landing works on laptop and phone", async ({ browser }) => {
  for (const vp of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.screenshot({ path: `test-results/landing-${vp.width}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
    await ctx.close();
  }
});

test("privacy page is public", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page).toHaveURL(/\/privacy$/);
});

test("sign up, add an item without AI calls, log out", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
  });
  await signup(page, user1);
  await page.getByTestId("core-input").fill(itemText);
  await page.getByTestId("core-submit").click();
  await expect(page.getByTestId("core-item").filter({ hasText: itemText })).toBeVisible();
  expect(apiCalls, "adding an item must not call AI routes").toEqual([]);

  for (const path of ["/", "/app", "/app/applications", "/app/compare", "/profile", "/login", "/signup", "/privacy"]) {
    await page.goto(path);
    await expect(page.getByTestId("logout"), `logout on ${path}`).toBeVisible();
  }
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("other browser: wrong password rejected, right password keeps the item", async ({ browser }) => {
  const { ctx, page } = await freshPage(browser);
  await page.goto("/login");
  await page.getByTestId("login-email").fill(user1.email);
  await page.getByTestId("login-password").fill("wrong-" + user1.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByTestId("login-password").fill(user1.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
  await expect(page.getByTestId("core-item").filter({ hasText: itemText })).toBeVisible();
  await ctx.close();
});

test("a second user cannot see the first user's item", async ({ browser }) => {
  const { ctx, page } = await freshPage(browser);
  await signup(page, user2);
  await expect(page.getByTestId("core-input")).toBeVisible();
  await expect(page.getByTestId("core-item").filter({ hasText: itemText })).toHaveCount(0);
  await ctx.close();
});

test("pasting a URL saves it immediately", async ({ browser }) => {
  const { ctx, page } = await freshPage(browser);
  await page.goto("/login");
  await page.getByTestId("login-email").fill(user2.email);
  await page.getByTestId("login-password").fill(user2.password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 15_000 });
  const url = `https://careers.example.com/jobs/${rand()}`;
  await page.getByTestId("core-input").fill(url);
  await page.getByTestId("core-submit").click();
  await expect(page.getByTestId("core-item").filter({ hasText: url })).toBeVisible();
  await ctx.close();
});

test("no data readable without logging in", async ({ request, page }) => {
  for (const table of TABLES) {
    const res = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (res.ok()) expect(await res.json(), `anon read of ${table}`).toEqual([]);
  }
  for (const api of ["/api/analyze", "/api/compare", "/api/generate"]) {
    const res = await request.post(api, { data: {} });
    expect(res.status(), `${api} rejects logged-out users`).toBe(401);
  }
  for (const path of ["/app", "/app/applications", "/profile"]) {
    await page.goto(path);
    await expect(page, `${path} redirects when logged out`).toHaveURL(/\/login$/);
  }
});
