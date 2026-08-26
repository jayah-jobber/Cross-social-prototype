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
const inertFridayCard = () => calendarDay("Friday, Nov 6")
  .locator(".marketing-calendar-card")
  .filter({ has: page.getByText("Post title 1", { exact: true }) });
const summaryRows = () => summary().locator(".v4-summary-status-list > li");

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openSummary(card, expectedChannels, scheduleText) {
  await card.click();
  await summary().waitFor();
  assert.equal(await summaryRows().count(), expectedChannels);
  await summary().getByText(`Schedule date: ${scheduleText}`, { exact: true }).waitFor();
  assert.equal(
    await summary().locator(".v4-summary-schedule").getByText("Schedule date:", { exact: true }).count(),
    1,
  );
  assert.equal(await summary().locator(".v4-summary-schedule > p").count(), 2);
  assert.ok(
    (await summaryRows().allTextContents()).every((row) => (
      !/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/.test(row)
    )),
    "Summary channel rows must contain statuses, not per-channel dates.",
  );
  assert.ok(
    await summaryRows().evaluateAll((rows) => rows.every(
      (row) => row.querySelectorAll(".v4-content-status").length === 1,
    )),
    "Every Summary channel row must have exactly one status badge.",
  );
}

async function startCampaignReview(expectedChannels, expectedStart = "Google") {
  await summary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await context().waitFor();
  const switcher = context().locator(".channel-icon-switcher--modal-v4");
  assert.equal(await switcher.getByRole("radio").count(), expectedChannels);
  assert.equal(
    await switcher.getByRole("radio", {
      name: expectedStart,
      exact: true,
    }).getAttribute("aria-checked"),
    "true",
  );
}

