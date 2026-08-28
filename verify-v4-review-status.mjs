import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const contextModal = () => page.locator(".v4-five-channel-modal");
const channelReview = () => page.locator(".v4-channel-review");
const titleRow = (scope) => scope.locator(".v4-content-title-row");
const aboutHeadingRow = (scope) => scope.locator(
  ".v4-sliding-panel--text.is-active .v4-about-heading, .about-content-row",
);
const statusControls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});
const saturdayCard = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
}).locator(".combined-target-card");

async function selectVersionFour() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openOriginalGoogle() {
  await saturdayCard().click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await contextModal().waitFor();
}

async function expectStatusBadge(badge, status, tone) {
  await badge.waitFor();
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

async function expectContextBadge(status, tone) {
  const scope = contextModal();
  const headingRow = aboutHeadingRow(scope);
  const badge = headingRow.locator(".v4-content-status");
  await headingRow.waitFor();
  assert.match((await headingRow.locator("h2").textContent()).trim(), /^About this /);
  assert.equal(await titleRow(scope).locator(".v4-content-status").count(), 0);
  assert.equal(await badge.count(), 1);
  assert.equal(
    await badge.evaluate((node) => node.parentElement?.classList.contains("v4-status-heading-row")),
    true,
  );
  assert.equal(
    await scope.locator(".v4-context-facts .v4-content-status").count(),
    0,
    "The contextual status badge must stay beside About and never appear in schedule details.",
  );
  await expectStatusBadge(badge, status, tone);
}

async function expectReviewBadge(status, tone, expectedTitle) {
  const scope = channelReview();
  const headingRow = titleRow(scope);
  const badge = headingRow.locator(".v4-content-status");
  await headingRow.waitFor();
  assert.equal((await headingRow.locator("h1").textContent()).trim(), expectedTitle);
  assert.equal(await badge.count(), 1);
  assert.equal(await aboutHeadingRow(scope).locator(".v4-content-status").count(), 0);
  assert.equal(
    await badge.evaluate((node) => node.parentElement?.classList.contains("v4-content-title-row")),
    true,
  );
  assert.equal(
    await scope.locator(".review-fields .v4-content-status").count(),
    0,
    "The review status badge must stay beside the title and never appear in schedule details.",
  );
  await expectStatusBadge(badge, status, tone);
}

async function waitForGeneratedPreview() {
  const glimmer = contextModal().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await openOriginalGoogle();

  // Original calendar content uses the current channel status on both preview and review titles.
  await expectContextBadge("suggested", "informative");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectReviewBadge("suggested", "informative", "Review Google Post");
  const titleGeometry = await titleRow(channelReview()).evaluate((row) => {
    const heading = row.querySelector("h1").getBoundingClientRect();
    const badge = row.querySelector(".v4-content-status").getBoundingClientRect();
    return {
      baselineOffset: Math.abs(heading.bottom - badge.bottom),
      horizontalGap: badge.left - heading.right,
    };
  });
  assert.ok(titleGeometry.baselineOffset <= 8, `badge baseline offset was ${titleGeometry.baselineOffset}px`);
  assert.ok(titleGeometry.horizontalGap >= 8 && titleGeometry.horizontalGap <= 12,
    `badge horizontal gap was ${titleGeometry.horizontalGap}px`);

  const channelTitles = [
    ["Facebook", "Review Facebook Post"],
    ["Instagram", "Review Instagram Post"],
    ["Email", "Review Email Campaign"],
    ["Website", "Review Website Page"],
    ["Google", "Review Google Post"],
  ];
  for (const [channel, expectedTitle] of channelTitles) {
    await channelReview().locator(".channel-icon-switcher--review")
      .getByRole("radio", { name: channel, exact: true })
      .click();
    await expectReviewBadge("suggested", "informative", expectedTitle);
  }
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  await statusControls().getByRole("button", { name: "Scheduled", exact: true }).click();
  await expectContextBadge("scheduled", "success");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectReviewBadge("scheduled", "success", "Review Google Post");
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  // Schedule cancellation immediately restores the canonical Suggested state.
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show scheduled post options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await expectContextBadge("suggested", "informative");

  await statusControls().getByRole("button", { name: "Missed", exact: true }).click();
  await expectContextBadge("missed", "warning");

  await statusControls().getByRole("button", { name: "Error", exact: true }).click();
  await expectContextBadge("error", "critical");
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectReviewBadge("error", "critical", "Review Google Post");
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();

  await statusControls().getByRole("button", { name: "Sent", exact: true }).click();
  await expectContextBadge("sent", "success");

  // Accepted generated drafts start Suggested and derive later badges from delivery lifecycle.
  await selectVersionFour();
  await page.getByLabel("Add to your marketing calendar").fill("Promote fall cleanup");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await expectContextBadge("suggested", "informative");
  await waitForGeneratedPreview();
  for (const channel of ["Facebook", "Instagram", "Email", "Google"]) {
    await contextModal().locator(".channel-icon-switcher--modal-v4")
      .getByRole("radio", { name: channel, exact: true })
      .click();
    await waitForGeneratedPreview();
    await expectContextBadge("suggested", "informative");
  }
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expectReviewBadge("suggested", "informative", "Review Google Post");
  for (const [channel, expectedTitle] of [
    ["Facebook", "Review Facebook Post"],
    ["Instagram", "Review Instagram Post"],
    ["Email", "Review Email Campaign"],
    ["Google", "Review Google Post"],
  ]) {
    await channelReview().locator(".channel-icon-switcher--review")
      .getByRole("radio", { name: channel, exact: true })
      .click();
    await expectReviewBadge("suggested", "informative", expectedTitle);
  }
  await channelReview().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await waitForGeneratedPreview();

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await contextModal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Google", exact: true })
    .click();
  await waitForGeneratedPreview();
  await expectContextBadge("scheduled", "success");

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show scheduled post options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await expectContextBadge("suggested", "informative");

  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await contextModal().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  const sentGeneratedCard = page.locator(".calendar-day").filter({
    has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }),
  }).locator(".generated-delivery-card");
  await sentGeneratedCard.click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await waitForGeneratedPreview();
  await expectContextBadge("sent", "success");

  // Other prototype versions never receive the V4-only content badge.
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  assert.equal(await page.locator(".v4-content-status").count(), 0);

  console.log(
    "Verified V4 review title-row and contextual About-row badge placement across all channels, original/generated campaigns, lifecycle states, cancellation, accessibility text, alignment, and V5 isolation.",
  );
} finally {
  await browser.close();
}
