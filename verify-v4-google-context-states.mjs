import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const modal = () => page.locator(".v4-five-channel-modal");
const footer = () => modal().locator(
  ".v4-sliding-panel--text.is-active .v4-context-footer",
);
const controls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});
const generatedFlow = () => page.locator(".v4-generated-flow-shell");
const generatedReview = () => page.locator(".v4-generated-review");
const saturdayCard = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
}).locator(".combined-target-card");

async function openSaturdayReview() {
  await saturdayCard().click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await modal().waitFor();
}

async function expectFacts(dateLabel) {
  const facts = modal().locator(".v4-sliding-panel--text.is-active .v4-context-facts");
  await facts.getByText(dateLabel, { exact: true }).waitFor();
  await facts.getByText("Post to", { exact: true }).waitFor();
}

async function expectSentGoogleActionsRightAligned() {
  const actionFooter = footer();
  await actionFooter.getByRole("button", { name: "View post", exact: true }).waitFor();
  assert.equal(
    await actionFooter.getByRole("button", { name: "Duplicate Campaign", exact: true }).count(),
    0,
  );
  const alignment = await actionFooter.evaluate((node) => {
    const button = node.querySelector(".v4-view-performance");
    const actionGroup = button?.parentElement;
    const footerBounds = node.getBoundingClientRect();
    const buttonBounds = button?.getBoundingClientRect();
    return {
      sentClass: node.classList.contains("v4-context-footer--sent-google"),
      actionGroupIsLast: actionGroup === node.lastElementChild,
      rightGap: buttonBounds ? Math.abs(footerBounds.right - buttonBounds.right) : Infinity,
      leftGap: buttonBounds ? buttonBounds.left - footerBounds.left : 0,
      actionGroupMarginLeft: actionGroup
        ? Number.parseFloat(getComputedStyle(actionGroup).marginLeft)
        : 0,
    };
  });
  assert.equal(alignment.sentClass, true);
  assert.equal(alignment.actionGroupIsLast, true);
  assert.ok(alignment.rightGap <= 1, `View post right gap was ${alignment.rightGap}px`);
  assert.ok(alignment.leftGap > alignment.rightGap);
  assert.ok(alignment.actionGroupMarginLeft > 0);
}

async function selectState(label) {
  const switcher = modal().locator(".channel-icon-switcher--modal-v4");
  const activeBefore = await switcher.locator("[aria-checked='true']").getAttribute("aria-label");
  const cardCountBefore = await saturdayCard().count();
  await controls().getByRole("button", { name: label, exact: true }).click();
  assert.equal(await modal().count(), 1, `${label} must keep the modal open`);
  assert.equal(
    await switcher.locator("[aria-checked='true']").getAttribute("aria-label"),
    activeBefore,
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
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
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
  await footer().getByRole("button", { name: "Schedule Google post", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Show publishing options" }).click();
  await modal().getByRole("menuitem", { name: "Post now and view next", exact: true }).waitFor();
  await page.keyboard.press("Escape");

  await selectState("Scheduled");
  await modal().getByText("Scheduled", { exact: true }).waitFor();
  await expectFacts("Schedule date");
  await footer().getByRole("button", { name: "Delete", exact: true }).waitFor();
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
  await expectSentGoogleActionsRightAligned();
  assert.equal(await footer().getByRole("button", { name: /Delete|Edit/ }).count(), 0);

  await selectState("Missed");
  await modal().getByText("Missed", { exact: true }).waitFor();
  await expectFacts("Original schedule date");
  assert.equal(await modal().locator(".v4-warning-fact svg").count(), 1);
  await footer().getByRole("button", { name: "Delete", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Send Now", exact: true }).waitFor();

  await selectState("Error");
  await modal().getByText("Error", { exact: true }).waitFor();
  await expectFacts("Original schedule date");
  await modal().getByRole("alert").getByText(
    "Posting failed due to a connection issue.",
    { exact: true },
  ).waitFor();
  await footer().getByRole("button", { name: "Delete", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Edit", exact: true }).waitFor();
  await footer().getByRole("button", { name: "Post Now", exact: true }).waitFor();

  await modal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true })
    .click();
  await controls().waitFor({ state: "detached" });
  await modal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Google", exact: true })
    .click();
  await controls().getByRole("button", { name: "Error", exact: true }).waitFor();
  assert.equal(
    await controls().getByRole("button", { name: "Error", exact: true }).getAttribute("aria-pressed"),
    "true",
  );

  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await controls().count(), 0, "Controls must hide while the modal is closed");
  assert.equal(await saturdayCard().getAttribute("data-card-state"), "failed");
  assert.match(await saturdayCard().locator(".calendar-card-details").textContent(), /1 failed/);
  await openSaturdayReview();
  await modal().getByText("Error", { exact: true }).waitFor();

  await page.getByRole("button", { name: "Version 1" }).click();
  await page.getByRole("button", { name: "Version 4" }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await openSaturdayReview();
  assert.equal(
    await controls().getByRole("button", { name: "Suggested", exact: true }).getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await modal().locator(".v4-context-status").count(), 0);
  assert.equal(await saturdayCard().locator(".channel-status-dot").count(), 0);
  await modal().getByRole("button", { name: "Close", exact: true }).click();

  // The generated content preview/review uses the same Sent Google action set.
  await page.getByLabel("Add to your marketing calendar").fill("Sent Google action QA");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = generatedFlow().locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  const glimmer = generatedReview().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
  const generatedFooter = generatedReview().locator(".v4-context-footer");
  await generatedFooter.getByRole("button", { name: "Show publishing options" }).click();
  await generatedReview().getByRole("menuitem", {
    name: "Post now and view next",
    exact: true,
  }).click();
  await generatedReview().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  const sentGoogleCard = page.locator(".calendar-day").filter({
    has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }),
  }).locator(".generated-delivery-card");
  await sentGoogleCard.click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await expectSentGoogleActionsRightAligned();

  console.log(
    "Verified all five Google contextual states and right-aligned V4 Sent Google actions in contextual and generated review surfaces.",
  );
} finally {
  await browser.close();
}
