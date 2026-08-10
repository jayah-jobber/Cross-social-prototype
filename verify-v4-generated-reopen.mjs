import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const flow = () => page.locator(".v4-generated-flow-shell");
const summary = () => page.locator(".v4-summary-modal");
const context = () => page.locator(".v4-five-channel-modal");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const generatedCard = (day) => calendarDay(day).locator(".generated-delivery-card");
const generatedCopy = /Christmas Special: Save 15% on Winter Landscaping Services/;
const generatedImagePath = "/assets/v4-generated-promotion.png";

async function beginGeneratedReview(prompt) {
  await page.getByLabel("Add to your marketing calendar").fill(prompt);
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = flow().locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await flow().locator(".v4-generated-review").waitFor();
}

async function selectEmbeddedChannel(channel) {
  const review = flow().locator(".v4-generated-review");
  const preview = review.getByLabel(`${channel} content preview`);
  if (await preview.count()) return;
  const progressButton = review.getByRole("button", { name: new RegExp(`^${channel},`) });
  if (await progressButton.count()) {
    await progressButton.click();
    return;
  }
  for (let index = 0; index < 4 && await preview.count() === 0; index += 1) {
    await review.getByRole("button", { name: "Next channel" }).click();
  }
  await preview.waitFor();
}

async function closeGeneratedFlow() {
  await flow().getByLabel("Close suggested marketing content").click();
  await flow().waitFor({ state: "detached" });
}

async function assertGeneratedImage(locator) {
  assert.equal(await locator.count(), 1);
  assert.equal(new URL(await locator.getAttribute("src"), baseUrl).pathname, generatedImagePath);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();

  // Generated content review reschedules without a toast, then the green CTA owns success.
  await beginGeneratedReview("Create a generated promotion");
  await selectEmbeddedChannel("Google");
  await flow().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const review = page.locator(".v4-channel-review");
  await review.getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  const scheduleField = review.locator(".review-field").filter({ hasText: "Schedule Post" });
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  await review.getByText("Nov 7, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  await review.getByRole("button", { name: "Previous channel", exact: true }).click();
  await review.locator(".review-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await page.getByText(
    "Your Google post has been successfully scheduled.",
    { exact: true },
  ).waitFor();
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  assert.equal(
    await review.locator(".v4-arrow-navigator").getByText("1 of 3", { exact: true }).count(),
    1,
  );
  await review.locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  assert.equal(
    await flow().locator(".v4-generated-review .v4-arrow-navigator")
      .getByText("1 of 3", { exact: true }).count(),
    1,
  );
  await closeGeneratedFlow();

  assert.equal(await generatedCard("Sunday, Nov 8").count(), 1);
  await generatedCard("Sunday, Nov 8").click();
  await context().waitFor();
  assert.equal(await summary().count(), 0);
  assert.equal(await context().getByText("1 of 1", { exact: true }).count(), 1);
  assert.equal(
    await context().getByRole("heading", { name: "15% promotion", exact: true }).count(),
    1,
  );
  await context().getByText("Scheduled", { exact: true }).waitFor();
  assert.equal(await context().getByText(generatedCopy).count(), 1);
  await assertGeneratedImage(context().locator(".post-image"));

  // Reopened generated Edit and schedule changes continue to use generated state.
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await review.getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  assert.ok(await review.getByText(generatedCopy).count() >= 1);
  await assertGeneratedImage(review.locator(".post-image"));
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-07");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await context().count(), 0);
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 0);
  assert.equal(await generatedCard("Saturday, Nov 7").count(), 1);

  // Canceling the only delivered channel removes its card and returns to Calendar.
  await generatedCard("Saturday, Nov 7").click();
  await context().getByRole("button", { name: "Show scheduled post options" }).click();
  await context().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await context().waitFor({ state: "detached" });
  assert.equal(await generatedCard("Saturday, Nov 7").count(), 0);

  // Two delivered generated channels share a card and reopen through generated Summary.
  await beginGeneratedReview("Create another generated promotion");
  await selectEmbeddedChannel("Facebook");
  await flow().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true })
    .click();
  assert.equal(
    await flow().locator(".v4-generated-review .v4-arrow-navigator")
      .getByText("3 of 4", { exact: true }).count(),
    1,
  );
  await selectEmbeddedChannel("Instagram");
  await flow().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Instagram post", exact: true })
    .click();
  await closeGeneratedFlow();

  await generatedCard("Saturday, Nov 7").click();
  await summary().waitFor();
  assert.equal(await context().count(), 0);
  assert.equal(await summary().locator(".v4-summary-status-list > li").count(), 2);
  assert.equal(
    await summary().getByRole("heading", { name: "15% promotion", exact: true }).count(),
    1,
  );
  await assertGeneratedImage(summary().locator(".v4-summary-artwork"));
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  assert.equal(await context().getByText("1 of 2", { exact: true }).count(), 1);
  assert.equal(await context().getByText(generatedCopy).count(), 1);
  await assertGeneratedImage(context().locator(".channel-image-grid img"));

  // A reopened generated middle channel advances with its sibling's original delivery facts.
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await review.getByRole("heading", { name: "Review Instagram Post", exact: true }).waitFor();
  await review.getByText("Nov 7, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  await review.locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await context().waitFor();

  // Sending the remaining Nov 7 channel regroups it while preserving Facebook on Nov 8.
  await context().getByRole("button", { name: "Show scheduled post options" }).click();
  await context().getByRole("menuitem", { name: "Send now", exact: true }).click();
  await context().waitFor({ state: "detached" });
  assert.equal(await generatedCard("Friday, Nov 6").count(), 1);
  assert.equal(await generatedCard("Saturday, Nov 7").count(), 0);
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 1);

  await generatedCard("Sunday, Nov 8").click();
  assert.equal(await summary().count(), 0);
  await context().getByRole("button", { name: "Show scheduled post options" }).click();
  await context().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await context().waitFor({ state: "detached" });
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 0);
  assert.equal(await generatedCard("Friday, Nov 6").count(), 1);

  console.log(
    "Verified generated card direct reopen, generated content, multi-channel Summary, regrouping, and cancellation.",
  );
} finally {
  await browser.close();
}
