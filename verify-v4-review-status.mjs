import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const contextModal = () => page.locator(".v4-five-channel-modal");
const channelReview = () => page.locator(".v4-channel-review");
const aboutHeadingRow = (scope) => scope.locator(".v4-status-heading-row");
const statusControls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});
const saturdayCard = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
}).locator(".combined-target-card");

async function selectVersionFour() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
}

async function openOriginalGoogle() {
  await saturdayCard().click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await contextModal().waitFor();
}

async function expectBadge(scope, status, tone) {
  const headingRow = aboutHeadingRow(scope);
  const badge = headingRow.locator(".v4-content-status");
  await headingRow.waitFor();
  await badge.waitFor();
  assert.match((await headingRow.locator("h2, strong").textContent()).trim(), /^About this /);
  assert.equal(await scope.locator(".v4-content-title-row .v4-content-status").count(), 0);
  assert.equal(
    await badge.evaluate((node) => node.parentElement?.classList.contains("v4-status-heading-row")),
    true,
  );
  assert.equal(await badge.getAttribute("data-status"), status);
  assert.equal(
    await badge.evaluate((node, className) => node.classList.contains(className), `v4-summary-status--${tone}`),
    true,
  );
  const label = {
    suggested: "Suggested",
    scheduled: "Scheduled",
    sent: "Sent",
    missed: "Missed",
    error: "Error",
  }[status];
  assert.equal((await badge.textContent()).replace(/\s+/g, " ").trim(), label);
  assert.equal(await badge.getAttribute("aria-label"), `Content status: ${label}`);
  assert.equal(await badge.locator(".v4-status-dot[aria-hidden='true']").count(), 1);
}

async function waitForGeneratedPreview() {
  const glimmer = contextModal().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
  await openOriginalGoogle();

  // Original calendar content uses the current channel status on both preview and review titles.
  await expectBadge(contextModal(), "suggested", "informative");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectBadge(channelReview(), "suggested", "informative");
  const aboutGeometry = await aboutHeadingRow(channelReview()).evaluate((row) => {
    const heading = row.querySelector("strong").getBoundingClientRect();
    const badge = row.querySelector(".v4-content-status").getBoundingClientRect();
    return {
      baselineOffset: Math.abs(heading.bottom - badge.bottom),
      rightEdgeOffset: Math.abs(row.getBoundingClientRect().right - badge.right),
    };
  });
  assert.ok(aboutGeometry.baselineOffset <= 8, `badge baseline offset was ${aboutGeometry.baselineOffset}px`);
  assert.ok(aboutGeometry.rightEdgeOffset <= 1, `badge right edge offset was ${aboutGeometry.rightEdgeOffset}px`);
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  await statusControls().getByRole("button", { name: "Scheduled", exact: true }).click();
  await expectBadge(contextModal(), "scheduled", "success");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectBadge(channelReview(), "scheduled", "success");
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  // Schedule cancellation immediately restores the canonical Suggested state.
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show scheduled post options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await expectBadge(contextModal(), "suggested", "informative");

  await statusControls().getByRole("button", { name: "Missed", exact: true }).click();
  await expectBadge(contextModal(), "missed", "warning");

  await statusControls().getByRole("button", { name: "Error", exact: true }).click();
  await expectBadge(contextModal(), "error", "critical");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectBadge(channelReview(), "error", "critical");
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  await statusControls().getByRole("button", { name: "Sent", exact: true }).click();
  await expectBadge(contextModal(), "sent", "success");

  // Accepted generated drafts start Suggested and derive later badges from delivery lifecycle.
  await selectVersionFour();
  await page.getByLabel("Add to your marketing calendar").fill("Promote fall cleanup");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await expectBadge(contextModal(), "suggested", "informative");
  await waitForGeneratedPreview();

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await contextModal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: /^Google,/ })
    .click();
  await waitForGeneratedPreview();
  await expectBadge(contextModal(), "scheduled", "success");

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show scheduled post options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await expectBadge(contextModal(), "suggested", "informative");

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await page.getByRole("button", { name: "Close suggested marketing content" }).click();
  const sentGeneratedCard = page.locator(".calendar-day").filter({
    has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }),
  }).locator(".generated-delivery-card");
  await sentGeneratedCard.click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await waitForGeneratedPreview();
  await expectBadge(contextModal(), "sent", "success");

  // Other prototype versions never receive the V4-only content badge.
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  assert.equal(await page.locator(".v4-content-status").count(), 0);

  console.log(
    "Verified V4 About-row badges for Suggested, Scheduled, Sent, Missed, Error, generated lifecycle transitions, cancellation, accessibility text, title-row absence, right alignment, and V5 isolation.",
  );
} finally {
  await browser.close();
}
