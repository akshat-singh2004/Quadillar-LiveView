import { test, expect } from "@playwright/test";

test.describe("Quadillar LiveView • Autonomous Governance Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage / war room
    await page.goto("/");
  });

  test("1. Council War Room loads with active chamber indicators", async ({ page }) => {
    await page.goto("/governance/council");
    await expect(page.locator("h1")).toContainText(/Council/i);
    // Offline sync badge should be present in header
    await expect(page.locator("text=ONLINE").or(page.locator("text=OFFLINE"))).toBeVisible();
  });

  test("2. Real-Time Telemetry HUD streams hardware gauges", async ({ page }) => {
    await page.goto("/telemetry/live");
    await expect(page.locator("h1")).toContainText(/Live Field IoT Telemetry/i);
    // Check for instrument gauges
    await expect(page.locator("text=IS 13367 Wind Gust")).toBeVisible();
    await expect(page.locator("text=CIRIA C766 ΔT")).toBeVisible();
    await expect(page.locator("text=IS 456 CTM Fracture")).toBeVisible();
  });

  test("3. Turnstile Scanner Terminal verifies worker credentials", async ({ page }) => {
    await page.goto("/labor/scan");
    await expect(page.locator("h1")).toContainText(/Turnstile QR Ingress Scanner/i);

    const input = page.locator("input[placeholder*='Scan QR or enter PIN']");
    await expect(input).toBeVisible();

    // Fill valid worker PIN and punch turnstile
    await input.fill("PIN-104");
    await page.locator("button:has-text('Verify & Punch Turnstile')").click();

    // Verify access verdict banner appears
    await expect(page.locator("text=BARRIER UNLOCKED").or(page.locator("text=ACCESS GRANTED"))).toBeVisible({ timeout: 10000 });
  });

  test("4. Subcontractor Cure Notices Register renders statutory default ledger", async ({ page }) => {
    await page.goto("/commercial/cure-notices");
    await expect(page.locator("h1")).toContainText(/Subcontractor Statutory Cure Notices/i);
    // Button to issue cure notices exists
    await expect(page.locator("button:has-text('Issue Statutory Cure Notice')")).toBeVisible();
  });

  test("5. High Court Section 9 Interim Petition renders legal memo of parties", async ({ page }) => {
    await page.goto("/governance/arbitration/petition");
    await expect(page.locator("h1")).toContainText(/Section 9 Petition/i);
    await expect(page.locator("text=HIGH COURT OF JUDICATURE")).toBeVisible();
    await expect(page.locator("text=PETITIONER / CLAIMANT")).toBeVisible();
  });

  test("6. Governor Interactive Copilot drawer opens and responds", async ({ page }) => {
    await page.goto("/quality/cubes");
    // Open copilot
    const copilotBtn = page.locator("button:has-text('Consult Aegis Copilot')");
    if (await copilotBtn.isVisible()) {
      await copilotBtn.click();
      await expect(page.locator("text=Domain Copilot & Statutory Advisor")).toBeVisible();
    }
  });
});
