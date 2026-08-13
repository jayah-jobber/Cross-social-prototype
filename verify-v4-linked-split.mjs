import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const summary = () => page.locator(".v4-summary-modal--calendar");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const review = () => page.locator(".v4-channel-review");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const originalCard = (day) => calendarDay(day).locator(".combined-target-card");
const generatedCard = (day) => calendarDay(day).locator(".generated-delivery-card");
const summaryRows = () => summary().locator(".v4-summary-status-list > li");

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
}

async function openSummary(card, expectedChannels, scheduleText) {
  await card.click();
  await summary().waitFor();
  assert.equal(await summaryRows().count(), expectedChannels);
  await summary().getByText(`Schedule date: ${scheduleText}`, { exact: true }).waitFor();
}

async function startCampaignReview(expectedChannels) {
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  const stepper = context().locator(".channel-progress-stepper--modal-v4");
  assert.equal(await stepper.getByRole("button").count(), expectedChannels);
  assert.equal(
    await stepper.getByRole("button", { name: /^Google,/ }).getAttribute("aria-current"),
    "step",
  );
}

async function selectContextChannel(channel) {
  await context().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: new RegExp(`^${channel},`) })
    .click();
  const glimmer = context().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
}

async function editSchedule(channel, date, time) {
  await context().locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await review().getByRole("heading", { name: new RegExp(`Review ${channel}`) }).waitFor();
  const scheduleField = review().locator(".review-field").filter({
    hasText: /Schedule (Post|Campaign)/,
  });
  await scheduleField.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Schedule Date" });
  await dialog.getByLabel(`Schedule date for ${channel}`).fill(date);
  await dialog.getByLabel(`Schedule time for ${channel}`).fill(time);
  await dialog.getByRole("button", { name: "Save Edits" }).click();
}

async function deleteCurrent() {
  await context().locator(".v4-context-footer").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: /Delete (Post|Campaign|Page)/ })
    .click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();

  // The intact original campaign has one effective schedule.
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  await editSchedule("Google", "2026-11-05", "14:30");
  assert.equal(
    await review().locator(".channel-progress-stepper--review").getByRole("button").count(),
    5,
  );
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await review().getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  assert.equal(
    await review().locator(".channel-progress-stepper--review").getByRole("button").count(),
    5,
  );
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();

  await openSummary(originalCard("Saturday, Nov 7"), 5, "Various dates");
  await startCampaignReview(5);
  await selectContextChannel("Instagram");
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  assert.equal(
    await context().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    5,
  );
  assert.equal(
    await context().getByRole("button", { name: /^Email,/ }).getAttribute("aria-current"),
    "step",
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();

  assert.deepEqual(
    await originalCard("Thursday, Nov 5").locator(".calendar-channel-label").allTextContents(),
    ["GGoogle post"],
  );
  assert.deepEqual(
    await originalCard("Friday, Nov 6").locator(".calendar-channel-label").allTextContents(),
    ["◎Instagram post"],
  );
  assert.equal(
    await originalCard("Saturday, Nov 7").locator(".calendar-channel-label").count(),
    3,
  );

  // Every split card, including one-channel groups, re-enters the campaign-wide summary.
  for (const day of ["Thursday, Nov 5", "Friday, Nov 6", "Saturday, Nov 7"]) {
    await openSummary(originalCard(day), 5, "Various dates");
    const statuses = await summaryRows().allTextContents();
    assert.ok(statuses.some((row) => row.includes("Google") && row.includes("Scheduled")));
    assert.ok(statuses.some((row) => row.includes("Instagram") && row.includes("Sent")));
    await startCampaignReview(5);
    await selectContextChannel("Google");
    await context().getByText("Nov 5, 2026 · 2:30 PM", { exact: true }).waitFor();
    await selectContextChannel("Instagram");
    await context().getByText("Nov 6, 2026 · 9:00 AM", { exact: true }).waitFor();
    await selectContextChannel("Email");
    await context().getByText("Nov 7, 2026 · 9:00 AM", { exact: true }).waitFor();
    await context().getByRole("button", { name: "Close", exact: true }).click();
  }

  // Deletion removes only membership; deleting the remaining campaign removes every card.
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Various dates");
  await startCampaignReview(5);
  await selectContextChannel("Facebook");
  await deleteCurrent();
  assert.equal(
    await context().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
    4,
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await openSummary(originalCard("Thursday, Nov 5"), 4, "Various dates");
  assert.equal(await summary().locator("[data-channel='facebook']").count(), 0);
  await summary().getByRole("button", { name: "Close summary" }).click();

  await resetV4();
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  for (let remaining = 4; remaining >= 0; remaining -= 1) {
    await deleteCurrent();
    if (remaining > 0) {
      assert.equal(
        await context().locator(".channel-progress-stepper--modal-v4").getByRole("button").count(),
        remaining,
      );
    }
  }
  assert.equal(await page.locator(".combined-target-card").count(), 0);

  // Generated campaigns retain campaign scope, loader history, and Instagram guard after splitting.
  await resetV4();
  await page.getByLabel("Add to your marketing calendar").fill("Linked generated campaign");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-generated-flow-shell .v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.getByRole("status", { name: "Loading Google preview" }).waitFor();
  await generatedReview.locator(".v4-preview-glimmer").waitFor({ state: "detached", timeout: 4500 });
  await generatedReview.getByRole("button", { name: /^Facebook,/ }).click();
  await generatedReview.getByRole("status", { name: "Loading Facebook preview" }).waitFor();
  await generatedReview.locator(".v4-preview-glimmer").waitFor({ state: "detached", timeout: 4500 });
  await generatedReview.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  const generatedSchedule = review().locator(".review-field").filter({ hasText: "Schedule Post" });
  await generatedSchedule.getByRole("button", { name: "Edit" }).click();
  const generatedDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await generatedDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await generatedDialog.getByRole("button", { name: "Save Edits" }).click();
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true })
    .click();
  assert.equal(
    await review().locator(".channel-progress-stepper--review").getByRole("button").count(),
    4,
  );
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await page.getByLabel("Close suggested marketing content").click();

  assert.equal(await generatedCard("Saturday, Nov 7").count(), 1);
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 1);
  for (const day of ["Saturday, Nov 7", "Sunday, Nov 8"]) {
    await openSummary(generatedCard(day), 4, "Various dates");
    assert.equal(await summary().locator("[data-channel='website']").count(), 0);
    await startCampaignReview(4);
    assert.equal(await context().locator(".v4-preview-glimmer").count(), 0);
    await selectContextChannel("Facebook");
    assert.equal(await context().locator(".v4-preview-glimmer").count(), 0);
    await selectContextChannel("Instagram");
    await context().getByText(
      "Add at least 1 image before posting to Instagram",
      { exact: true },
    ).waitFor();
    assert.equal(
      await context().getByRole("button", { name: "Schedule Instagram post" }).isDisabled(),
      true,
    );
    await context().getByRole("button", { name: "Close", exact: true }).click();
  }

  console.log(
    "Verified V4 campaign-wide linked summaries, split-card entry, dates, delivery progression, deletion, generated scope, loader persistence, and Instagram guard.",
  );
} finally {
  await browser.close();
}
