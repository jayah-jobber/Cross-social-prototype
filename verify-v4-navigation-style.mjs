import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const navigationToggle = () => page.getByRole("group", {
  name: "Version 4 navigation style",
});
const campaignCard = (day) => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: day, exact: true }) })
  .locator(".combined-target-card");
const saturdayCard = () => campaignCard("Saturday, Nov 7");
const modal = () => page.locator(".v4-five-channel-modal");
const arrowNavigator = (scope) => scope.locator(".v4-arrow-navigator");

async function assertArrowNavigation(scope, current, total) {
  const navigator = arrowNavigator(scope);
  assert.equal(await navigator.locator("h2").textContent(), "Review multiple channels");
  assert.equal(
    await navigator.getByText(`${current} of ${total}`, { exact: true }).count(),
    1,
  );
  const geometry = await scope.locator(".v4-navigation--arrows").evaluate((header) => {
    const headerBox = header.getBoundingClientRect();
    const controls = header.querySelector(".v4-arrow-controls");
    const controlsBox = controls?.getBoundingClientRect();
    return {
      centerDelta: Math.abs(
        (controlsBox?.left ?? 0) + (controlsBox?.width ?? 0) / 2
          - (headerBox.left + headerBox.width / 2),
      ),
      buttonSizes: Array.from(controls?.querySelectorAll("button") ?? []).map((button) => {
        const box = button.getBoundingClientRect();
        return [Math.round(box.width), Math.round(box.height)];
      }),
    };
  });
  assert.ok(geometry.centerDelta <= 1, JSON.stringify(geometry));
  assert.deepEqual(geometry.buttonSizes, [[32, 32], [32, 32]]);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await navigationToggle().count(), 0);

  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await navigationToggle().waitFor();
  assert.equal(await navigationToggle().count(), 1);
  assert.equal(
    await navigationToggle().getByRole("button", { name: "Arrow button", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await navigationToggle().evaluate((toggle) => (
      document.querySelector(".prototype-frame")?.contains(toggle) ?? false
    )),
    false,
  );

  await saturdayCard().click();
  await page.locator(".v4-summary-modal").getByRole("button", {
    name: "Review Drafts",
    exact: true,
  }).click();
  await modal().waitFor();

  // Five-channel contextual review defaults to the Figma arrow header.
  await assertArrowNavigation(modal(), 1, 5);
  assert.equal(
    await arrowNavigator(modal()).getByRole("button", { name: "Previous channel" }).isDisabled(),
    true,
  );
  await arrowNavigator(modal()).getByRole("button", { name: "Next channel" }).click();
  await assertArrowNavigation(modal(), 2, 5);
  await modal().getByRole("heading", { name: "About this Facebook post", exact: true }).waitFor();

  // The external toggle updates the open modal without changing its active channel.
  await navigationToggle().getByRole("button", { name: "Progress button", exact: true }).click();
  assert.equal(await arrowNavigator(modal()).count(), 0);
  assert.equal(await modal().locator(".channel-progress-stepper--modal-v4").count(), 1);
  assert.equal(
    await modal().getByRole("button", { name: /^Facebook,/ }).getAttribute("aria-current"),
    "step",
  );
  await navigationToggle().getByRole("button", { name: "Arrow button", exact: true }).click();
  await assertArrowNavigation(modal(), 2, 5);

  // Deletion updates the scoped count and advances to the next remaining channel.
  await modal().locator(".v4-context-footer").getByRole("button", {
    name: "Delete",
    exact: true,
  }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  await assertArrowNavigation(modal(), 2, 4);
  await modal().getByRole("heading", { name: "About this Instagram post", exact: true }).waitFor();

  // Content review pages use the same navigator and scoped position.
  await modal().locator(".v4-context-footer").getByRole("button", {
    name: "Edit",
    exact: true,
  }).click();
  const review = page.locator(".v4-channel-review");
  await review.waitFor();
  await assertArrowNavigation(review, 2, 4);
  await arrowNavigator(review).getByRole("button", { name: "Next channel" }).click();
  await assertArrowNavigation(review, 3, 4);
  await review.getByRole("heading", { name: "Review Email Campaign", exact: true }).waitFor();

  // Draft schedule edits preserve the active channel and arrow scope.
  const scheduleField = review.locator(".review-field").filter({ hasText: "Schedule Campaign" });
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await scheduleDialog.getByLabel("Schedule date for Email").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await review.getByRole("heading", { name: "Review Email Campaign", exact: true }).waitFor();
  await assertArrowNavigation(review, 3, 4);
  await scheduleField.getByText("Nov 8, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);

  await review.locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await modal().waitFor();
  await assertArrowNavigation(modal(), 3, 4);
  await modal().getByText("Nov 8, 2026 · 9:00 AM", { exact: true }).waitFor();
  await modal().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Email", exact: true })
    .click();
  await assertArrowNavigation(modal(), 4, 4);
  await modal().getByRole("heading", { name: "About this website page", exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();

  // Split-card entry honors the represented Email channel in both navigation styles.
  await navigationToggle().getByRole("button", { name: "Progress button", exact: true }).click();
  await campaignCard("Sunday, Nov 8").click();
  await page.locator(".v4-summary-modal").getByRole("button", {
    name: "Review Drafts",
    exact: true,
  }).click();
  await modal().waitFor();
  assert.equal(
    await modal().getByRole("button", { name: /^Email,/ }).getAttribute("aria-current"),
    "step",
  );
  await navigationToggle().getByRole("button", { name: "Arrow button", exact: true }).click();
  await assertArrowNavigation(modal(), 3, 4);
  await arrowNavigator(modal()).getByRole("button", { name: "Previous channel" }).click();
  await assertArrowNavigation(modal(), 2, 4);
  await arrowNavigator(modal()).getByRole("button", { name: "Previous channel" }).click();
  await assertArrowNavigation(modal(), 1, 4);
  await modal().getByText("Nov 7, 2026 · 9:00 AM", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();

  // Generated review uses its four-channel scope with matching arrow behavior.
  await page.getByLabel("Add to your marketing calendar").fill("Navigation style QA");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.waitFor();
  await assertArrowNavigation(generatedReview, 1, 4);
  assert.equal(
    await arrowNavigator(generatedReview)
      .getByRole("button", { name: "Previous channel" }).isDisabled(),
    true,
  );
  await arrowNavigator(generatedReview).getByRole("button", { name: "Next channel" }).click();
  await assertArrowNavigation(generatedReview, 2, 4);
  await generatedReview.getByRole("heading", {
    name: "About this Facebook post",
    exact: true,
  }).waitFor();
  await page.getByLabel("Close suggested marketing content").click();

  // The experiment is isolated to V4 and resets to arrows after version changes.
  await navigationToggle().getByRole("button", { name: "Progress button", exact: true }).click();
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  assert.equal(await navigationToggle().count(), 0);
  await saturdayCard().click();
  const v5Modal = page.locator(".v5-context-modal");
  await v5Modal.waitFor();
  assert.equal(await v5Modal.locator(".v4-arrow-navigator").count(), 0);
  assert.equal(await v5Modal.locator(".channel-progress-stepper--modal-v5").count(), 1);
  await v5Modal.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(
    await navigationToggle().getByRole("button", { name: "Arrow button", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );

  console.log(
    "Verified V4 arrow defaults, scoped navigation, deletion, review parity, live toggling, reset, and V5 isolation.",
  );
} finally {
  await browser.close();
}
