import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const flow = () => page.locator(".v4-generated-flow-shell");
const ideaSummary = () => flow().locator(".v4-summary-modal--generated");
const draftReview = () => page.locator(".v4-generated-review");
const exitDialog = () => page.getByRole("dialog", { name: "Save generated content?" });
const generatedCard = () => page.locator(".generated-delivery-card");
const originalCard = () => page.locator(".combined-target-card");
const summaryArtworkPath = "/assets/v4-generated-summary-channel-artwork.png";
const exitBody = "Do you want to save the generated drafts to your calendar? Discarding the drafts will not affected already scheduled or posted content.";
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});

async function resetV4(origin = "calendar") {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  if (origin !== "calendar") {
    await page.getByRole("button", {
      name: origin === "dashboard" ? "Dashboard" : "Ad-hoc",
      exact: true,
    }).click();
  }
}

async function generate(origin, prompt) {
  if (origin === "dashboard") {
    await page.getByLabel("Describe your marketing idea").fill(prompt);
    await page.getByRole("button", { name: "Generate Content", exact: true }).click();
  } else {
    await page.getByLabel("Add to your marketing calendar").fill(prompt);
    await page.getByRole("button", {
      name: "Generate suggested marketing content",
      exact: true,
    }).click();
  }
  await ideaSummary().waitFor({ timeout: 8000 });
}

async function commitDrafts() {
  await ideaSummary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await draftReview().waitFor();
}

async function waitForPreview() {
  const glimmer = draftReview().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
}

async function requestExitWithClose() {
  await draftReview().getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
}

async function assertExitCopy() {
  assert.equal(await exitDialog().getByText(exitBody, { exact: true }).count(), 1);
  assert.equal(await exitDialog().locator("p").count(), 1);
}

async function dismissExit() {
  await assertExitCopy();
  await page.keyboard.press("Escape");
  await exitDialog().waitFor({ state: "detached" });
  await draftReview().waitFor();
}

async function saveAndExit() {
  await assertExitCopy();
  await exitDialog().getByRole("button", { name: "Save and exit", exact: true }).click();
  await exitDialog().waitFor({ state: "detached" });
}

async function discardAndExit() {
  await assertExitCopy();
  await exitDialog().getByRole("button", { name: "Discard and exit", exact: true }).click();
  await exitDialog().waitFor({ state: "detached" });
}

