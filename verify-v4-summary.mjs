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
const summaryArtworkPath = "/assets/v4-generated-summary-channel-artwork.png";
const instagramImageRequirement = "Add at least 1 image before posting to Instagram";

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
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
  const geometry = await locator.evaluate((image) => {
    const box = image.getBoundingClientRect();
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: Math.round(box.width),
      renderedHeight: Math.round(box.height),
      objectFit: getComputedStyle(image).objectFit,
    };
  });
  assert.deepEqual(geometry, {
    naturalWidth: 763,
    naturalHeight: 1024,
    renderedWidth: 430,
    renderedHeight: 577,
    objectFit: "contain",
  });
}

async function waitForGeneratedPreviewReady(review) {
  await review.locator(
    ".v4-sliding-panel--card.is-active .v4-context-preview[aria-busy='false']:not(:has(.v4-preview-glimmer))",
  ).waitFor({ timeout: 4500 });
}

async function waitForContextChannel(channel) {
  await page.waitForFunction(
    (expected) => (
      document.querySelector(".v4-five-channel-modal .v4-context-body")
        ?.getAttribute("data-channel") === expected
    ),
    channel.toLowerCase(),
  );
}

async function assertGeneratedSummaryIconGeometry(scope) {
  const geometry = await scope.locator(".v4-summary-status-list > li")
    .evaluateAll((rows) => rows.map((row) => {
      const wrapper = row.querySelector(".channel-icon");
      const glyph = wrapper?.querySelector("img, svg");
      if (!wrapper || !glyph) throw new Error("Generated summary channel icon is incomplete");
      const wrapperBox = wrapper.getBoundingClientRect();
      const glyphBox = glyph.getBoundingClientRect();
      const wrapperStyle = getComputedStyle(wrapper);
      const glyphStyle = getComputedStyle(glyph);
      return {
        channel: wrapper.getAttribute("data-channel"),
        wrapper: [wrapperStyle.width, wrapperStyle.height],
        glyph: [glyphStyle.width, glyphStyle.height],
        maxSize: [glyphStyle.maxWidth, glyphStyle.maxHeight],
        transform: glyphStyle.transform,
        centerDelta: [
          Math.abs(
            wrapperBox.left + wrapperBox.width / 2 - (glyphBox.left + glyphBox.width / 2),
          ),
          Math.abs(
            wrapperBox.top + wrapperBox.height / 2 - (glyphBox.top + glyphBox.height / 2),
          ),
        ],
      };
    }));
  assert.deepEqual(
    geometry.map(({ channel, wrapper, glyph, maxSize, transform }) => ({
      channel,
      wrapper,
      glyph,
      maxSize,
      transform,
    })),
    [
      ...["google", "facebook", "instagram", "email"].map((channel) => ({
        channel,
        wrapper: ["24px", "24px"],
        glyph: channel === "google" ? ["20px", "20px"] : ["24px", "24px"],
        maxSize: ["none", "none"],
        transform: "none",
      })),
    ],
  );
  assert.ok(geometry.every(({ centerDelta }) => centerDelta.every((delta) => delta <= 0.5)));
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

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
  assert.equal(await summary().locator(".channel-icon-switcher").count(), 0);
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
    await contextModal().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    5,
  );
  assert.equal(await contextModal().getByRole("heading", {
    name: "REVIEW MULTIPLE CHANNELS",
    exact: true,
  }).count(), 0);
  assert.equal(await contextModal().getAttribute("aria-labelledby"), "v4-context-title");
  await page.waitForTimeout(320);
  const reviewHeaderGeometry = await contextModal().evaluate((dialog) => {
    const modal = dialog.getBoundingClientRect();
    const switcher = dialog.querySelector(".channel-icon-switcher")?.getBoundingClientRect();
    const details = dialog.querySelector(".v4-context-details")?.getBoundingClientRect();
    const close = dialog.querySelector(".context-navigation-close")?.getBoundingClientRect();
    return {
      leftDelta: Math.abs((switcher?.left ?? 0) - (details?.left ?? 0)),
      centerDelta: Math.abs(
        (switcher?.left ?? 0) + (switcher?.width ?? 0) / 2 - (modal.left + modal.width / 2),
      ),
      closeRightDelta: Math.abs((close?.right ?? 0) - (modal.right - 32)),
    };
  });
  assert.ok(
    reviewHeaderGeometry.leftDelta <= 1,
    JSON.stringify(reviewHeaderGeometry),
  );
  assert.ok(reviewHeaderGeometry.centerDelta >= 40);
  assert.ok(reviewHeaderGeometry.closeRightDelta <= 1);
  const modalSwitcher = contextModal().locator(".channel-icon-switcher--modal-v4");
  await modalSwitcher.getByRole("radio", { name: "Google", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await waitForContextChannel("Facebook");
  assert.equal(
    await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await modalSwitcher.getByRole("radio", { name: "Google", exact: true }).click();
  await waitForContextChannel("Google");
  await page.screenshot({ path: "/tmp/v4-calendar-review.png" });
  assert.deepEqual(
    await contextModal().locator(".channel-icon-switcher--modal-v4 img").evaluateAll((images) => (
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
  await contextModal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Google", exact: true }).click();
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
    await contextModal().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
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
  await contextModal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true }).click();
  await waitForContextChannel("Facebook");
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
  assert.equal(await summary().getByText("Schedule date:", { exact: true }).count(), 0);
  await assertSummaryArtwork(summary().locator(".v4-summary-artwork"));
  assert.equal(await summary().locator(".v4-summary-collage").count(), 0);
  assert.equal(await summary().locator(".v4-summary-image-placeholder").count(), 0);
  assert.equal(await summary().locator(".v4-summary-body--text-only").count(), 0);
  assert.equal(await summary().getByRole("button", { name: /close/i }).count(), 0);
  assert.equal(
    await page.locator(".v4-generated-flow-shell").getByLabel("Edit marketing content prompt").inputValue(),
    "Promote fall cleanup",
  );
  assert.equal(await summary().getByText("Create drafts for:", { exact: true }).count(), 1);
  assert.equal(await summary().getByRole("switch").count(), 4);
  assert.deepEqual(
    await summary().getByRole("switch").evaluateAll((switches) => (
      switches.map((toggle) => [
        toggle.getAttribute("aria-label"),
        toggle.getAttribute("aria-checked"),
      ])
    )),
    [
      ["Disable Google", "true"],
      ["Disable Facebook", "true"],
      ["Disable Instagram", "true"],
      ["Disable Email", "true"],
    ],
  );
  assert.equal(await summary().locator(".v4-content-status").count(), 0);
  assert.equal(await summary().getByText("Suggested", { exact: true }).count(), 0);
  await assertGeneratedSummaryIconGeometry(summary());
  assert.equal(await summary().getByText(/Recommended/).count(), 0);
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.waitFor();
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(await generatedReview.getByRole("heading", {
    name: "15% promotion",
    exact: true,
  }).count(), 1);
  assert.equal(await generatedReview.locator(".channel-icon-switcher--modal-v4").count(), 1);
  assert.equal(
    await generatedReview.locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    4,
  );
  assert.equal(await generatedReview.getByRole("radio", { name: "Website", exact: true }).count(), 0);
  assert.equal(
    await generatedReview.locator(".v4-sliding-panel--card.is-active")
      .getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".post-image, .empty-post-image").count(), 0);
  assert.equal(await generatedReview.locator(`img[src="${summaryArtworkPath}"]`).count(), 0);
  const generatedSwitcher = generatedReview.locator(".channel-icon-switcher--modal-v4");
  await generatedSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await waitForContextChannel("Facebook");
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.locator(".v4-sliding-panel--card.is-active")
      .getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".channel-image-grid").count(), 0);
  await generatedSwitcher.getByRole("radio", { name: "Instagram", exact: true }).click();
  await waitForContextChannel("Instagram");
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.locator(".v4-sliding-panel--card.is-active")
      .getByText(/Christmas Special: Save 15% on Winter Landscaping Services/).count(),
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
  await generatedSwitcher.getByRole("radio", { name: "Email", exact: true }).click();
  await waitForContextChannel("Email");
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(
    await generatedReview.getByText(/Subject: Save 15% on your next landscaping project/).count(),
    1,
  );
  assert.equal(
    await generatedReview.locator(".v4-sliding-panel--card.is-active")
      .getByText(/reserve your spot before our schedule fills up/).count(),
    1,
  );
  assert.equal(await generatedReview.locator(".email-hero").count(), 0);
  await generatedSwitcher.getByRole("radio", { name: "Google", exact: true }).click();
  await waitForContextChannel("Google");
  await waitForGeneratedPreviewReady(generatedReview);
  assert.equal(await generatedReview.getByRole("button", { name: "Close", exact: true }).count(), 1);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  assert.equal(await page.locator(".prototype-status-controls").count(), 0);
  await generatedReview.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await waitForContextChannel("Facebook");
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();

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
