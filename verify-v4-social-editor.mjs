import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const originalBody = `This Hamilton property needed a seasonal refresh, starting with a clean up and mulching to bring the landscape back to a maintained state. 🌿

Our work included a general property clean up to remove debris and tidy landscaped areas, followed by fresh mulch applied to existing garden beds to help define and protect them.

The result was a cleaner, more orderly outdoor space, with garden beds refreshed and ready for the season.

If you’re planning a clean up and mulching project in Hamilton, feel free to reach out to discuss your property and timing.`;
const originalCta = "📞 416-624-3188\n💬 mycompany@gmail.com";
const originalHashtags = "#HamiltonLandscaping #OutdoorLiving #HomeUpgrade";
const originalFlattened = `${originalBody}\n\n${originalCta}\n\n${originalHashtags}`;
const generatedBody = `🎄 Christmas Special: Save 15% on Winter Landscaping Services

Give your landscape the care it deserves this winter with 15% off our winter landscaping services.

Our winter services include:
• Winter property cleanups
• Garden bed protection
• Leaf and debris removal
• Seasonal landscape maintenance

Book before Christmas to take advantage of this limited-time offer and keep your property looking its best through the winter months.

📞 Contact us today for a free quote and reserve your spot before our schedule fills up.`;
const generatedHashtags =
  "#ChristmasSpecial #WinterLandscaping #LandscapeMaintenance #HolidaySavings";
const generatedFlattened = `${generatedBody}\n\n${generatedHashtags}`;

const editor = () => page.locator(".editor-panel").filter({
  has: page.getByRole("heading", { name: /^Edit (Facebook|Instagram) Post$/ }),
});
const messageInput = () => editor().getByLabel("Message body");
const socialPreview = () => page.locator(".v4-facebook-preview");
const review = () => page.locator(".v4-channel-review");
const context = () => page.locator(".v4-five-channel-modal");
const contextFooter = () => context().locator(".v4-context-footer");
const flow = () => page.locator(".v4-generated-flow-shell");

function occurrences(value, part) {
  return value.split(part).length - 1;
}

async function assertFlattenedEditor(expected) {
  await editor().waitFor();
  assert.equal(await editor().getByLabel("Message body").count(), 1);
  assert.equal(await editor().getByLabel("Contact info").count(), 0);
  assert.equal(await editor().getByLabel("Hashtag").count(), 0);
  assert.equal(await editor().locator("#v4-social-cta, #v4-social-hashtags").count(), 0);
  assert.equal(await messageInput().inputValue(), expected);
}

async function assertExactPreview(expected) {
  const paragraphs = socialPreview().locator(
    ".channel-post-copy > p, .instagram-post-copy > p",
  );
  assert.equal(await paragraphs.count(), 1);
  assert.equal(await paragraphs.first().textContent(), expected);
}

async function openReviewEditor(channel) {
  await review().locator(".review-field").first()
    .getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: `Edit ${channel} Post`, exact: true }).waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  // Post title 1 is intentionally inert in V4; verify editors through the live campaign.
  await page.locator(".combined-target-card").click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await context().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true }).click();
  await contextFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await openReviewEditor("Facebook");
  await assertFlattenedEditor(originalFlattened);
  const originalFacebookSaved = `${originalFlattened}\n\nOriginal Facebook update`;
  await messageInput().fill(originalFacebookSaved);
  await assertExactPreview(originalFacebookSaved);
  await editor().getByRole("button", { name: "Save Edit", exact: true }).click();
  await openReviewEditor("Facebook");
  await assertFlattenedEditor(originalFacebookSaved);
  assert.equal(occurrences(await messageInput().inputValue(), originalCta), 1);
  assert.equal(occurrences(await messageInput().inputValue(), originalHashtags), 1);
  await editor().getByRole("button", { name: "Cancel", exact: true }).click();

  await review().locator(".channel-icon-switcher--review")
    .getByRole("radio", { name: "Instagram", exact: true }).click();
  await openReviewEditor("Instagram");
  await assertFlattenedEditor(originalFlattened);
  const instagramSaved = `${originalFlattened}\n\nInstagram-only update`;
  await messageInput().fill(instagramSaved);
  await assertExactPreview(instagramSaved);
  await editor().getByRole("button", { name: "Save Edit", exact: true }).click();
  await openReviewEditor("Instagram");
  await assertFlattenedEditor(instagramSaved);
  assert.equal(occurrences(await messageInput().inputValue(), originalCta), 1);
  assert.equal(occurrences(await messageInput().inputValue(), originalHashtags), 1);
  await editor().getByRole("button", { name: "Cancel", exact: true }).click();
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();

  // Generated and reopened generated Facebook editors preserve flattened copy exactly once.
  await page.getByLabel("Add to your marketing calendar").fill("Flatten generated social copy");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await flow().locator(".v4-summary-modal--generated").waitFor({ timeout: 8000 });
  await flow().locator(".v4-summary-modal--generated")
    .getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true }).click();
  await generatedReview.locator(".v4-context-footer")
    .getByRole("button", { name: "Edit" }).click();
  await openReviewEditor("Facebook");
  await assertFlattenedEditor(generatedFlattened);
  assert.equal(occurrences(await messageInput().inputValue(), generatedHashtags), 1);
  const generatedSaved = `${generatedFlattened}\n\nGenerated Facebook update`;
  await messageInput().fill(generatedSaved);
  await assertExactPreview(generatedSaved);
  await editor().getByRole("button", { name: "Save Edit", exact: true }).click();
  await openReviewEditor("Facebook");
  await assertFlattenedEditor(generatedSaved);
  assert.equal(occurrences(await messageInput().inputValue(), generatedHashtags), 1);
  await editor().getByRole("button", { name: "Cancel", exact: true }).click();
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true }).click();
  await page.getByText(
    "Your Facebook post has been successfully scheduled.",
    { exact: true },
  ).waitFor();
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();

  const generatedCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".generated-delivery-card");
  await generatedCard.click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().locator(".v4-preview-glimmer").waitFor({
    state: "detached",
    timeout: 5000,
  });
  await context().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true }).click();
  await context().locator(".v4-preview-glimmer").waitFor({
    state: "detached",
    timeout: 5000,
  });
  await contextFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await openReviewEditor("Facebook");
  await assertFlattenedEditor(generatedSaved);
  await assertExactPreview(generatedSaved);
  assert.equal(occurrences(await messageInput().inputValue(), generatedHashtags), 1);

  console.log(
    "Verified V4 single-body Facebook/Instagram editing across original, generated, and reopened generated origins.",
  );
} finally {
  await browser.close();
}