async function assertIdeaOnly(origin) {
  await resetV4(origin);
  await generate(origin, `${origin} winter promotion`);
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await flow().getByLabel("Edit marketing content prompt").count(), 1);
  assert.equal(await ideaSummary().getByText("Suggested channels:", { exact: true }).count(), 1);
  assert.equal(await ideaSummary().getByText("Suggested", { exact: true }).count(), 4);
  assert.equal(await ideaSummary().getByText(/Recommended/).count(), 0);
  assert.equal(await ideaSummary().getByText("Schedule date:", { exact: true }).count(), 0);
  assert.equal(await ideaSummary().locator(".v4-context-preview, .social-card").count(), 0);
  assert.equal(await ideaSummary().getByText("Website", { exact: true }).count(), 0);
  assert.equal(
    new URL(await ideaSummary().locator(".v4-summary-artwork").getAttribute("src"), baseUrl).pathname,
    summaryArtworkPath,
  );

  await flow().getByLabel("Edit marketing content prompt").fill(`${origin} regenerated idea`);
  await flow().getByRole("button", { name: "Regenerate suggestions", exact: true }).click();
  await ideaSummary().waitFor({ timeout: 8000 });
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await ideaSummary().getByText("Suggested", { exact: true }).count(), 4);
  assert.equal(await ideaSummary().getByText(/Recommended/).count(), 0);

  await flow().getByLabel("Close suggested marketing content").click();
  await flow().waitFor({ state: "detached" });
  assert.equal(await exitDialog().count(), 0);
  assert.equal(await generatedCard().count(), 0);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // P1 is recommendation-only and ephemeral for both entry surfaces.
  await assertIdeaOnly("calendar");
  await assertIdeaOnly("dashboard");

  // Dashboard-origin P2 is equally committed and returns to its own entry surface.
  await resetV4("dashboard");
  await generate("dashboard", "Dashboard committed lifecycle");
  await commitDrafts();
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await page.getByRole("button", { name: "Ad-hoc", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await requestExitWithClose();
  await saveAndExit();
  await page.getByLabel("Describe your marketing idea").waitFor();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await generatedCard().count(), 1);

  // P2 commits immediately, removes the prompt, and guards every external exit.
  await resetV4("calendar");
  await generate("calendar", "Guarded generated lifecycle");
  await ideaSummary().getByRole("button", { name: "Review Drafts", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await draftReview().waitFor();
  assert.equal(await generatedCard().count(), 1);
  assert.deepEqual(
    await draftReview().locator(".v4-content-status").allTextContents(),
    ["Suggested"],
  );
  assert.equal(
    await draftReview().locator(`img[src="${summaryArtworkPath}"]`).count(),
    0,
  );
  assert.equal(
    await calendarDay("Saturday, Nov 7").locator(".generated-delivery-card").count(),
    1,
  );
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  assert.equal(await draftReview().getByText("Nov 7, 2026 · 9:00 AM", { exact: true }).count(), 1);
  await draftReview().getByRole("status", { name: "Loading Google preview" }).waitFor();

  // Rapid close is idempotent; focus starts on Save and remains trapped.
  await draftReview().getByRole("button", { name: "Close", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(await exitDialog().count(), 1);
  assert.equal(
    await exitDialog().getByText(exitBody, { exact: true }).count(),
    1,
  );
  assert.equal(await exitDialog().locator("p").count(), 1);
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Save and exit",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Discard and exit",
  );
  await dismissExit();

  // Escape and backdrop are guarded; cancel returns to intact P2.
  await page.keyboard.press("Escape");
  await exitDialog().waitFor();
  await dismissExit();
  await page.locator(".v4-generated-flow-overlay").click({ position: { x: 2, y: 2 } });
  await exitDialog().waitFor();
  await dismissExit();
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);

  // Internal channel/review/editor navigation never opens the exit dialog.
  await waitForPreview();
  await draftReview().getByRole("radio", { name: "Facebook", exact: true }).click();
  await waitForPreview();
  await draftReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true }).click();
  const channelReview = page.locator(".v4-channel-review");
  await channelReview.waitFor();
  assert.equal(await exitDialog().count(), 0);
  await channelReview.locator(".review-field").first()
    .getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator(".v4-social-editor").waitFor();
  assert.equal(await exitDialog().count(), 0);
  await page.locator(".v4-social-editor").getByRole("button", { name: "Cancel", exact: true }).click();
  await channelReview.getByRole("button", { name: "Back", exact: true }).click();
  await draftReview().waitFor();
  assert.equal(await exitDialog().count(), 0);

  // Surface navigation is guarded and Save honors the selected destination.
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();
  await page.getByRole("heading", { name: "Marketing Plan", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Describe your marketing idea").count(), 1);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await generatedCard().count(), 1);

  // Saved drafts reopen through summary into guarded P2.
  await generatedCard().click();
  const calendarSummary = page.locator(".v4-summary-modal--calendar");
  await calendarSummary.waitFor();
  assert.equal(await calendarSummary.locator(".v4-summary-status-list > li").count(), 4);
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await page.locator(".v4-five-channel-modal:not(.v4-generated-review)").waitFor();
  await page.locator(".v4-five-channel-modal:not(.v4-generated-review)")
    .getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();
  assert.equal(await generatedCard().count(), 1);

  // Discard with no protected deliveries removes only the active generated campaign.
  await resetV4("calendar");
  await generate("calendar", "Discard all generated drafts");
  await commitDrafts();
  await requestExitWithClose();
  await discardAndExit();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await originalCard().count(), 1);
  assert.equal(await originalCard().locator(".calendar-channel-label").count(), 5);

  // Discard protects scheduled content and removes every remaining draft.
  await generate("calendar", "Protect scheduled generated content");
  await commitDrafts();
  await waitForPreview();
  await draftReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await requestExitWithClose();
  await discardAndExit();
  assert.equal(await generatedCard().count(), 1);
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 1);
  assert.equal(await generatedCard().locator(".status-scheduled").count(), 1);
  await generatedCard().click();
  await calendarSummary.waitFor();
  assert.equal(await calendarSummary.locator(".v4-summary-status-list > li").count(), 1);
  assert.equal(await calendarSummary.getByText("Scheduled", { exact: true }).count(), 1);
  assert.equal(await calendarSummary.getByText(/Nov 7, 2026 9:00 AM/).count(), 1);
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const protectedReview = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await protectedReview.waitFor();
  assert.equal(await protectedReview.getByRole("radio").count(), 1);
  await protectedReview.getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();

  // Delete All remains destructive even for protected generated content.
  await generatedCard().click();
  await calendarSummary.getByRole("button", { name: "Delete All", exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Improve future recommendations" });
  await deletion.getByLabel("The content isn’t relevant").check();
  await deletion.getByRole("button", { name: "Delete Campaign", exact: true }).click();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await originalCard().count(), 1);

  // P1 closes directly, while version navigation from P2 is guarded and resets cleanly.
  await generate("calendar", "Clean prompt after delete");
  await flow().getByLabel("Close suggested marketing content").click();
  await generate("calendar", "Guard version reset");
  await commitDrafts();
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await exitDialog().waitFor();
  await discardAndExit();
  await page.getByRole("button", { name: "Version 1", exact: true }).waitFor();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await flow().count(), 0);
  assert.equal(await page.getByLabel("Add to your marketing calendar").inputValue(), "");

  console.log(
    "Verified V4 Calendar/Dashboard P1-P2 persistence boundary, guarded exits, save/discard protection, reopen, Delete All, focus, idempotency, and clean reset.",
  );
} finally {
  await browser.close();
}
