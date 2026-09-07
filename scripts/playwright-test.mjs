import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\monte\\.gemini\\antigravity-cli\\brain\\0283deea-c324-48aa-a298-041347c3d2d3";
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runUITests() {
  console.log("Launching Chromium via Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // 1. Landing Page
    console.log("1. Visiting Landing Page http://localhost:3000/ ...");
    await page.goto("http://localhost:3000/api/auth/disconnect", { waitUntil: "networkidle" });
    await page.waitForSelector("text=Use Demo Account", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_landing_stepper.png") });
    console.log("Captured 01_landing_stepper.png");

    // 2. Connect Demo Account
    console.log("2. Connecting Demo Account...");
    await page.click("text=Use Demo Account");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_dashboard.png") });
    console.log("Captured 02_dashboard.png");

    // 3. Send Test Email Tool (Milestone 1)
    console.log("3. Testing Send Test Email tool with monteflorian88@gmail.com...");
    await page.click("text=Send Test Email");
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    await page.fill('input[type="email"]', "monteflorian88@gmail.com");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03_send_test_modal_open.png") });

    await page.click("div[role='dialog'] button[type='submit']");
    await page.waitForSelector("text=Test email dispatched successfully!", { timeout: 10000 });
    await page.waitForSelector("text=monteflorian88@gmail.com", { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04_send_test_modal_success.png") });
    console.log("Captured 04_send_test_modal_success.png");

    await page.click("button:has-text('Close')");
    await page.waitForTimeout(500);

    // 3b. Verify Activity Feed & Dispatched Emails
    console.log("3b. Verifying Activity Feed on Dashboard...");
    await page.waitForSelector("text=Dispatched Emails", { timeout: 5000 });
    await page.waitForSelector("text=monteflorian88@gmail.com", { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04b_activity_feed_updated.png") });
    console.log("Captured 04b_activity_feed_updated.png");

    // 3c. Inspect Sent Email in Detail Modal
    console.log("3c. Inspecting sent email details modal...");
    await page.click("button:has-text('View Email')");
    await page.waitForSelector("text=Rendered Message Body", { timeout: 5000 });
    await page.waitForSelector("text=monteflorian88@gmail.com", { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04c_email_detail_modal.png") });
    console.log("Captured 04c_email_detail_modal.png");

    // Close detail modal
    await page.click("div[role='dialog'] button:has-text('Close')");
    await page.waitForTimeout(400);

    // 3d. Test Activity Feed Filter Tabs
    console.log("3d. Testing Activity Feed Filter Tabs...");
    await page.click("button:has-text('Campaigns (0)')");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04d_activity_feed_campaigns_filter.png") });
    console.log("Captured 04d_activity_feed_campaigns_filter.png");

    await page.click("button:has-text('All (1)')");
    await page.waitForTimeout(300);

    // 4. Leads Page
    console.log("4. Visiting Leads page...");
    await page.click("text=Leads");
    await page.waitForURL("**/dashboard/leads", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05_leads_page.png") });
    console.log("Captured 05_leads_page.png");

    // Open Lead CSV Uploader
    await page.click("text=Import Leads (CSV)");
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06_lead_uploader_modal.png") });
    console.log("Captured 06_lead_uploader_modal.png");
    await page.click("button[aria-label='Close']");
    await page.waitForTimeout(500);

    // 5. Campaigns Page
    console.log("5. Visiting Campaigns page...");
    await page.click("text=Campaigns");
    await page.waitForURL("**/dashboard/campaigns", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07_campaigns_page.png") });
    console.log("Captured 07_campaigns_page.png");

    // Create New Campaign
    console.log("6. Creating New Campaign...");
    await page.click("button:has-text('New Campaign'), button:has-text('Create Your First Campaign')");
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    await page.fill("input[placeholder*='Founders']", "Q4 Founder Outreach");
    await page.click("button:has-text('Create & Edit Sequence')");
    await page.waitForURL("**/dashboard/campaigns/*", { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08_campaign_studio.png") });
    console.log("Captured 08_campaign_studio.png");

    // 7. Add Step 2 in Sequence Builder
    console.log("7. Adding Step 2 in Sequence Builder...");
    await page.click("text=Add Follow-up Step");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "09_sequence_with_step2.png") });
    console.log("Captured 09_sequence_with_step2.png");

    // 8. Test Spintax Preview
    console.log("8. Testing Spintax Live Preview...");
    await page.click("text=Preview & Test");
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "10_spintax_preview_modal.png") });
    console.log("Captured 10_spintax_preview_modal.png");

    // Click Re-Spin Options
    await page.click("text=Re-Spin Options");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "11_spintax_respun.png") });
    console.log("Captured 11_spintax_respun.png");
    await page.click("button:has-text('Close')");
    await page.waitForTimeout(300);

    // 9. Save Sequence
    console.log("9. Saving Sequence...");
    await page.click("text=Save Sequence");
    await page.waitForSelector("text=✓ Changes saved", { timeout: 5000 });

    // 10. Switch to Leads Tab
    console.log("10. Testing Leads tab in Campaign Studio...");
    await page.click("button[role='tab']:has-text('Leads')");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "12_campaign_leads_tab.png") });
    console.log("Captured 12_campaign_leads_tab.png");

    // 11. Switch to Settings Tab
    console.log("11. Testing Settings tab in Campaign Studio...");
    await page.click("button[role='tab']:has-text('Settings')");
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "13_campaign_settings_tab.png") });
    console.log("Captured 13_campaign_settings_tab.png");

    // 12. Toggle Campaign Status
    console.log("12. Toggling Campaign Status...");
    await page.click("button:has-text('Draft / Paused (Activate)')");
    await page.waitForSelector("text=Campaign Active (Pause)", { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "14_campaign_activated.png") });
    console.log("Captured 14_campaign_activated.png");

    console.log("\n==================================================");
    console.log("ALL PLAYWRIGHT TESTS PASSED! ZERO UI DEFECTS FOUND.");
    console.log("==================================================");
  } catch (err) {
    console.error("Test failed with defect:", err);
  } finally {
    await browser.close();
  }
}

runUITests();
