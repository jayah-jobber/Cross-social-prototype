import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const modal = () => page.locator(".v4-five-channel-modal");
const footer = () => modal().locator(".v4-context-footer");
const controls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});
const saturdayCard = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
}).locator(".combined-target-card");

async function openSaturdayReview() {
  await saturdayCard().click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Start Review" }).click();
  await modal().waitFor();
}

async function expectFacts(dateLabel) {
  const facts = modal().locator(".v4-context-facts");
  await facts.getByText(dateLabel, { exact: true }).waitFor();
  await facts.getByText("Post to", { exact: true }).waitFor();
}

async function selectState(label) {
  const stepper = modal().locator(".channel-progress-stepper--modal-v4");
  const activeBefore = await stepper.locator("[aria-current='step']").getAttribute("aria-label");
  const cardCountBefore = await saturdayCard().count();
  await controls().getByRole("button", { name: label, exact: true }).click();
  assert.equal(await modal().count(), 1, `${label} must keep the modal open`);
  assert.equal(
    (await stepper.locator("[aria-current='step']").getAttribute("aria-label"))?.split(",")[0],
    activeBefore?.split(",")[0],
    `${label} must keep the active channel`,
  );
  assert.equal(await modal().locator(".v4-context-navigation-controls").count(), 0);
  assert.equal(await saturdayCard().count(), cardCountBefore, `${label} must not move the card`);
  assert.equal(
    await controls().getByRole("button", { name: label, exact: true }).getAttribute("aria-pressed"),
    "true",
  );
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4" }).click();
  await openSaturdayReview();

  assert.deepEqual(
    await controls().getByRole("button").allTextContents(),
    ["Suggested", "Scheduled", "Sent", "Missed", "Error"],
  );

  await selectState("Suggested");
  assert.equal(await modal().locator(".v4-context-status").count(), 0);
  await expectFacts("Schedule date");
  await footer().getByRole("button", { name: "Delete", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Schedule and view next", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Show publishing options" }).click();
  await modal().getByRole("menuitem", { name: "Post now and view next", exact: true }).waitFor();
  await page.keyboard.press("Escape");

  await selectState("Scheduled");
  await modal().getByText("Scheduled", { exact: true }).waitFor();
  await expectFacts("Schedule date");
  await footer().getByRole("button", { name: "Delete Post", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Show scheduled post options" }).click();
  assert.deepEqual(
    await modal().getByRole("menuitem").allTextContents(),
    ["Send now", "Cancel schedule"],
  );
  await page.keyboard.press("Escape");

  await selectState("Sent");
  await modal().getByText("Sent", { exact: true }).waitFor();
  await expectFacts("Schedule date");
  await footer().getByRole("button", { name: "Duplicate Campaign", exact: true }).waitFor();
  await footer().getByRole("button", { name: "View Performance", exact: true }).waitFor();
  assert.equal(await footer().getByRole("button", { name: /Delete|Edit/ }).count(), 0);

  await selectState("Missed");
  await modal().getByText("Missed", { exact: true }).waitFor();
  await expectFacts("Original schedule date");
  assert.equal(await modal().locator(".v4-warning-fact svg").count(), 1);
  await footer().getByRole("button", { name: "Delete Post", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Send Now", exact: true }).waitFor();

  await selectState("Error");
  await modal().getByText("Failed", { exact: true }).waitFor();
  await expectFacts("Original schedule date");
  await modal().getByRole("alert").getByText(
    "Posting failed due to a connection issue.",
    { exact: true },
  ).waitFor();
  await footer().getByRole("button", { name: "Delete Post", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Post Now", exact: true }).waitFor();

  await modal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: /^Facebook,/ })
    .click();
  assert.equal(await controls().count(), 0, "Controls must hide on Facebook");
  await modal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: /^Google,/ })
    .click();
  await controls().getByRole("button", { name: "Error", exact: true }).waitFor();
  assert.equal(
    await controls().getByRole("button", { name: "Error", exact: true }).getAttribute("aria-pressed"),
    "true",
  );

  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await controls().count(), 0, "Controls must hide while the modal is closed");
  assert.equal(await saturdayCard().locator(".status-error").count(), 1);
  await openSaturdayReview();
  await modal().getByText("Failed", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Version 1" }).click();
  await page.getByRole("button", { name: "Version 4" }).click();
  await openSaturdayReview();
  assert.equal(
    await controls().getByRole("button", { name: "Suggested", exact: true }).getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await modal().locator(".v4-context-status").count(), 0);
  assert.equal(await saturdayCard().locator(".channel-status-dot").count(), 0);

  console.log("Verified all five Google contextual demo states, persistence, visibility, and reset.");
} finally {
  await browser.close();
}
