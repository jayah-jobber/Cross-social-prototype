import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const channels = [
  {
    name: "Google",
    scheduleLabel: "Schedule Google post",
    scheduled: "Your Google post has been successfully scheduled.",
    delivered: "Your Google post has been successfully posted.",
  },
  {
    name: "Facebook",
    scheduleLabel: "Schedule Facebook post",
    scheduled: "Your Facebook post has been successfully scheduled.",
    delivered: "Your Facebook post has been successfully posted.",
  },
  {
    name: "Instagram",
    scheduleLabel: "Schedule Instagram post",
    scheduled: "Your Instagram post has been successfully scheduled.",
    delivered: "Your Instagram post has been successfully posted.",
  },
  {
    name: "Email",
    scheduleLabel: "Schedule Email",
    scheduled: "Your email campaign has been successfully scheduled.",
    delivered: "Your email campaign has been successfully sent.",
  },
  {
    name: "Website",
    scheduleLabel: "Publish Website page",
    scheduled: "Your website page has been successfully scheduled.",
    delivered: "Your website page has been successfully published.",
  },
];
const generatedChannels = channels.filter(({ name }) => name !== "Website");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const originalCard = () => calendarDay("Saturday, Nov 7").locator(".combined-target-card");
const generatedCard = () => calendarDay("Saturday, Nov 7").locator(".generated-delivery-card");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const generatedReview = () => page.locator(".v4-generated-review");

const completion = () => page.getByRole("dialog", { name: /Nice\. You're making real progress/ });

async function assertV4Toast(message) {
  await page.getByText(message, { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is scheduled", { exact: true }).count(), 0);
  assert.equal(
    await page.getByText("Your post has been successfully scheduled", { exact: true }).count(),
    0,
  );
}

async function waitForPreview(review) {
  const glimmer = review.locator(".v4-preview-glimmer");
  if (await glimmer.count()) {
    await glimmer.waitFor({ state: "detached", timeout: 8000 });
  }
}

async function resetToV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openOriginalCampaign() {
  await originalCard().click();
  await page.locator(".v4-summary-modal")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await context().waitFor();
}

async function selectChannel(review, name) {
  const channel = review.getByRole("radio", { name, exact: true });
  if (await channel.count() && await channel.getAttribute("aria-checked") !== "true") {
    await channel.click();
  }
  await waitForPreview(review);
}

async function addGeneratedInstagramImage(review) {
  await review.locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const channelReview = page.locator(".v4-channel-review");
  await channelReview.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  await channelReview.locator(".review-field").first()
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose image", exact: true }).click();
  await page.getByRole("button", { name: "Save Edit", exact: true }).click();
  await channelReview.locator(".review-footer")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await review.waitFor();
}

async function scheduleChannels(review, expectedChannels, addInstagramMedia = false) {
  for (let index = 0; index < expectedChannels.length; index += 1) {
    const channel = expectedChannels[index];
    await selectChannel(review, channel.name);
    if (addInstagramMedia && channel.name === "Instagram") {
      await addGeneratedInstagramImage(review);
    }
    await review.getByRole("button", { name: channel.scheduleLabel, exact: true }).click();
    const isFinalChannel = index === expectedChannels.length - 1;
    if (isFinalChannel) {
      await completion().waitFor();
      assert.equal(await page.getByRole("status").count(), 0);
      await completion().getByRole("button", { name: "Back to Calendar", exact: true }).click();
    } else {
      await assertV4Toast(channel.scheduled);
    }
  }
}

async function deliverScheduledChannels(review, expectedChannels) {
  for (const channel of expectedChannels) {
    await selectChannel(review, channel.name);
    await review.getByRole("button", { name: "Show scheduled post options" }).click();
    await review.getByRole("menuitem", { name: "Send now", exact: true }).click();
    await assertV4Toast(channel.delivered);
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  // Original V4 campaign: every scheduled toast names its active channel.
  await openOriginalCampaign();
  await scheduleChannels(context(), channels);
  assert.equal(await context().count(), 0);

  // Reopened original calendar card: every delivery toast preserves its channel noun/action.
  await openOriginalCampaign();
  await deliverScheduledChannels(context(), channels);
  await context().waitFor({ state: "detached" });
  assert.equal(await context().count(), 0);

  // Generated "Start from your own idea" flow covers its four supported channels.
  await resetToV4();
  await page.getByLabel("Add to your marketing calendar").fill("Verify channel-specific toasts");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-generated-flow-shell .v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  await scheduleChannels(generatedReview(), generatedChannels, true);
  assert.equal(await page.locator(".v4-generated-flow-shell").count(), 0);

  // Reopened generated calendar card uses the same channel-aware delivery formatter.
  await generatedCard().click();
  await page.locator(".v4-summary-modal")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await context().waitFor();
  await deliverScheduledChannels(context(), generatedChannels);
  await context().waitFor({ state: "detached" });
  assert.equal(await context().count(), 0);

  // The V4-only branch must not alter V5's existing generic schedule toast.
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await originalCard().click();
  const v5Context = page.locator(".v5-context-modal");
  await v5Context.waitFor();
  await v5Context.getByRole("button", { name: "Edit", exact: true }).click();
  const v5Review = page.locator(".v4-channel-review");
  await v5Review.locator(".review-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true })
    .click();
  await page.getByText("Your post is scheduled", { exact: true }).waitFor();

  console.log(
    "Verified V4 channel-specific scheduled and delivered toasts across original, generated, and reopened calendar workflows; V5 copy remains unchanged.",
  );
} finally {
  await browser.close();
}