async function selectContextChannel(channel) {
  await context().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: channel, exact: true })
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
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  // Only the original Friday social card is presentational in V4.
  assert.equal(await inertFridayCard().count(), 1);
  assert.equal(await inertFridayCard().evaluate((card) => card.tagName), "DIV");
  assert.equal(await inertFridayCard().getAttribute("role"), null);
  assert.equal(await inertFridayCard().getAttribute("tabindex"), null);
  await inertFridayCard().hover();
  assert.deepEqual(
    await inertFridayCard().evaluate((card) => {
      const style = getComputedStyle(card);
      return {
        cursor: style.cursor,
        boxShadow: style.boxShadow,
        transform: style.transform,
      };
    }),
    { cursor: "auto", boxShadow: "none", transform: "none" },
  );
  await inertFridayCard().getByText("Post title 1", { exact: true }).click();
  await page.waitForTimeout(50);
  assert.equal(await summary().count(), 0);
  assert.equal(await context().count(), 0);
  assert.equal(await review().count(), 0);

  // The intact original campaign has one effective schedule.
  assert.equal(
    await originalCard("Saturday, Nov 7").evaluate((card) => card.tagName),
    "BUTTON",
  );
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  await editSchedule("Google", "2026-11-05", "14:30");
  assert.equal(
    await review().locator(".channel-icon-switcher--review").getByRole("radio").count(),
    5,
  );
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await review().getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  assert.equal(
    await review().locator(".channel-icon-switcher--review").getByRole("radio").count(),
    5,
  );
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();

  await openSummary(originalCard("Saturday, Nov 7"), 5, "Various dates");
  await startCampaignReview(5, "Facebook");
  await selectContextChannel("Instagram");
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await context().getByRole("heading", { name: "About this email campaign", exact: true }).waitFor();
  assert.equal(
    await context().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    5,
  );
  assert.equal(
    await context().getByRole("radio", { name: "Email", exact: true }).getAttribute("aria-checked"),
    "true",
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
  for (const [day, expectedStart] of [
    ["Thursday, Nov 5", "Google"],
    ["Friday, Nov 6", "Instagram"],
    ["Saturday, Nov 7", "Facebook"],
  ]) {
    await openSummary(originalCard(day), 5, "Various dates");
    const statuses = await summaryRows().allTextContents();
    assert.ok(statuses.some((row) => row.includes("Google") && row.includes("Scheduled")));
    assert.ok(statuses.some((row) => row.includes("Instagram") && row.includes("Sent")));
    await startCampaignReview(5, expectedStart);
    await selectContextChannel("Google");
    await context().getByText("Nov 5, 2026 · 2:30 PM", { exact: true }).waitFor();
    await selectContextChannel("Instagram");
    await context().getByText("Nov 6, 2026 · 9:00 AM", { exact: true }).waitFor();
    await selectContextChannel("Email");
    await context().getByText("Nov 7, 2026 · 9:00 AM", { exact: true }).waitFor();
    await context().getByRole("button", { name: "Close", exact: true }).click();
  }

  // A mixed split card starts at its first represented channel in canonical order.
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Various dates");
  await startCampaignReview(5, "Facebook");
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await openSummary(originalCard("Friday, Nov 6"), 5, "Various dates");
  await startCampaignReview(5, "Facebook");
  assert.equal(
    await context().getByRole("radio", { name: "Facebook", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();

  // A Facebook-only split card still enters the full campaign at channel 2 of 5.
  await resetV4();
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  await editSchedule("Google", "2026-11-05", "09:00");
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await selectContextChannel("Instagram");
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await editSchedule("Email", "2026-11-08", "09:00");
  await review().locator(".review-footer")
    .getByRole("button", { name: "Schedule Email", exact: true })
    .click();
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Show publishing options" })
    .click();
  await context().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  assert.deepEqual(
    await originalCard("Saturday, Nov 7").locator(".calendar-channel-label").allTextContents(),
    ["fFacebook post"],
  );
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Various dates");
  await startCampaignReview(5, "Facebook");
  assert.equal(
    await context().locator(".channel-icon-switcher--modal-v4").getByRole("radio")
      .evaluateAll((options) => (
        options.findIndex((option) => option.getAttribute("aria-checked") === "true") + 1
      )),
    2,
  );
  await selectContextChannel("Google");
  assert.equal(
    await context().getByRole("radio", { name: "Google", exact: true }).getAttribute("aria-checked"),
    "true",
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();

  // Deletion removes only membership; deleting the remaining campaign removes every card.
  await resetV4();
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  await selectContextChannel("Facebook");
  await deleteCurrent();
  assert.equal(
    await context().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    4,
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await openSummary(originalCard("Saturday, Nov 7"), 4, "Nov 7, 2026 9:00 AM");
  assert.equal(await summary().locator("[data-channel='facebook']").count(), 0);
  await summary().getByRole("button", { name: "Close summary" }).click();

  await resetV4();
  await openSummary(originalCard("Saturday, Nov 7"), 5, "Nov 7, 2026 9:00 AM");
  await startCampaignReview(5);
  for (let remaining = 4; remaining >= 0; remaining -= 1) {
    await deleteCurrent();
    if (remaining > 0) {
      assert.equal(
        await context().locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
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
  await generatedReview.getByRole("radio", { name: "Facebook", exact: true }).click();
  await generatedReview.getByRole("status", { name: "Loading Facebook preview" }).waitFor();
  await generatedReview.locator(".v4-preview-glimmer").waitFor({ state: "detached", timeout: 4500 });
  await generatedReview.getByRole("radio", { name: "Email", exact: true }).click();
  await generatedReview.getByRole("status", { name: "Loading Email preview" }).waitFor();
  await generatedReview.locator(".v4-preview-glimmer").waitFor({ state: "detached", timeout: 4500 });
  await generatedReview.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  const generatedCampaignSchedule = review().locator(".review-field").filter({
    hasText: "Schedule Campaign",
  });
  await generatedCampaignSchedule.getByRole("button", { name: "Edit" }).click();
  const generatedDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await generatedDialog.getByLabel("Schedule date for Email").fill("2026-11-08");
  await generatedDialog.getByRole("button", { name: "Save Edits" }).click();
  await review().locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await generatedReview.waitFor();
  assert.equal(
    await generatedReview.locator(".channel-icon-switcher--modal-v4").getByRole("radio").count(),
    4,
  );
  await generatedReview.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Email", exact: true })
    .click();
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave now" })
    .getByRole("button", { name: "Save drafts and Exit", exact: true })
    .click();

  assert.equal(await generatedCard("Saturday, Nov 7").count(), 1);
  assert.equal(await generatedCard("Sunday, Nov 8").count(), 1);
  assert.equal(
    await generatedCard("Saturday, Nov 7").evaluate((card) => card.tagName),
    "BUTTON",
  );
  assert.equal(
    await generatedCard("Sunday, Nov 8").evaluate((card) => card.tagName),
    "BUTTON",
  );
  for (const [day, expectedStart] of [
    ["Saturday, Nov 7", "Google"],
    ["Sunday, Nov 8", "Email"],
  ]) {
    await openSummary(generatedCard(day), 4, "Various dates");
    assert.equal(await summary().locator("[data-channel='website']").count(), 0);
    assert.equal(
      await summary().locator("[data-channel='email'] [data-status='scheduled']").count(),
      1,
    );
    await startCampaignReview(4, expectedStart);
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
    await page.getByRole("dialog", { name: "Leave now" })
      .getByRole("button", { name: "Save drafts and Exit", exact: true })
      .click();
  }

  console.log(
    "Verified the inert V4 Friday social card plus clickable linked/generated campaigns, split-card entry, dates, delivery progression, deletion, generated scope, loader persistence, and Instagram guard.",
  );
} finally {
  await browser.close();
}
