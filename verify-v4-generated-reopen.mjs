import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const flow = () => page.locator(".v4-generated-flow-shell");
const embeddedReview = () => page.locator(".v4-generated-review");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const summary = () => page.locator(".v4-summary-modal");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const generatedCard = (day) => calendarDay(day).locator(".generated-delivery-card");

async function waitForPreviewReady(review) {
  const glimmer = review.locator(".v4-preview-glimmer");
  if (await glimmer.count()) {
    await glimmer.waitFor({ state: "detached", timeout: 4500 });
  }
}

async function selectChannel(review, channel) {
  const button = review.getByRole("radio", { name: channel, exact: true });
  if (await button.count()) {
    await button.click();
    await waitForPreviewReady(review);
  }
}

async function beginGeneratedReview() {
  await page.getByLabel("Add to your marketing calendar").fill("Create a generated promotion");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = flow().locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await embeddedReview().waitFor();
  await waitForPreviewReady(embeddedReview());
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await beginGeneratedReview();

  // A draft date edit remains suggested until the delivery CTA, then regroups by date.
  await selectChannel(embeddedReview(), "Facebook");
  await embeddedReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const channelReview = page.locator(".v4-channel-review");
  const scheduleField = channelReview.locator(".review-field").filter({ hasText: "Schedule Post" });
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 0);
  await channelReview.locator(".review-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true })
    .click();
  await channelReview.locator(".review-footer")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await embeddedReview().waitFor();
  await embeddedReview().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();

  assert.equal(await generatedCard("Saturday, Nov 7").count(), 1);
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 1);
  assert.equal(
    await generatedCard("Sunday, Nov 8").getAttribute("data-card-state"),
    "scheduled",
  );

  // Reopening a split card enters the linked campaign Summary before generated review.
  await generatedCard("Sunday, Nov 8").click();
  await summary().waitFor();
  assert.equal(await summary().locator(".v4-summary-status-list > li").count(), 4);
  await summary().getByText("Schedule date: Various dates", { exact: true }).waitFor();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  await waitForPreviewReady(context());
  await page.waitForTimeout(320);
  const reopenedGeometry = await context().evaluate((dialog) => {
    const dialogBox = dialog.getBoundingClientRect();
    const switcher = dialog.querySelector(".channel-icon-switcher")?.getBoundingClientRect();
    const details = dialog.querySelector(
      ".v4-sliding-panel--text.is-active .v4-context-details",
    )?.getBoundingClientRect();
    const close = dialog.querySelector(".context-navigation-close")?.getBoundingClientRect();
    return {
      leftDelta: Math.abs((switcher?.left ?? 0) - (details?.left ?? 0)),
      centerDelta: Math.abs(
        (switcher?.left ?? 0) + (switcher?.width ?? 0) / 2
          - (dialogBox.left + dialogBox.width / 2),
      ),
      closeRightDelta: Math.abs((close?.right ?? 0) - (dialogBox.right - 32)),
    };
  });
  assert.ok(reopenedGeometry.leftDelta <= 1, JSON.stringify(reopenedGeometry));
  assert.ok(reopenedGeometry.centerDelta >= 40, JSON.stringify(reopenedGeometry));
  assert.ok(reopenedGeometry.closeRightDelta <= 1, JSON.stringify(reopenedGeometry));
  assert.equal(
    await context().getByRole("radio", { name: "Facebook", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.ok(await context().getByText(/Christmas Special: Save 15%/).count() >= 1);
  await context().locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-07");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await channelReview.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await context().waitFor();
  await waitForPreviewReady(context());
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 0);
  assert.equal(await generatedCard("Saturday, Nov 7").locator(".calendar-channel-label").count(), 4);

  // Post-now delivery regroups to today while keeping accepted suggestions on Nov 7.
  await generatedCard("Saturday, Nov 7").click();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  await waitForPreviewReady(context());
  assert.equal(
    await context().getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await selectChannel(context(), "Email");
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await context().getByRole("heading", { name: "About this Google post", exact: true }).waitFor();
  assert.equal(await context().count(), 1);
  assert.equal(await generatedCard("Friday, Nov 6").getAttribute("data-card-state"), "sent");
  assert.equal(await generatedCard("Saturday, Nov 7").locator(".calendar-channel-label").count(), 3);
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();

  // Canceling a schedule returns the accepted channel to Suggested instead of deleting it.
  await generatedCard("Saturday, Nov 7").click();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  await waitForPreviewReady(context());
  await selectChannel(context(), "Facebook");
  await context().getByRole("button", { name: "Show scheduled post options" }).click();
  await context().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  assert.equal(await generatedCard("Saturday, Nov 7").locator(".calendar-channel-label").count(), 3);
  assert.equal(
    await generatedCard("Saturday, Nov 7").getAttribute("data-card-state"),
    "suggested",
  );

  console.log(
    "Verified generated V4 direct reopen, suggested persistence, rescheduling, post-now regrouping, and schedule cancellation.",
  );
} finally {
  await browser.close();
}
