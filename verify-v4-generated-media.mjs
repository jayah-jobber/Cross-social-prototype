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
const imageRequirement = "Add at least 1 image before posting or scheduling to Instagram";

const flow = () => page.locator(".v4-generated-flow-shell");
const summary = () => flow().locator(".v4-summary-modal--generated");
const context = () => flow().locator(".v4-generated-review");
const outerClose = () => flow().getByRole("button", {
  name: "Close suggested marketing content",
});
const generatedCards = () => page.locator(".generated-suggestion-card");

async function generate(prompt) {
  const input = page.getByLabel("Add to your marketing calendar");
  await input.fill(prompt);
  await input.press("Enter");
  await summary().waitFor({ timeout: 8000 });
}

async function selectContextChannel(channel) {
  await context().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: new RegExp(`^${channel},`) })
    .click();
}

async function assertCollapsedMedia() {
  assert.equal(await context().locator(".post-image").count(), 0);
  assert.equal(await context().locator(".instagram-post-image").count(), 0);
  assert.equal(await context().locator(".channel-image-grid").count(), 0);
  assert.equal(await context().locator(".email-hero").count(), 0);
  assert.equal(await context().locator(".empty-post-image").count(), 0);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();

  // Generation and review alone never create calendar state.
  await generate("Christmas winter landscaping promotion");
  assert.equal(await generatedCards().count(), 0);
  assert.equal(
    new URL(await summary().locator(".v4-summary-artwork").getAttribute("src"), baseUrl).pathname,
    "/assets/v4-15-percent-promotion.png",
  );
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();

  await assertCollapsedMedia();
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
    name: "Schedule and view next",
    exact: true,
  });
  const contextSplit = context().getByRole("button", { name: "Show publishing options" });
  assert.equal(await contextSchedule.isDisabled(), true);
  assert.equal(await contextSplit.isDisabled(), true);

  // Removing the native disabled property cannot bypass the handler guard.
  await contextSchedule.evaluate((button) => {
    button.disabled = false;
    button.click();
  });
  assert.equal(
    await context().getByRole("button", { name: /^Instagram,/ }).getAttribute("aria-current"),
    "step",
  );
  assert.equal(await generatedCards().count(), 0);

  await selectContextChannel("Email");
  await assertCollapsedMedia();
  assert.equal(await context().locator(".propagated-body").textContent(), body);

  // Edit can add media from an empty Instagram draft; save enables publishing.
  await selectContextChannel("Instagram");
  await context().locator(".v4-context-footer").getByRole("button", {
    name: "Edit",
    exact: true,
  }).click();
  const reviewFooter = page.locator(".v4-channel-review .review-footer");
  assert.equal(
    await reviewFooter.getByRole("button", { name: "Schedule and view next" }).isDisabled(),
    true,
  );
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  const chooseImage = page.getByRole("button", { name: "Choose image", exact: true });
  assert.equal(await chooseImage.isEnabled(), true);
  assert.equal(await page.locator(".instagram-post-image").count(), 0);
  await chooseImage.click();
  assert.equal(await page.locator(".instagram-post-image").count(), 1);
  await page.getByRole("button", { name: "Save Edit", exact: true }).click();
  assert.equal(
    await reviewFooter.getByRole("button", { name: "Schedule and view next" }).isEnabled(),
    true,
  );
  await reviewFooter.getByRole("button", { name: "Back", exact: true }).click();
  assert.equal(await context().getByText(imageRequirement, { exact: true }).count(), 0);
  assert.equal(await contextSchedule.isEnabled(), true);

  // Closing discards every unscheduled draft, including edited media.
  await outerClose().click();
  await flow().waitFor({ state: "detached" });
  assert.equal(await generatedCards().count(), 0);
  assert.equal(await page.getByLabel("Add to your marketing calendar").inputValue(), "");

  // A new session starts clean; only successful deliveries survive partial exit.
  await generate("Second Christmas promotion");
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await selectContextChannel("Instagram");
  await assertCollapsedMedia();
  await selectContextChannel("Google");
  await context().getByRole("button", {
    name: "Schedule and view next",
    exact: true,
  }).click();
  assert.equal(await generatedCards().count(), 1);

  await context().getByRole("button", { name: "Show publishing options" }).click();
  await context().getByRole("menuitem", {
    name: "Post now and view next",
    exact: true,
  }).click();
  assert.equal(await generatedCards().count(), 2);

  await outerClose().click();
  await flow().waitFor({ state: "detached" });

  const fridayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }) })
    .locator(".generated-suggestion-card");
  const saturdayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".generated-suggestion-card");
  const generatedDeliveryGroups = page.locator(
    ".with-generated-suggestion .calendar-group:has(.generated-delivery-card)",
  );
  const neutralCalendarCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Wednesday, Nov 4", exact: true }) })
    .locator(".marketing-calendar-card:not(.review)")
    .first();

  assert.equal(await fridayCard.count(), 1);
  assert.match(await fridayCard.textContent(), /Facebook post/);
  assert.doesNotMatch(await fridayCard.textContent(), /Instagram post|Email|Google post/);
  assert.equal(await fridayCard.locator(".status-sent").count(), 1);
  assert.match(await fridayCard.textContent(), /Sent/);

  assert.equal(await saturdayCard.count(), 1);
  assert.match(await saturdayCard.textContent(), /Google post/);
  assert.doesNotMatch(await saturdayCard.textContent(), /Instagram post|Email|Facebook post/);
  assert.equal(await saturdayCard.locator(".status-scheduled").count(), 1);
  assert.match(await saturdayCard.textContent(), /Scheduled/);

  assert.equal(await generatedDeliveryGroups.count(), 2);
  assert.equal(await generatedDeliveryGroups.locator("h3").count(), 0);
  assert.equal(await generatedCards().locator(".card-success").count(), 0);
  assert.equal(await generatedCards().locator(".channel-status-dot").count(), 2);
  assert.deepEqual(
    await saturdayCard.evaluate((card) => {
      const style = getComputedStyle(card);
      return [style.backgroundColor, style.borderTopColor];
    }),
    await neutralCalendarCard.evaluate((card) => {
      const style = getComputedStyle(card);
      return [style.backgroundColor, style.borderTopColor];
    }),
  );
  assert.ok(
    await generatedCards().locator(".channel-status-dot").evaluateAll((dots) => (
      dots.every((dot) => getComputedStyle(dot).backgroundColor === "rgb(56, 133, 35)")
    )),
  );

  assert.equal(
    await page.locator(".calendar-day")
      .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
      .locator(".combined-target-card")
      .count(),
    1,
  );

  console.log(
    "Verified generated copy/media guards, delivery-only persistence, and neutral delivered calendar cards with dot-only success status.",
  );
} finally {
  await browser.close();
}
