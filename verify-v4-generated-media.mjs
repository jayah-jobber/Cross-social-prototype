import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const body = `🎄 Christmas Special: Save 15% on Winter Landscaping Services

Give your landscape the care it deserves this winter with 15% off our winter landscaping services.

Our winter services include:
• Winter property cleanups
• Garden bed protection
• Leaf and debris removal
• Seasonal landscape maintenance

Book before Christmas to take advantage of this limited-time offer and keep your property looking its best through the winter months.

📞 Contact us today for a free quote and reserve your spot before our schedule fills up.`;
const hashtags = "#ChristmasSpecial #WinterLandscaping #LandscapeMaintenance #HolidaySavings";
const imageRequirement = "Add at least 1 image before posting to Instagram";
const summaryArtworkPath = "/assets/v4-generated-summary-channel-artwork.png";

const flow = () => page.locator(".v4-generated-flow-shell");
const summary = () => flow().locator(".v4-summary-modal--generated");
const context = () => page.locator(".v4-generated-review");
const generatedCard = () => page.locator(".generated-delivery-card");

async function generate(prompt) {
  const input = page.getByLabel("Add to your marketing calendar");
  await input.fill(prompt);
  await input.press("Enter");
  await summary().waitFor({ timeout: 8000 });
}

async function waitForPreviewReady() {
  const glimmer = context().locator(".v4-preview-glimmer");
  if (await glimmer.count()) {
    await glimmer.waitFor({ state: "detached", timeout: 4500 });
  }
}

async function selectContextChannel(channel) {
  await waitForPreviewReady();
  await context().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: channel, exact: true })
    .click();
  await waitForPreviewReady();
}

async function assertCollapsedMedia() {
  assert.equal(await context().locator(".post-image").count(), 0);
  assert.equal(await context().locator(".instagram-post-image").count(), 0);
  assert.equal(await context().locator(".channel-image-grid").count(), 0);
  assert.equal(await context().locator(".email-hero").count(), 0);
  assert.equal(await context().locator(".empty-post-image").count(), 0);
}

