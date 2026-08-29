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

const completion = () => page.locator(".v4-topic-completion-modal");
const summary = () => page.locator(".v4-summary-modal--calendar");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const review = () => page.locator(".v4-channel-review");
const toast = () => page.locator(".google-delete-toast");
const originalCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");

async function resetV4() {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openOriginalReview() {
  await originalCard().click();
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true }).click();
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

try {
  await resetV4();
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
  await toast().filter({
    hasText: "Your website page has been successfully scheduled.",
  }).waitFor();
  assert.equal(await completion().count(), 0);
  assert.equal(await review().count(), 0);

  await resetV4();
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
  await review().locator(".review-footer")
    .getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Page", exact: true }).click();
  await toast().filter({ hasText: "Website page is deleted" }).waitFor();
  assert.equal(await completion().count(), 0);
  assert.equal(await review().count(), 0);

  console.log(
    "Verified V4 campaign completion uses toast-only feedback and never opens the removed progress success modal.",
  );
} finally {
  await browser.close();
}
