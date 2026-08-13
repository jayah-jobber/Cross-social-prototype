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
const revisedSummaryCopy = "Your recent Hamilton clean up and mulching project (Job ID xxx) is a great one to showcase on all your platforms. It talks about transforming a property with a seasonal clean up and fresh mulch, highlighting the visual impact and value of a well-maintained landscape.";
const promotionSummaryCopy = "Promotional content is a great one to showcase on all your platforms. It talks about a limited-time opportunity for homeowners to save on landscaping services, creating urgency while encouraging potential customers to book before the promotion ends.";
const summaryArtworkPath = "/assets/v4-15-percent-promotion.png";
const instagramImageRequirement = "Add at least 1 image before posting to Instagram";

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
}

async function openSaturdaySummary() {
  await campaignCard("Saturday, Nov 7").click();
  await summary().waitFor();
}

async function startCardReview() {
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
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

async function assertSummaryArtwork(locator) {
  assert.equal(await locator.count(), 1);
  assert.equal(new URL(await locator.getAttribute("src"), baseUrl).pathname, summaryArtworkPath);
}

async function waitForGeneratedPreviewReady(review) {
  await review.locator(
    ".v4-context-preview[aria-busy='false']:not(:has(.v4-preview-glimmer))",
  ).waitFor({ timeout: 4500 });
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();

  // Multi-channel V4 campaign cards enter the Figma summary before channel review.
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
  assert.equal(await summary().getByRole("button", { name: "Review Drafts" }).count(), 1);
  assert.equal(await summary().locator(".channel-progress-stepper").count(), 0);
  assert.equal(await summary().getByRole("heading", {
    name: "REVIEW MULTIPLE CHANNELS",
    exact: true,
  }).count(), 1);
  assert.equal(await summary().getByRole("heading", {
    name: "Post to multiple channels for highest impact",
    exact: true,
  }).count(), 0);
  assert.equal(await summary().getByText(revisedSummaryCopy, { exact: true }).count(), 1);
  assert.equal(await summary().getByText("Post to:", { exact: true }).count(), 1);
  assert.equal(await summary().evaluate((dialog) => {
    const schedule = dialog.querySelector(".v4-summary-schedule");
    const list = dialog.querySelector(".v4-summary-status-list");
    return Boolean(schedule && list && (schedule.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
  }), true);
  assert.equal(await iconControls().count(), 0);
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
    height: 759,
    headerHeight: 84,
    detailsWidth: 437,
    collageWidth: 462,
    collageHeight: 591,
  });
  await page.screenshot({ path: "/tmp/v4-summary-initial.png" });

  // V4 uses fixed Jobber social icons and no prototype icon-style selector.
  assert.equal(await iconControls().count(), 0);
  assert.deepEqual(await imageSources(summary()), [
    "/assets/jobber-google-channel-icon.svg",
    "/assets/jobber-facebook-channel-icon.svg",
    "/assets/jobber-instagram-channel-icon.svg",
  ]);
  await startCardReview();
  assert.equal(
    await contextModal().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    5,
  );
  assert.equal(await contextModal().getByRole("heading", {
    name: "REVIEW MULTIPLE CHANNELS",
    exact: true,
  }).count(), 0);
  assert.equal(await contextModal().getAttribute("aria-labelledby"), "v4-context-title");
  const reviewHeaderGeometry = await contextModal().evaluate((dialog) => {
    const modal = dialog.getBoundingClientRect();
    const stepper = dialog.querySelector(".channel-progress-stepper")?.getBoundingClientRect();
    const close = dialog.querySelector(".context-progress-close")?.getBoundingClientRect();
    return {
      centerDelta: Math.abs(
        (stepper?.left ?? 0) + (stepper?.width ?? 0) / 2 - (modal.left + modal.width / 2),
      ),
      closeRightDelta: Math.abs((close?.right ?? 0) - (modal.right - 32)),
    };
  });
  assert.ok(reviewHeaderGeometry.centerDelta <= 1);
  assert.ok(reviewHeaderGeometry.closeRightDelta <= 1);
  const modalStepper = contextModal().locator(".channel-progress-stepper--modal-v4");
  await modalStepper.getByRole("button", { name: /^Google,/ }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await modalStepper.getByRole("button", { name: /^Facebook,/ }).getAttribute("aria-current"),
    "step",
  );
  await modalStepper.getByRole("button", { name: /^Google,/ }).click();
  await page.screenshot({ path: "/tmp/v4-calendar-review.png" });
  assert.deepEqual(
    await contextModal().locator(".channel-progress-stepper--modal-v4 img").evaluateAll((images) => (
      images.slice(0, 3).map((image) => new URL(image.src).pathname)
    )),
    [
      "/assets/jobber-google-channel-icon.svg",
      "/assets/jobber-facebook-channel-icon.svg",
      "/assets/jobber-instagram-channel-icon.svg",
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
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
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

  // A one-channel split card still opens the campaign-wide Summary and review.
  await openSaturdaySummary();
  await startCardReview();
  await postCurrentNow();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await campaignCard("Friday, Nov 6").click();
  await summary().waitFor();
  assert.equal(await summaryRows().count(), 5);
  await summary().getByText("Schedule date: Various dates", { exact: true }).waitFor();
  await startCardReview();
  assert.equal(
    await contextModal().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    5,
  );
  await contextModal().getByText("Sent", { exact: true }).waitFor();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();

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
  assert.equal(await page.locator(".v4-generated-flow-shell").count(), 1);
  assert.equal(await summary().getByRole("heading", {
    name: "15% promotion",
    exact: true,
  }).count(), 1);
  assert.equal(await summary().getByRole("heading", {
    name: "OUR RECOMMENDATION",
    exact: true,
  }).count(), 1);
  assert.equal(await summary().getByText(promotionSummaryCopy, { exact: true }).count(), 1);
  assert.deepEqual(await summaryRows().evaluateAll((rows) => (
    rows.map((row) => row.querySelector(".v4-summary-channel")?.textContent?.trim())
  )), ["Google", "Facebook", "Instagram", "Email"]);
  assert.equal(await summaryRow("Website").count(), 0);
  assert.equal(
    await summary().getByText("Schedule date: Nov 7th, 2026 9:00am", { exact: true }).count(),
    1,
  );
  const generatedSummaryArtwork = summary().locator(".v4-summary-artwork");
  await assertSummaryArtwork(generatedSummaryArtwork);
  assert.equal(await summary().locator(`img[src="${summaryArtworkPath}"]`).count(), 1);
  assert.deepEqual(
    await generatedSummaryArtwork.evaluate((image) => {
      const bounds = image.getBoundingClientRect();
      return [Math.round(bounds.width), Math.round(bounds.height)];
    }),
    [430, 577],
  );
  assert.equal(await summary().locator(".v4-summary-collage").count(), 0);
  assert.equal(await summary().locator(".v4-summary-image-placeholder").count(), 0);
  assert.equal(await summary().locator(".v4-summary-body--text-only").count(), 0);
  assert.equal(await summary().getByRole("button", { name: /close/i }).count(), 0);
  assert.equal(
    await page.locator(".v4-generated-flow-shell").getByLabel("Edit marketing content prompt").inputValue(),
    "Promote fall cleanup",
  );
  assert.ok((await summaryRows().allTextContents()).every((text) => text.includes("Suggested")));
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  const suggested = page.locator(".v4-generated-flow-shell");
  const generatedReview = suggested.locator(".v4-generated-review");
  await generatedReview.waitFor();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(await generatedReview.getByRole("heading", {
    name: "15% promotion",
    exact: true,
  }).count(), 1);
  assert.equal(await generatedReview.locator(".channel-progress-stepper--modal-v4").count(), 1);
  assert.equal(
    await generatedReview.locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    4,
  );
  assert.equal(await generatedReview.getByRole("button", { name: /^Website,/ }).count(), 0);
  assert.equal(
    await generatedReview.getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".post-image, .empty-post-image").count(), 0);
  const generatedStepper = generatedReview.locator(".channel-progress-stepper--modal-v4");
  await generatedStepper.getByRole("button", { name: /^Facebook,/ }).click();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".channel-image-grid").count(), 0);
  await generatedStepper.getByRole("button", { name: /^Instagram,/ }).click();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".instagram-post-image, .empty-post-image").count(), 0);
  await generatedReview.getByText(instagramImageRequirement, { exact: true }).waitFor();
  assert.equal(
    await generatedReview.getByRole("button", {
      name: "Schedule Instagram post",
      exact: true,
    }).isDisabled(),
    true,
  );
  assert.equal(
    await generatedReview.getByRole("button", { name: "Show publishing options" }).isDisabled(),
    true,
  );
  await generatedStepper.getByRole("button", { name: /^Email,/ }).click();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.getByText(/Subject: Save 15% on your next landscaping project/).count(),
    1,
  );
  assert.equal(
    await generatedReview.getByText(/reserve your spot before our schedule fills up/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".email-hero").count(), 0);
  await generatedStepper.getByRole("button", { name: /^Google,/ }).click();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(await generatedReview.getByRole("button", { name: "Close", exact: true }).count(), 0);
  assert.equal(await page.locator(".prototype-status-controls").count(), 0);
  await generatedReview.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await generatedReview.getByRole("button", { name: /^Facebook,/ }).waitFor();
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
