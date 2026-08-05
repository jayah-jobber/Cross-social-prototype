import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const summary = () => page.locator(".v4-summary-modal");
const contextModal = () => page.locator(".v4-five-channel-modal");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const campaignCard = (day) => calendarDay(day).locator(".combined-target-card");
const summaryRows = () => summary().locator(".v4-summary-status-list > li");
const summaryRow = (channel) => summaryRows().filter({ hasText: channel });
const iconControls = () => page.getByRole("group", { name: "Social icon style" });
const statusControls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
}

async function openSaturdaySummary() {
  await campaignCard("Saturday, Nov 7").click();
  await summary().waitFor();
}

async function startCardReview() {
  await summary().getByRole("button", { name: "Start Review", exact: true }).click();
  await contextModal().waitFor();
}

async function postCurrentNow() {
  const footer = contextModal().locator(".v4-context-footer");
  await footer.getByRole("button", { name: "Show publishing options" }).click();
  await contextModal().getByRole("menuitem", {
    name: "Post now and view next",
    exact: true,
  }).click();
}

async function imageSources(scope) {
  return scope.locator(".v4-summary-channel img").evaluateAll((images) => (
    images.slice(0, 3).map((image) => new URL(image.src).pathname)
  ));
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();

  // Every V4 campaign card enters the Figma summary before channel review.
  await openSaturdaySummary();
  assert.equal(await contextModal().count(), 0);
  assert.equal(await summary().getByRole("heading", {
    name: "Seasonal property cleanup in Hamilton",
    exact: true,
  }).count(), 1);
  assert.equal(await summaryRows().count(), 5);
  assert.deepEqual(await summaryRows().evaluateAll((rows) => (
    rows.map((row) => row.querySelector(".v4-summary-channel")?.textContent?.trim())
  )), ["Google", "Facebook", "Instagram", "Email", "Website"]);
  assert.ok((await summaryRows().allTextContents()).every((text) => text.includes("Suggested")));
  assert.equal(await summary().locator(".v4-summary-collage img").count(), 3);
  assert.equal(await summary().getByRole("button", { name: "Start Review" }).count(), 1);
  assert.equal(await summary().locator(".channel-progress-stepper").count(), 0);
  assert.equal(await iconControls().count(), 1);
  assert.deepEqual(await imageSources(summary()), [
    "/assets/jobber-google-channel-icon.svg",
    "/assets/jobber-facebook-channel-icon.svg",
    "/assets/jobber-instagram-channel-icon.svg",
  ]);

  const layout = await summary().evaluate((dialog) => {
    const box = (selector) => dialog.querySelector(selector)?.getBoundingClientRect();
    const dialogBox = dialog.getBoundingClientRect();
    const headerBox = box(".v4-summary-header");
    const detailsBox = box(".v4-summary-details");
    const collageBox = box(".v4-summary-collage");
    return {
      width: Math.round(dialogBox.width),
      height: Math.round(dialogBox.height),
      headerHeight: Math.round(headerBox?.height ?? 0),
      detailsWidth: Math.round(detailsBox?.width ?? 0),
      collageWidth: Math.round(collageBox?.width ?? 0),
      collageHeight: Math.round(collageBox?.height ?? 0),
    };
  });
  assert.deepEqual(layout, {
    width: 1043,
    height: 852,
    headerHeight: 84,
    detailsWidth: 437,
    collageWidth: 430,
    collageHeight: 548,
  });
  await page.screenshot({ path: "/tmp/v4-summary-initial.png" });

  // Icon experiment updates Summary and carries into existing V4 review.
  await iconControls().getByRole("radio", { name: "Brand color" }).check();
  assert.deepEqual(await imageSources(summary()), [
    "/assets/google-channel-icon.svg",
    "/assets/facebook-channel-icon.png",
    "/assets/instagram-channel-icon.png",
  ]);
  await startCardReview();
  assert.equal(
    await contextModal().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    5,
  );
  assert.deepEqual(
    await contextModal().locator(".channel-progress-stepper--modal-v4 img").evaluateAll((images) => (
      images.slice(0, 3).map((image) => new URL(image.src).pathname)
    )),
    [
      "/assets/google-channel-icon.svg",
      "/assets/facebook-channel-icon.png",
      "/assets/instagram-channel-icon.png",
    ],
  );

  // Closing review closes the whole flow to the calendar.
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await summary().count(), 0);
  assert.equal(await contextModal().count(), 0);

  // Schedule and cancel map directly from the existing lifecycle.
  await openSaturdaySummary();
  await startCardReview();
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await openSaturdaySummary();
  assert.equal(await summaryRow("Google").locator("[data-status='scheduled']").count(), 1);
  await startCardReview();
  await contextModal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: "Google, scheduled" }).click();
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Show scheduled post options" }).click();
  await contextModal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await openSaturdaySummary();
  assert.equal(await summaryRow("Google").locator("[data-status='suggested']").count(), 1);
  await summary().getByRole("button", { name: "Close summary" }).click();

  // Post now creates a scoped card whose Summary includes only that channel.
  await openSaturdaySummary();
  await startCardReview();
  await postCurrentNow();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await campaignCard("Friday, Nov 6").click();
  await summary().waitFor();
  assert.equal(await summaryRows().count(), 1);
  assert.equal(await summaryRow("Google").locator("[data-status='sent']").count(), 1);
  await summary().getByRole("button", { name: "Close summary" }).click();

  // Demo overrides persist into Summary, while deleted channels disappear.
  await resetV4();
  await openSaturdaySummary();
  await startCardReview();
  await statusControls().getByRole("button", { name: "Missed", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await openSaturdaySummary();
  assert.equal(await summaryRow("Google").locator("[data-status='missed']").count(), 1);
  await startCardReview();
  await statusControls().getByRole("button", { name: "Error", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await openSaturdaySummary();
  assert.equal(await summaryRow("Google").locator("[data-status='error']").count(), 1);
  await page.screenshot({ path: "/tmp/v4-summary-mixed.png" });
  await startCardReview();
  await contextModal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: /^Facebook,/ }).click();
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true }).click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await openSaturdaySummary();
  assert.equal(await summaryRow("Facebook").count(), 0);
  assert.equal(await summaryRows().count(), 4);
  await summary().getByRole("button", { name: "Close summary" }).click();

  // Prompt generation enters Summary, then hands off to the unchanged suggested dialog.
  await resetV4();
  await page.getByLabel("Add to your marketing calendar").fill("Promote fall cleanup");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await summary().waitFor();
  assert.equal(await page.locator(".suggested-horizontal-dialog").count(), 0);
  assert.equal(await summary().getByRole("heading", {
    name: "Promote fall cleanup",
    exact: true,
  }).count(), 1);
  assert.ok((await summaryRows().allTextContents()).every((text) => text.includes("Suggested")));
  await summary().getByRole("button", { name: "Start Review", exact: true }).click();
  const suggested = page.locator(".suggested-horizontal-dialog");
  await suggested.getByRole("heading", { name: "Suggested Marketing Content", exact: true }).waitFor();
  await suggested.getByText("1 of 5", { exact: true }).waitFor();
  await suggested.locator(".suggested-content-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true }).click();
  await suggested.getByText("2 of 5", { exact: true }).waitFor();
  await suggested.getByLabel("Close suggested marketing content").click();

  // V5 remains on its existing contextual modal and never renders Summary.
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await campaignCard("Saturday, Nov 7").click();
  await page.locator(".v5-context-modal").waitFor();
  assert.equal(await summary().count(), 0);

  console.log(
    "Verified V4 Summary entry, layout, scope, statuses, lifecycle, deletion, icons, suggested handoff, and V5 isolation.",
  );
} finally {
  await browser.close();
}
