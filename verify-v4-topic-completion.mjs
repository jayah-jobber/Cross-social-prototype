import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const completion = () => page.getByRole("dialog", { name: /Nice\. You're making real progress/ });
const summary = () => page.locator(".v4-summary-modal--calendar");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const review = () => page.locator(".v4-channel-review");
const originalCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");

async function resetV4() {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  return page.locator(".calendar-channel-label").count();
}

async function openOriginalReview() {
  await originalCard().click();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  await context().locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().getByRole("heading", { name: "Review Google Post" }).waitFor();
}

async function selectReviewChannel(name) {
  await review().locator(".channel-icon-switcher--review")
    .getByRole("radio", { name, exact: true })
    .click();
}

async function scheduleFromReview(label) {
  await review().locator(".review-footer")
    .getByRole("button", { name: label, exact: true })
    .click();
}

async function postNowFromContext() {
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" }).click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
}

try {
  const initialTotal = await resetV4();
  await openOriginalReview();

  for (const [channel, label] of [
    ["Google", "Schedule Google post"],
    ["Facebook", "Schedule Facebook post"],
    ["Instagram", "Schedule Instagram post"],
    ["Email", "Schedule Email"],
  ]) {
    await selectReviewChannel(channel);
    await scheduleFromReview(label);
    assert.equal(await completion().count(), 0);
  }

  await selectReviewChannel("Website");
  await scheduleFromReview("Publish Website page");
  await completion().waitFor();
  await completion().getByText("Website Scheduled for Nov 7", { exact: true }).waitFor();
  assert.equal(
    await completion().locator(".v4-topic-progress-ring").getAttribute("aria-label"),
    `5 of ${initialTotal} channel posts scheduled or published`,
  );
  assert.equal(await completion().locator(".v4-topic-progress-ring svg circle").count(), initialTotal);
  assert.equal(await completion().locator(".v4-topic-progress-ring svg circle.is-delivered").count(), 5);
  assert.equal(await completion().getByText("Week: Nov 2–8", { exact: true }).count(), 1);
  assert.equal(await page.getByRole("status").count(), 0);
  assert.equal(await completion().getByRole("button", { name: "Review Next" }).count(), 0);
  await completion().getByRole("button", { name: "Back to Calendar", exact: true }).click();
  assert.equal(await completion().count(), 0);

  const deletionTotal = await resetV4();
  await openOriginalReview();
  for (const [channel, label] of [
    ["Google", "Schedule Google post"],
    ["Facebook", "Schedule Facebook post"],
    ["Instagram", "Schedule Instagram post"],
    ["Email", "Schedule Email"],
  ]) {
    await selectReviewChannel(channel);
    await scheduleFromReview(label);
  }
  await selectReviewChannel("Website");
  await review().locator(".review-footer").getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Page", exact: true }).click();
  await completion().waitFor();
  await completion().getByText("Topic review complete", { exact: true }).waitFor();
  assert.equal(
    await completion().locator(".v4-topic-progress-ring").getAttribute("aria-label"),
    `4 of ${deletionTotal - 1} channel posts scheduled or published`,
  );
  assert.equal(await page.getByRole("status").count(), 0);
  await completion().getByRole("button", { name: "Close success message" }).click();

  await resetV4();
  await openOriginalReview();
  for (let index = 0; index < 5; index += 1) {
    await review().locator(".review-footer").getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Improve future recommendations" });
    await dialog.getByRole("button", {
      name: index === 3 ? "Delete Campaign" : index === 4 ? "Delete Page" : "Delete Post",
      exact: true,
    }).click();
    assert.equal(await completion().count(), 0);
  }

  await resetV4();
  await page.getByLabel("Add to your marketing calendar").fill("Second campaign for review next");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await page.locator(".v4-generated-flow-shell .v4-summary-modal--generated").waitFor({ timeout: 8000 });
  await page.locator(".v4-generated-flow-shell")
    .getByRole("button", { name: "Review Drafts", exact: true }).click();
  await page.locator(".v4-generated-review").waitFor();
  await page.locator(".v4-generated-review .v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await page.locator(".v4-generated-review")
    .getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  await originalCard().click();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  for (let index = 0; index < 5; index += 1) await postNowFromContext();
  await completion().waitFor();
  assert.equal(await completion().getByText("Next up:", { exact: true }).count(), 1);
  assert.match(
    await completion().locator(".v4-topic-completion-next strong").textContent(),
    /Facebook post · 15% promotion/,
  );
  await completion().getByRole("button", { name: "Review Next", exact: true }).click();
  await summary().waitFor();
  assert.equal(await completion().count(), 0);

  console.log(
    "Verified V4 topic completion trigger, segmented progress, deletion completion, zero-delivery exclusion, copy, toast suppression, calendar return, and Review Next navigation.",
  );
} finally {
  await browser.close();
}
