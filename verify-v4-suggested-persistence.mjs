import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const flow = () => page.locator(".v4-generated-flow-shell");
const summary = () => flow().locator(".v4-summary-modal--generated");
const generatedReview = () => flow().locator(".v4-generated-review");
const reopenedReview = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const generatedCard = () => page.locator(".generated-delivery-card");
const originalCard = () => page.locator(".combined-target-card");

async function generateSuggestion(prompt) {
  await page.getByLabel("Add to your marketing calendar").fill(prompt);
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await summary().waitFor({ timeout: 8000 });
}

async function waitForFirstPreviewLoad(reviewer, channel) {
  const glimmer = reviewer.locator(".v4-preview-glimmer");
  const startedAt = Date.now();
  await reviewer.getByRole("status", { name: `Loading ${channel} preview` }).waitFor();
  assert.equal(await glimmer.locator(".v4-preview-glimmer-block").count(), 2);
  assert.equal(await reviewer.locator(".v4-context-preview").getAttribute("aria-busy"), "true");
  await glimmer.waitFor({ state: "detached", timeout: 4500 });
  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed >= 2900, `preview loading ended too early (${elapsed}ms)`);
  assert.ok(elapsed < 3800, `preview loading ended too late (${elapsed}ms)`);
  assert.equal(await reviewer.locator(".v4-context-preview").getAttribute("aria-busy"), "false");
}

async function expectPreviewImmediate(reviewer, channel) {
  assert.equal(await reviewer.locator(".v4-preview-glimmer").count(), 0);
  assert.equal(await reviewer.locator(".v4-context-preview").getAttribute("aria-busy"), "false");
  assert.equal(
    await reviewer.getByRole("button", { name: new RegExp(`^${channel},`) })
      .getAttribute("aria-current"),
    "step",
  );
}

async function selectChannel(reviewer, channel, firstLoad) {
  await reviewer.getByRole("button", { name: new RegExp(`^${channel},`) }).click();
  if (firstLoad) await waitForFirstPreviewLoad(reviewer, channel);
  else await expectPreviewImmediate(reviewer, channel);
}

async function deleteCurrent(reviewer) {
  const glimmer = reviewer.locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
  await reviewer.locator(".v4-context-footer")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: /Delete (Post|Campaign)/, exact: true })
    .click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();

  assert.equal(await originalCard().count(), 1);
  assert.equal(await generatedCard().count(), 0);

  // Generation remains ephemeral until the user accepts it with Review Drafts.
  await generateSuggestion("Create a 15% Christmas promotion");
  assert.equal(await generatedCard().count(), 0);

  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  assert.equal(await generatedCard().count(), 1);
  assert.match(await generatedCard().locator(".calendar-card-details").textContent(), /Needs review/);
  assert.equal(await generatedCard().locator(".channel-status-dot").count(), 0);
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);
  assert.equal(await generatedCard().evaluate((card) => card.classList.contains("published-card")), false);

  // Google receives the accessible three-second treatment on this campaign's first review.
  const firstLoadStartedAt = Date.now();
  const glimmer = generatedReview().locator(".v4-preview-glimmer");
  await generatedReview().getByRole("status", { name: "Loading Google preview" }).waitFor();
  assert.equal(await flow().getByLabel("Edit marketing content prompt").count(), 1);
  assert.equal(await generatedReview().getByRole("heading", { name: "15% promotion" }).count(), 1);
  assert.equal(await generatedReview().locator(".v4-context-facts").count(), 1);
  assert.equal(await generatedReview().locator(".v4-preview-glimmer-block").count(), 2);
  assert.equal(await generatedReview().locator(".context-progress-header").evaluate((node) => node.inert), true);
  assert.equal(await generatedReview().locator(".v4-context-footer").evaluate((node) => node.inert), true);
  await generatedReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .evaluate((button) => button.click());
  assert.equal(await generatedCard().locator(".channel-status-dot").count(), 0);
  assert.equal(await page.getByText("Your post is scheduled", { exact: true }).count(), 0);
  await glimmer.waitFor({ state: "detached", timeout: 4500 });
  const firstLoadElapsed = Date.now() - firstLoadStartedAt;
  assert.ok(firstLoadElapsed >= 2900, `preview loading ended too early (${firstLoadElapsed}ms)`);
  assert.ok(firstLoadElapsed < 3800, `preview loading ended too late (${firstLoadElapsed}ms)`);
  assert.equal(await generatedReview().locator(".social-card").count(), 1);

  // Each channel loads once; revisiting Google or Facebook is immediate.
  await selectChannel(generatedReview(), "Facebook", true);
  await selectChannel(generatedReview(), "Google", false);
  await selectChannel(generatedReview(), "Facebook", false);
  await selectChannel(generatedReview(), "Instagram", true);
  await selectChannel(generatedReview(), "Google", false);

  // Regeneration creates a fresh content instance and resets channel load history.
  await flow().getByLabel("Edit marketing content prompt").fill("Create a fresh spring promotion");
  await flow().getByRole("button", { name: "Regenerate suggestions" }).click();
  await summary().waitFor({ timeout: 8000 });
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  await waitForFirstPreviewLoad(generatedReview(), "Google");

  // Delivered status behavior remains intact alongside still-suggested channels.
  await generatedReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  assert.equal(await generatedCard().locator(".status-scheduled").count(), 1);
  assert.match(await generatedCard().locator(".calendar-card-details").textContent(), /Needs review/);

  await flow().getByLabel("Close suggested marketing content").click();
  await flow().waitFor({ state: "detached" });
  assert.equal(await generatedCard().count(), 1);

  // Reopening the same accepted campaign preserves loaded channels.
  await generatedCard().click();
  const calendarSummary = page.locator(".v4-summary-modal--calendar");
  await calendarSummary.waitFor();
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await reopenedReview().waitFor();
  await expectPreviewImmediate(reopenedReview(), "Google");

  // A channel not visited since regeneration still receives its one load after reopening.
  await selectChannel(reopenedReview(), "Facebook", true);

  // Deletion updates the persisted card and removing the final channel removes the campaign.
  await deleteCurrent(reopenedReview());
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 3);
  assert.equal(await generatedCard().locator(".status-scheduled").count(), 1);
  for (let remaining = 2; remaining >= 0; remaining -= 1) {
    if (await reopenedReview().count() === 0) {
      await generatedCard().click();
      await page.locator(".v4-summary-modal--calendar")
        .getByRole("button", { name: "Review Drafts", exact: true })
        .click();
    }
    await reopenedReview().waitFor();
    await deleteCurrent(reopenedReview());
    assert.equal(await generatedCard().locator(".calendar-channel-label").count(), remaining);
  }
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await originalCard().count(), 1);
  assert.equal(await originalCard().locator(".calendar-channel-label").count(), 5);

  console.log(
    "Verified V4 per-campaign first loads, immediate revisits, regeneration reset, reopen persistence, deletion, and delivered-card isolation.",
  );
} finally {
  await browser.close();
}
