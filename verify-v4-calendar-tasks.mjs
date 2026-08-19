import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const entryControl = () => page.getByRole("group", { name: "Version 4 entry surface" });
const friday = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }),
});
const taskCard = (count) => friday().getByRole("button", {
  name: `${count} pending ${count === 1 ? "task" : "tasks"}`,
  exact: true,
});
const anyTaskCard = () => friday().locator(".v4-pending-task-card");
const modal = () => page.getByRole("dialog", { name: /Respond to|Google rating|Google Business/ });
const counter = () => modal().locator(".v4-task-modal-header nav > span");
const toast = (copy) => page.locator(".schedule-success-toast").filter({ hasText: copy });

async function expectTask(index, total, title, action) {
  await modal().getByRole("heading", { name: title, exact: true }).waitFor();
  assert.equal(await counter().textContent(), `${index} of ${total}`);
  assert.equal(
    await modal().locator(".v4-task-modal-footer").getByRole("button", { name: action, exact: true }).count(),
    1,
  );
}

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await taskCard(3).waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await anyTaskCard().count(), 0);

  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await taskCard(3).waitFor();

  assert.equal(await anyTaskCard().count(), 1);
  assert.equal(
    await friday().locator(":scope > *").evaluateAll((children) => (
      children.findIndex((child) => child.classList.contains("v4-pending-task-card"))
    )),
    1,
    "The task card must be the first item immediately after the date heading.",
  );

  const cardGeometry = await taskCard(3).evaluate((card) => {
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const icon = card.querySelector(".v4-pending-task-icon");
    const iconBox = icon?.getBoundingClientRect();
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
      border: style.borderTopWidth,
      radius: style.borderRadius,
      gap: style.gap,
      color: style.color,
      background: style.backgroundColor,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      icon: [Math.round(iconBox?.width ?? 0), Math.round(iconBox?.height ?? 0)],
    };
  });
  assert.ok(cardGeometry.width >= 153 && cardGeometry.width <= 157);
  assert.ok(cardGeometry.height >= 27 && cardGeometry.height <= 29);
  assert.deepEqual(cardGeometry.icon, [16, 16]);
  assert.deepEqual(cardGeometry, {
    ...cardGeometry,
    padding: "4px 12px 4px 12px",
    border: "1px",
    radius: "8px",
    gap: "8px",
    color: "rgb(26, 67, 15)",
    background: "rgb(255, 255, 255)",
    fontSize: "14px",
    lineHeight: "17.5px",
  });

  await taskCard(3).focus();
  await page.keyboard.press("Enter");
  await expectTask(1, 3, "Respond to a new review", "Post Response");
  assert.equal(await modal().getAttribute("aria-modal"), "true");
  await modal().getByText(
    "A timely response shows clients you value their feedback and helps build trust in your business",
    { exact: true },
  ).waitFor();
  await modal().getByText("Dana Jones", { exact: true }).waitFor();
  await modal().getByText("12 reviews", { exact: true }).waitFor();
  await modal().getByText("2 days ago", { exact: true }).waitFor();
  await modal().getByText("Your drafted reply", { exact: true }).waitFor();

  const shellGeometry = await modal().evaluate((dialog) => {
    const box = dialog.getBoundingClientRect();
    const header = dialog.querySelector(".v4-task-modal-header")?.getBoundingClientRect();
    const nav = dialog.querySelector(".v4-task-modal-header nav")?.getBoundingClientRect();
    const body = dialog.querySelector(".v4-task-modal-body");
    const footer = dialog.querySelector(".v4-task-modal-footer")?.getBoundingClientRect();
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      navCenterDelta: Math.round(
        Math.abs(((nav?.left ?? 0) + (nav?.width ?? 0) / 2) - (box.left + box.width / 2)),
      ),
      headerHeight: Math.round(header?.height ?? 0),
      bodyScrolls: (body?.scrollHeight ?? 0) > (body?.clientHeight ?? 0),
      footerHeight: Math.round(footer?.height ?? 0),
      footerInside: Math.round(footer?.bottom ?? 0) === Math.round(box.bottom - 1),
    };
  });
  assert.deepEqual(shellGeometry, {
    width: 800,
    height: 700,
    navCenterDelta: 0,
    headerHeight: 76,
    bodyScrolls: true,
    footerHeight: 80,
    footerInside: true,
  });

  // Skip remains visual-only and does not emit a completion toast.
  await modal().getByRole("button", { name: "Skip", exact: true }).click();
  assert.equal(await counter().textContent(), "1 of 3");
  assert.equal(await taskCard(3).count(), 1);
  assert.equal(await page.locator(".schedule-success-toast").count(), 0);

  // A rapid double click completes task 1 once, advances to task 2, and updates the card.
  await modal().getByRole("button", { name: "Post Response", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expectTask(1, 2, "Your Google rating has dropped", "Mark As Read");
  await taskCard(2).waitFor();
  const responseToast = "Your response has been successfully posted.";
  await toast(responseToast).waitFor();
  assert.equal(await toast(responseToast).count(), 1);
  assert.equal(
    await modal().getByRole("heading", { name: "Your Google rating has dropped", exact: true })
      .evaluate((heading) => document.activeElement === heading),
    true,
  );
  await toast(responseToast).getByRole("button", { name: "Dismiss notification" }).click();
  assert.equal(await toast(responseToast).count(), 0);

  await modal().getByText(
    "Your rating is now {current rating}, an decrease of {change amount}",
    { exact: true },
  ).waitFor();
  const ratingArtwork = modal().locator(".v4-task-rating-artwork");
  assert.deepEqual(
    await ratingArtwork.evaluate((artwork) => {
      const box = artwork.getBoundingClientRect();
      return [Math.round(box.width), Math.round(box.height), getComputedStyle(artwork).overflow];
    }),
    [400, 384, "hidden"],
  );

  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await expectTask(2, 2, "Connect your Google Business Profile", "Connect");
  await modal().getByText(
    "Connect your Google Business Profile to improve how you appear in Google Search",
    { exact: true },
  ).waitFor();
  assert.deepEqual(
    await modal().locator(".v4-task-connect-artwork").evaluate((artwork) => {
      const box = artwork.getBoundingClientRect();
      return [Math.round(box.width), Math.round(box.height), getComputedStyle(artwork).overflow];
    }),
    [400, 384, "hidden"],
  );

  // Completing the last-position task wraps to the first remaining task.
  await modal().getByRole("button", { name: "Connect", exact: true }).click();
  await expectTask(1, 1, "Your Google rating has dropped", "Mark As Read");
  await taskCard(1).waitFor();
  const connectToast = "Google Business Profile successfully connected.";
  await toast(connectToast).waitFor();

  // Close/reopen and entry-surface switching preserve the one remaining task.
  await modal().getByRole("button", { name: "Close tasks", exact: true }).click();
  assert.equal(await modal().count(), 0);
  await page.waitForFunction(
    () => document.activeElement?.classList.contains("v4-pending-task-card"),
  );
  assert.equal(await taskCard(1).evaluate((card) => document.activeElement === card), true);
  await entryControl().getByRole("button", { name: "Dashboard", exact: true })
    .click();
  assert.equal(await modal().count(), 0);
  assert.equal(await anyTaskCard().count(), 0);
  await entryControl().getByRole("button", { name: "Ad-hoc", exact: true }).click();
  assert.equal(await anyTaskCard().count(), 0);
  await entryControl().getByRole("button", { name: "Calendar", exact: true }).click();
  await taskCard(1).click();
  await expectTask(1, 1, "Your Google rating has dropped", "Mark As Read");
  await modal().getByRole("button", { name: "Previous task", exact: true }).click();
  await expectTask(1, 1, "Your Google rating has dropped", "Mark As Read");
  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await expectTask(1, 1, "Your Google rating has dropped", "Mark As Read");

  // Final completion removes the card, closes the modal, focuses Calendar, and leaves the toast.
  await modal().getByRole("button", { name: "Mark As Read", exact: true }).click();
  assert.equal(await modal().count(), 0);
  assert.equal(await anyTaskCard().count(), 0);
  const readToast = "Task successfully marked as read.";
  await toast(readToast).waitFor();
  await page.waitForFunction(
    () => document.activeElement?.textContent?.trim() === "Friday, Nov 6",
  );
  assert.equal(
    await friday().getByRole("heading", { name: "Friday, Nov 6", exact: true })
      .evaluate((heading) => document.activeElement === heading),
    true,
  );
  await toast(readToast).waitFor({ state: "detached", timeout: 5000 });

  // Reset restores all tasks. Completing task 3 first wraps to canonical task 1.
  await resetV4();
  await taskCard(3).click();
  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await expectTask(3, 3, "Connect your Google Business Profile", "Connect");
  await modal().getByRole("button", { name: "Connect", exact: true }).click();
  await expectTask(1, 2, "Respond to a new review", "Post Response");
  assert.equal(await taskCard(2).count(), 1);
  await toast(connectToast).waitFor();
  await modal().getByRole("button", { name: "Previous task", exact: true }).click();
  await expectTask(2, 2, "Your Google rating has dropped", "Mark As Read");
  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await expectTask(1, 2, "Respond to a new review", "Post Response");
  await modal().getByRole("button", { name: "Close tasks", exact: true }).click();

  // Reset again. Removing the middle item advances to task 3 without a stale index.
  await resetV4();
  await taskCard(3).click();
  await modal().getByRole("button", { name: "Next task", exact: true }).click();
  await expectTask(2, 3, "Your Google rating has dropped", "Mark As Read");
  await modal().getByRole("button", { name: "Mark As Read", exact: true }).click();
  await expectTask(2, 2, "Connect your Google Business Profile", "Connect");
  assert.equal(await taskCard(2).count(), 1);
  await toast(readToast).waitFor();
  assert.equal(
    await friday().locator(":scope > *").evaluateAll((children) => (
      children.findIndex((child) => child.classList.contains("v4-pending-task-card"))
    )),
    1,
  );
  await modal().getByRole("button", { name: "Close tasks", exact: true }).click();
  await taskCard(2).click();
  await expectTask(1, 2, "Respond to a new review", "Post Response");
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement?.classList.contains("v4-pending-task-card"),
  );
  assert.equal(await taskCard(2).evaluate((card) => document.activeElement === card), true);

  // Campaign regrouping remains independent and the partial-count task card stays pinned first.
  await page.locator(".calendar-day").filter({
    has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
  }).locator(".combined-target-card").click();
  const campaignSummary = page.locator(".v4-summary-modal");
  await campaignSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const campaignContext = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await campaignContext.locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" }).click();
  await campaignContext.getByRole("menuitem", {
    name: "Post now and view next",
    exact: true,
  }).click();
  await campaignContext.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await taskCard(2).count(), 1);
  assert.equal(
    await friday().locator(":scope > *").evaluateAll((children) => (
      children.findIndex((child) => child.classList.contains("v4-pending-task-card"))
    )),
    1,
  );

  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  assert.equal(await anyTaskCard().count(), 0);
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  assert.equal(await taskCard(3).count(), 1);

  console.log(
    "Verified V4 task completion, dynamic counts/order, wrap and middle removal, exact toasts, double-click guard, final cleanup, persistence, reset, focus, geometry, and isolation.",
  );
} finally {
  await browser.close();
}