async function editInstagramImages(action) {
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const review = page.locator(".v4-channel-review");
  await review.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  const reviewFooter = review.locator(".review-footer");
  await review.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  if (action === "add") {
    await page.getByRole("button", { name: "Choose image", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Remove image 1", exact: true }).click();
  }
  await page.getByRole("button", { name: "Save Edit", exact: true }).click();
  return { review, reviewFooter };
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  await generate("Christmas winter landscaping promotion");
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await summary().locator(`img[src="${summaryArtworkPath}"]`).count(), 1);
  assert.equal(await summary().locator(".v4-summary-collage").count(), 0);
  assert.equal(await summary().locator(".v4-summary-body--text-only").count(), 0);

  // Accepting drafts persists all four suggestions before any channel can be delivered.
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  assert.equal(await generatedCard().count(), 1);
  assert.match(await generatedCard().locator(".calendar-card-details").textContent(), /Needs review/);
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);
  await waitForPreviewReady();

  await assertCollapsedMedia();
  assert.equal(await context().locator(`img[src="${summaryArtworkPath}"]`).count(), 0);
  assert.equal(await context().locator(".post-copy > p").textContent(), body);

  await selectContextChannel("Facebook");
  await assertCollapsedMedia();
  const facebookCopy = context().locator(".channel-post-copy > p");
  assert.equal(await facebookCopy.count(), 2);
  assert.equal(await facebookCopy.nth(0).textContent(), body);
  assert.equal(await facebookCopy.nth(1).textContent(), hashtags);

  await selectContextChannel("Instagram");
  await assertCollapsedMedia();
  const instagramCopy = context().locator(".instagram-post-copy > p");
  assert.equal(await instagramCopy.count(), 2);
  assert.equal(await instagramCopy.nth(0).textContent(), body);
  assert.equal(await instagramCopy.nth(1).textContent(), hashtags);
  await context().getByText(imageRequirement, { exact: true }).waitFor();

  const contextSchedule = context().getByRole("button", {
    name: "Schedule Instagram post",
    exact: true,
  });
  const contextSplit = context().getByRole("button", { name: "Show publishing options" });
  assert.equal(await contextSchedule.isDisabled(), true);
  assert.equal(await contextSplit.isDisabled(), true);

  // The handler guard still blocks delivery if the native disabled property is removed.
  await contextSchedule.evaluate((button) => {
    button.disabled = false;
    button.click();
  });
  assert.equal(
    await context().getByRole("radio", { name: "Instagram", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await generatedCard().count(), 1);
  assert.match(await generatedCard().locator(".calendar-card-details").textContent(), /Needs review/);

  // Adding media unlocks Instagram; removing the final image relocks both delivery actions.
  const added = await editInstagramImages("add");
  assert.equal(
    await added.reviewFooter.getByRole("button", { name: "Schedule Instagram post" }).isEnabled(),
    true,
  );
  assert.equal(await added.review.locator(".instagram-post-image").count(), 1);
  await added.review.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Remove image 1", exact: true }).click();
  await page.getByRole("button", { name: "Save Edit", exact: true }).click();
  assert.equal(
    await added.reviewFooter.getByRole("button", { name: "Schedule Instagram post" }).isDisabled(),
    true,
  );
  await added.reviewFooter.getByRole("button", { name: "Back", exact: true }).click();
  await context().getByText(imageRequirement, { exact: true }).waitFor();
  assert.equal(await contextSchedule.isDisabled(), true);
  assert.equal(await contextSplit.isDisabled(), true);

  // Google and Email remain schedulable without media.
  await selectContextChannel("Google");
  await assertCollapsedMedia();
  await context().getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await page.getByText(
    "Your Google post has been successfully scheduled.",
    { exact: true },
  ).waitFor();

  await selectContextChannel("Email");
  await assertCollapsedMedia();
  assert.equal(await context().locator(".propagated-body").textContent(), body);
  await context().getByRole("button", { name: "Schedule Email", exact: true }).click();
  await page.getByText(
    "Your email campaign has been successfully scheduled.",
    { exact: true },
  ).waitFor();
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave now" })
    .getByRole("button", { name: "Save drafts and Exit", exact: true }).click();

  // Undelivered Instagram remains Suggested on the persisted campaign.
  await generatedCard().click();
  const calendarSummary = page.locator(".v4-summary-modal--calendar");
  await calendarSummary.waitFor();
  assert.equal(
    new URL(
      await calendarSummary.locator(".v4-summary-artwork").getAttribute("src"),
      baseUrl,
    ).pathname,
    summaryArtworkPath,
  );
  assert.equal(
    await calendarSummary.locator("[data-channel='google'] [data-status='scheduled']").count(),
    1,
  );
  assert.equal(
    await calendarSummary.locator("[data-channel='email'] [data-status='scheduled']").count(),
    1,
  );
  assert.equal(
    await calendarSummary.locator("[data-channel='facebook'] [data-status='suggested']").count(),
    1,
  );
  assert.equal(
    await calendarSummary.locator("[data-channel='instagram'] [data-status='suggested']").count(),
    1,
  );
  assert.equal(await calendarSummary.locator("[data-channel='website']").count(), 0);
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const reopenedReview = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await reopenedReview.waitFor();
  const reopenedGlimmer = reopenedReview.locator(".v4-preview-glimmer");
  if (await reopenedGlimmer.count()) {
    await reopenedGlimmer.waitFor({ state: "detached", timeout: 4500 });
  }
  await reopenedReview.getByRole("radio", { name: "Instagram", exact: true }).click();
  if (await reopenedGlimmer.count()) {
    await reopenedGlimmer.waitFor({ state: "detached", timeout: 4500 });
  }
  await reopenedReview.getByText(imageRequirement, { exact: true }).waitFor();
  assert.equal(
    await reopenedReview.getByRole("button", {
      name: "Schedule Instagram post",
      exact: true,
    }).isDisabled(),
    true,
  );
  assert.equal(
    await reopenedReview.getByRole("button", { name: "Show publishing options" }).isDisabled(),
    true,
  );

  console.log(
    "Verified summary-only artwork, text-only generated drafts, Instagram media guards, suggested persistence, and image-free Google/Email scheduling.",
  );
} finally {
  await browser.close();
}
