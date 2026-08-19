import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const stages = [
  ["Understanding your marketing plan", "/assets/v4-loading-marketing-plan.svg"],
  ["Pulling insights from your Jobber data", "/assets/v4-loading-jobber-data.svg"],
  ["Adapting the message for your audience", "/assets/v4-loading-audience.svg"],
  ["Optimizing for channel visibility", "/assets/v4-loading-channel-visibility.svg"],
  ["Adding the finishing touches", "/assets/v4-loading-finishing-touches.svg"],
];
const summaryArtworkPath = "/assets/v4-15-percent-promotion.png";

const flow = () => page.locator(".v4-generated-flow-shell");
const loading = () => flow().locator(".v4-loading-surface");
const generatedSummary = () => flow().locator(".v4-summary-modal--generated");
const generatedReview = () => flow().locator(".v4-generated-review");
const promptInput = () => flow().getByLabel("Edit marketing content prompt");
const regenerate = () => flow().getByRole("button", { name: "Regenerate suggestions" });
const outerClose = () => flow().getByRole("button", { name: "Close suggested marketing content" });

async function resetV4() {
  if (await flow().count()) await outerClose().click();
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function submitFromCalendar(prompt, method = "enter") {
  const calendarPrompt = page.getByLabel("Add to your marketing calendar");
  await calendarPrompt.fill(prompt);
  if (method === "enter") await calendarPrompt.press("Enter");
  else await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
}

async function verifyLoadingSequence({ screenshots = false } = {}) {
  const seenAt = [];
  for (const [index, [message, asset]] of stages.entries()) {
    const status = loading().getByRole("status", { name: message });
    await status.waitFor();
    assert.equal(await page.locator(".prototype-status-controls").count(), 0);
    seenAt.push(Date.now());
    const decoration = status.locator("img");
    assert.equal(new URL(await decoration.getAttribute("src"), baseUrl).pathname, asset);
    if (screenshots && [0, 1, 3].includes(index)) {
      await page.screenshot({ path: `/tmp/v4-loading-stage-${index + 1}.png` });
    }
  }
  assert.ok(seenAt.at(-1) - seenAt[0] >= 2800, "loading stages should not collapse together");
  await generatedSummary().waitFor();
}

async function assertSingleGeneratedDialog() {
  assert.equal(await page.getByRole("dialog").count(), 1);
  assert.equal(await flow().count(), 1);
  assert.equal(await page.locator("[aria-modal='true']").count(), 1);
}

async function assertGeneratedStatusControlsAbsent() {
  assert.equal(await page.locator(".prototype-status-controls").count(), 0);
}

async function waitForGeneratedPreview() {
  const glimmer = generatedReview().locator(".v4-preview-glimmer");
  if (await glimmer.count()) {
    await glimmer.waitFor({ state: "detached", timeout: 4500 });
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  // Initial Enter submit runs all five local-asset stages into generated Summary.
  await submitFromCalendar("Promote fall cleanup", "enter");
  await loading().waitFor();
  await assertSingleGeneratedDialog();
  await assertGeneratedStatusControlsAbsent();
  assert.equal(await flow().getByRole("heading", {
    name: "Suggested Marketing Content",
    exact: true,
  }).count(), 1);
  assert.equal(await promptInput().inputValue(), "Promote fall cleanup");
  assert.equal(await promptInput().getAttribute("readonly"), "");
  assert.equal(await regenerate().isDisabled(), true);
  assert.equal(
    new URL(await loading().locator(".v4-loading-jobber-mark").getAttribute("src"), baseUrl).pathname,
    "/assets/v4-loading-jobber-mark.svg",
  );
  assert.equal(await loading().getByRole("heading", { name: "OUR RECOMMENDATION" }).count(), 1);
  await verifyLoadingSequence({ screenshots: true });

  assert.equal(await generatedSummary().getByRole("heading", {
    name: "OUR RECOMMENDATION",
    exact: true,
  }).count(), 1);
  assert.equal(await generatedSummary().getByRole("heading", {
    name: "15% promotion",
    exact: true,
  }).count(), 1);
  assert.equal(await generatedSummary().locator(".v4-summary-status-list > li").count(), 4);
  assert.equal(await generatedSummary().getByText("Website", { exact: true }).count(), 0);
  const summaryArtwork = generatedSummary().locator(".v4-summary-artwork");
  assert.equal(await summaryArtwork.count(), 1);
  assert.equal(
    new URL(await summaryArtwork.getAttribute("src"), baseUrl).pathname,
    summaryArtworkPath,
  );
  assert.equal(
    await generatedSummary().locator(`img[src="${summaryArtworkPath}"]`).count(),
    1,
  );
  assert.deepEqual(
    await summaryArtwork.evaluate((image) => {
      const bounds = image.getBoundingClientRect();
      return [Math.round(bounds.width), Math.round(bounds.height)];
    }),
    [430, 577],
  );
  assert.equal(await generatedSummary().locator(".v4-summary-collage").count(), 0);
  assert.equal(await generatedSummary().locator(".v4-summary-image-placeholder").count(), 0);
  assert.equal(await generatedSummary().locator(".v4-summary-body--text-only").count(), 0);
  await page.screenshot({ path: "/tmp/v4-generated-summary.png" });
  assert.equal(await generatedSummary().getByRole("button", { name: /close/i }).count(), 0);
  assert.equal(await promptInput().inputValue(), "Promote fall cleanup");
  assert.equal(await regenerate().isEnabled(), true);
  await assertSingleGeneratedDialog();
  await assertGeneratedStatusControlsAbsent();

  // Enter regeneration from Summary returns to Summary and resets review to Google.
  await promptInput().fill("Promote spring cleanup");
  await promptInput().press("Enter");
  await loading().getByRole("status", { name: stages[0][0] }).waitFor();
  await verifyLoadingSequence();
  assert.equal(await promptInput().inputValue(), "Promote spring cleanup");
  await generatedSummary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  await assertGeneratedStatusControlsAbsent();
  assert.equal(await generatedReview().getByRole("heading", {
    name: "15% promotion",
    exact: true,
  }).count(), 1);
  assert.equal(await generatedReview().getByRole("heading", {
    name: "REVIEW MULTIPLE CHANNELS",
    exact: true,
  }).count(), 0);
  const generatedHeaderGeometry = await generatedReview().evaluate((review) => {
    const modal = review.getBoundingClientRect();
    const switcher = review.querySelector(".channel-icon-switcher")?.getBoundingClientRect();
    const details = review.querySelector(".v4-context-details")?.getBoundingClientRect();
    return {
      leftDelta: Math.abs((switcher?.left ?? 0) - (details?.left ?? 0)),
      centerDelta: Math.abs(
        (switcher?.left ?? 0) + (switcher?.width ?? 0) / 2 - (modal.left + modal.width / 2),
      ),
      closeCount: review.querySelectorAll(".context-navigation-close").length,
    };
  });
  assert.ok(generatedHeaderGeometry.leftDelta <= 1, JSON.stringify(generatedHeaderGeometry));
  assert.ok(generatedHeaderGeometry.centerDelta >= 40, JSON.stringify(generatedHeaderGeometry));
  assert.equal(generatedHeaderGeometry.closeCount, 0);
  await page.screenshot({ path: "/tmp/v4-generated-review.png" });
  assert.equal(
    await generatedReview().getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.equal(
    await generatedReview().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    4,
  );
  assert.equal(await generatedReview().getByRole("radio", { name: "Website", exact: true }).count(), 0);
  assert.equal(await generatedReview().getByRole("button", { name: "Close", exact: true }).count(), 0);
  await assertSingleGeneratedDialog();

  // Lifecycle state survives button regeneration from generated review.
  await waitForGeneratedPreview();
  await generatedReview().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await generatedReview().getByRole("radio", { name: "Facebook", exact: true }).waitFor();
  await promptInput().fill("Promote updated cleanup");
  await regenerate().click();
  await loading().getByRole("status", { name: stages[0][0] }).waitFor();
  await verifyLoadingSequence();
  await assertGeneratedStatusControlsAbsent();
  assert.equal(
    await generatedSummary().locator("[data-channel='google'] [data-status='scheduled']").count(),
    1,
  );

  // Outer close owns Summary and review dismissal.
  await outerClose().click();
  await flow().waitFor({ state: "detached" });
  assert.equal(await page.getByRole("heading", { name: "Marketing Plan" }).count(), 1);
  await submitFromCalendar("Review close behavior", "enter");
  await verifyLoadingSequence();
  await generatedSummary().getByRole("button", { name: "Review Drafts" }).click();
  await generatedReview().waitFor();
  await assertGeneratedStatusControlsAbsent();
  await outerClose().click();
  await flow().waitFor({ state: "detached" });

  // Calendar-card contextual review retains the functional Google demo controls.
  const saturdayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".combined-target-card");
  await saturdayCard.click();
  const calendarSummary = page.locator(".v4-summary-modal--calendar");
  await calendarSummary.getByRole("button", { name: "Review Drafts" }).click();
  const statusControls = page.locator(".prototype-status-controls");
  await statusControls.waitFor();
  assert.equal(await statusControls.count(), 1);
  await statusControls.getByRole("button", { name: "Missed", exact: true }).click();
  assert.equal(
    await statusControls.getByRole("button", { name: "Missed", exact: true }).getAttribute("aria-pressed"),
    "true",
  );
  await statusControls.getByRole("button", { name: "Suggested", exact: true }).click();
  await page.locator(".v4-five-channel-modal").getByRole("button", { name: "Close" }).click();

  // Submit button works, duplicate submit is disabled, and stage-1 close cancels completion.
  await resetV4();
  await submitFromCalendar("Button submission", "button");
  await loading().getByRole("status", { name: stages[0][0] }).waitFor();
  assert.equal(await regenerate().isDisabled(), true);
  await outerClose().click();
  await page.waitForTimeout(5400);
  assert.equal(await flow().count(), 0);

  // Closing at stage 4 also cancels the final Summary timeout.
  await submitFromCalendar("Late cancellation", "enter");
  await loading().getByRole("status", { name: stages[3][0] }).waitFor();
  await outerClose().click();
  await page.waitForTimeout(2400);
  assert.equal(await flow().count(), 0);

  // Reduced motion removes transforms but preserves text timing and completion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await submitFromCalendar("Reduced motion sequence", "enter");
  const reducedStatus = loading().getByRole("status", { name: stages[0][0] });
  await reducedStatus.waitFor();
  assert.equal(await reducedStatus.evaluate((node) => getComputedStyle(node).animationName), "none");
  await verifyLoadingSequence();
  await generatedSummary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  const reducedGlimmer = generatedReview().locator(".v4-preview-glimmer");
  await reducedGlimmer.waitFor();
  assert.equal(
    await reducedGlimmer.locator(".v4-preview-glimmer-block").first()
      .evaluate((node) => getComputedStyle(node, "::after").animationName),
    "none",
  );
  assert.equal(
    await generatedReview().locator(".v4-context-footer")
      .evaluate((node) => getComputedStyle(node, "::after").animationName),
    "none",
  );
  await outerClose().click();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // V5 retains its original loader and vertical generated-content flow.
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await submitFromCalendar("V5 remains unchanged", "button");
  await page.locator(".suggested-vertical-dialog").waitFor();
  assert.equal(await page.locator(".v4-loading-surface").count(), 0);
  assert.equal(await page.locator(".v4-summary-modal").count(), 0);

  console.log(
    "Verified V4 five-stage loading, generated shell, regeneration, cancellation, reduced motion, lifecycle preservation, and V5 isolation.",
  );
} finally {
  await browser.close();
}
