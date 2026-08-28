import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const summary = () => page.locator(".v4-summary-modal");
const feedback = () => page.getByRole("dialog", { name: "Improve future recommendations" });
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const originalCards = () => page.locator(".combined-target-card");
const generatedCards = () => page.locator(".generated-delivery-card");
const adHoc = () => page.locator(".v4-adhoc-page");
const createdRows = () => adHoc().locator(".adhoc-created-campaign-row");
const deleteAll = () => summary().getByRole("button", { name: "Delete All", exact: true });

async function resetV4(surface = "Calendar") {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  if (surface !== "Calendar") {
    await page.getByRole("group", { name: "Version 4 entry surface" })
      .getByRole("button", { name: surface, exact: true }).click();
  }
}

async function chooseReason(label = "The timing isn’t right") {
  await feedback().getByRole("radio", { name: label, exact: true }).check();
}

async function confirmCampaignDeletion() {
  await chooseReason();
  await feedback().getByRole("button", { name: "Delete Campaign", exact: true }).click();
}

async function persistGeneratedCampaign() {
  await page.getByLabel("Add to your marketing calendar").fill("Keep generated separate");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const activeGeneratedSummary = page.locator(
    ".v4-generated-flow-shell .v4-summary-modal--generated",
  );
  await activeGeneratedSummary.waitFor({ timeout: 8_000 });
  assert.equal(
    await activeGeneratedSummary.getByRole("button", { name: "Delete All", exact: true }).count(),
    0,
  );
  await activeGeneratedSummary.getByRole("button", {
    name: "Review Drafts",
    exact: true,
  }).click();
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.waitFor();
  const glimmer = generatedReview.locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4_500 });
  await generatedReview.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  await generatedCards().first().waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await resetV4();

  // The task carousel is not a campaign Summary.
  await page.getByRole("button", { name: /3 pending tasks/ }).click();
  assert.equal(
    await page.locator(".v4-task-modal").getByRole("button", {
      name: "Delete All",
      exact: true,
    }).count(),
    0,
  );
  await page.locator(".v4-task-modal").getByRole("button", { name: "Close" }).click();

  // Calendar campaign Summary exposes an accessible, left-aligned destructive action.
  await calendarDay("Saturday, Nov 7").locator(".combined-target-card").click();
  await summary().waitFor();
  assert.equal(await deleteAll().evaluate((button) => button.tagName), "BUTTON");
  const actionGeometry = await summary().evaluate((dialog) => {
    const details = dialog.querySelector(".v4-summary-details")?.getBoundingClientRect();
    const destructive = dialog.querySelector(".v4-summary-delete-all")?.getBoundingClientRect();
    const primary = dialog.querySelector(".v4-summary-start")?.getBoundingClientRect();
    return {
      deleteLeftDelta: Math.round(Math.abs((destructive?.left ?? 0) - (details?.left ?? 0))),
      primaryToDelete: Math.round((primary?.left ?? 0) - (destructive?.right ?? 0)),
    };
  });
  assert.ok(actionGeometry.deleteLeftDelta <= 1);
  assert.ok(actionGeometry.primaryToDelete >= 20);

  await deleteAll().click();
  assert.equal(await summary().count(), 1);
  assert.equal(
    await feedback().getByText(
      "Tell us why this campaign wasn’t right for your business. Deleting it will remove the entire campaign and all of its cross-channel content from your calendar and Job Showcase.",
      { exact: true },
    ).count(),
    1,
  );
  const confirm = feedback().getByRole("button", { name: "Delete Campaign", exact: true });
  assert.equal(await confirm.isDisabled(), true);
  await chooseReason("Other");
  assert.equal(await feedback().getByPlaceholder("What should we know for next time?").count(), 1);
  assert.equal(await confirm.isEnabled(), true);
  await page.keyboard.press("Escape");
  assert.equal(await feedback().count(), 0);
  assert.equal(await summary().count(), 1);
  await page.waitForFunction(
    () => document.activeElement?.classList.contains("v4-summary-delete-all"),
  );
  assert.equal(await deleteAll().evaluate((button) => document.activeElement === button), true);
  await deleteAll().click();
  assert.equal(await confirm.isDisabled(), true);
  await feedback().getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await summary().count(), 1);

  // Move one original channel to another date, then preserve an unrelated generated campaign.
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  const context = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await context.locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" }).click();
  await context.getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await context.getByRole("button", { name: "Close", exact: true }).click();
  assert.ok(await originalCards().count() > 1);

  await persistGeneratedCampaign();
  assert.ok(await generatedCards().count() > 0);
  await calendarDay("Friday, Nov 6").locator(".combined-target-card").click();
  await deleteAll().click();
  await confirmCampaignDeletion();
  assert.equal(await originalCards().count(), 0);
  assert.ok(await generatedCards().count() > 0);
  assert.equal(await page.getByText("Post title 1", { exact: true }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /3 pending tasks/ }).count(), 1);
  const toast = page.getByRole("status").filter({
    hasText: "Your campaign has been successfully deleted.",
  });
  await toast.waitFor();
  assert.equal(
    (await toast.locator("span").textContent())?.trim(),
    "Your campaign has been successfully deleted.",
  );
  await toast.getByRole("button", { name: "Dismiss notification" }).click();
  assert.equal(await toast.count(), 0);

  // A persisted generated Summary has Delete All and targets only generated state.
  await resetV4();
  await persistGeneratedCampaign();
  await generatedCards().first().click();
  await summary().waitFor();
  assert.equal(await deleteAll().count(), 1);
  await deleteAll().click();
  await confirmCampaignDeletion();
  assert.equal(await generatedCards().count(), 0);
  assert.equal(await originalCards().count(), 1);
  await page.getByRole("status").filter({
    hasText: "Your campaign has been successfully deleted.",
  }).waitFor({ state: "detached", timeout: 5_000 });

  // The shared original campaign disappears from both Calendar and the Ad-hoc live table.
  await resetV4("Ad-hoc");
  const liveRow = adHoc().locator(".adhoc-live-campaign-row:not(.adhoc-created-campaign-row)");
  await liveRow.click({ position: { x: 450, y: 34 } });
  await summary().waitFor();
  assert.equal(await deleteAll().count(), 1);
  await deleteAll().click();
  await confirmCampaignDeletion();
  await page.locator(".marketing-calendar").waitFor();
  assert.equal(await originalCards().count(), 0);
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Ad-hoc", exact: true }).click();
  assert.equal(await liveRow.count(), 0);
  assert.equal(await adHoc().getByText("Content title", { exact: true }).count(), 4);

  // An Ad-hoc-created Summary removes only its own parent/children and lands on Calendar.
  await resetV4("Ad-hoc");
  await adHoc().getByRole("button", { name: "New Job Showcase", exact: true }).click();
  const creation = page.getByRole("dialog", { name: "Showcase a Job" });
  await creation.getByRole("button", { name: /^Next/ }).click();
  await creation.getByRole("checkbox", { name: "Google", exact: true }).check();
  await creation.getByRole("checkbox", { name: "Email", exact: true }).check();
  await creation.getByRole("button", { name: "Create Draft Post", exact: true }).click();
  const createdContext = page.locator(".v4-five-channel-modal");
  await createdContext.waitFor({ timeout: 8_000 });
  assert.equal(await summary().count(), 0);
  assert.equal(await createdRows().count(), 1);
  await createdContext.getByRole("button", { name: "Close", exact: true }).click();
  await createdRows().first().click({ position: { x: 450, y: 34 } });
  await summary().waitFor();
  assert.equal(await deleteAll().count(), 1);
  await deleteAll().click();
  await confirmCampaignDeletion();
  await page.locator(".marketing-calendar").waitFor();
  assert.equal(await originalCards().count(), 1);
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Ad-hoc", exact: true }).click();
  assert.equal(await createdRows().count(), 0);
  assert.equal(await liveRow.count(), 1);
  assert.equal(await adHoc().getByText("Content title", { exact: true }).count(), 4);

  console.log(
    "Verified scoped V4 campaign Delete All presence, exclusion, feedback, keyboard behavior, split-card cleanup, state isolation, Ad-hoc cleanup, landing, and toast.",
  );
} finally {
  await browser.close();
}
