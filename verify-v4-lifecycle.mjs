import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const modal = () => page.locator(".v4-five-channel-modal");
const modalFooter = () => modal().locator(".v4-context-footer");
const reviewFooter = () => page.locator(".v4-channel-review .review-footer");
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const campaignCard = (day) => calendarDay(day).locator(".combined-target-card");
const v4ActionLabels = [
  ["Google", "Schedule Google post"],
  ["Facebook", "Schedule Facebook post"],
  ["Instagram", "Schedule Instagram post"],
  ["Email", "Schedule Email"],
  ["Website", "Publish Website page"],
];

async function selectVersionFour() {
  await page.getByRole("button", { name: "Version 1" }).click();
  await page.getByRole("button", { name: "Version 4" }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
}

async function openSaturday() {
  await campaignCard("Saturday, Nov 7").click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await modal().waitFor();
}

async function openCampaignReview(day) {
  await campaignCard(day).click();
  const summary = page.locator(".v4-summary-modal");
  if (await summary.count()) {
    await summary.getByRole("button", { name: "Review Drafts" }).click();
  }
  await modal().waitFor();
}

async function expectProgress(value) {
  const [expectedIndex, expectedCount] = value.split(" of ").map(Number);
  const buttons = modal().locator(".channel-progress-stepper--modal-v4").getByRole("button");
  assert.equal(await buttons.count(), expectedCount);
  assert.equal(
    await buttons.evaluateAll((items) => (
      items.findIndex((button) => button.getAttribute("aria-current") === "step") + 1
    )),
    expectedIndex,
  );
  assert.equal(await modal().locator(".v4-context-navigation-controls").count(), 0);
}

async function selectModalChannel(channel) {
  await modal().locator(".channel-progress-stepper--modal-v4")
    .getByRole("button", { name: new RegExp(`^${channel},`) })
    .click();
}

async function deleteCurrentFromModal(buttonName = "Delete Post") {
  await modalFooter().getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: buttonName, exact: true })
    .click();
}

async function deleteCurrentFromReview(buttonName = "Delete Post") {
  await reviewFooter().getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: buttonName, exact: true })
    .click();
}

async function openUnscheduledMenu() {
  await modalFooter().getByRole("button", { name: "Show publishing options" }).click();
}

async function postCurrentNow() {
  await openUnscheduledMenu();
  await modal().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
}

async function cardChannels(day) {
  return campaignCard(day).locator(".calendar-channel-label").allTextContents();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4" }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();

  // V4 alone uses the selected Nov 2–8 week and starts with one Nov 7 campaign card.
  assert.equal(await calendarDay("Sunday, Nov 1").count(), 0);
  assert.equal(await calendarDay("Sunday, Nov 8").count(), 1);
  assert.equal(await campaignCard("Saturday, Nov 7").count(), 1);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 5);
  await openSaturday();

  // Every V4 contextual channel uses its specific unscheduled CTA and exact Delete label.
  for (const [channel, actionLabel] of v4ActionLabels) {
    await selectModalChannel(channel);
    assert.equal(
      await modalFooter().getByRole("button", { name: actionLabel, exact: true }).count(),
      1,
    );
    assert.equal(
      await modalFooter().getByRole("button", { name: "Delete", exact: true }).count(),
      1,
    );
  }
  await selectModalChannel("Google");
  await openUnscheduledMenu();
  assert.equal(
    await modal().getByRole("menuitem", { name: "Post now and view next", exact: true }).count(),
    1,
  );
  await page.keyboard.press("Escape");

  // Contextual schedule facts are read-only; review Schedule Post owns date editing.
  assert.equal(
    await modal().locator(".v4-context-facts").getByRole("button", { name: "Edit" }).count(),
    0,
  );
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Google Post" }).waitFor();
  const reviewStepper = page.locator(".v4-channel-review .channel-progress-stepper--review");
  for (const [channel, actionLabel] of v4ActionLabels) {
    await reviewStepper.getByRole("button", { name: new RegExp(`^${channel},`) }).click();
    assert.equal(
      await reviewFooter().getByRole("button", { name: actionLabel, exact: true }).count(),
      1,
    );
    assert.equal(
      await reviewFooter().getByRole("button", { name: "Delete", exact: true }).count(),
      1,
    );
  }
  await reviewStepper.getByRole("button", { name: /^Google,/ }).click();
  const reviewSchedule = page.locator(".review-field").filter({ hasText: "Schedule Post" });
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  const dateInput = scheduleDialog.getByLabel("Schedule date for Google");
  const timeInput = scheduleDialog.getByLabel("Schedule time for Google");
  assert.equal(await dateInput.inputValue(), "2026-11-07");
  assert.equal(await dateInput.getAttribute("min"), "2026-11-02");
  assert.equal(await dateInput.getAttribute("max"), "2026-11-08");
  assert.equal(await timeInput.inputValue(), "09:00");
  await scheduleDialog.getByText(
    "Time zone: (GMT-05:00) America/Toronto (EST)",
    { exact: true },
  ).waitFor();
  await dateInput.fill("2026-11-05");
  await timeInput.fill("14:30");
  await scheduleDialog.getByRole("button", { name: "Close Schedule Date" }).click();
  await reviewSchedule.getByText("Nov 7, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);

  // An unchanged save stays on the current review and does not show a toast.
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Review Google Post" }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);

  // An actual date change regroups Google and advances within the original scope.
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-05");
  await scheduleDialog.getByLabel("Schedule time for Google").fill("14:30");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  await reviewSchedule.getByText("Nov 7, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await expectProgress("1 of 4");
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Thursday, Nov 5"), ["GGoogle post"]);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 4);

  // Rescheduling a direct single-channel card returns to the calendar.
  await campaignCard("Thursday, Nov 5").click();
  await modal().waitFor();
  assert.equal(await page.locator(".v4-summary-modal").count(), 0);
  await expectProgress("1 of 1");
  assert.equal(
    await modal().locator(".v4-context-facts").getByRole("button", { name: "Edit" }).count(),
    0,
  );
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-07");
  await scheduleDialog.getByLabel("Schedule time for Google").fill("09:00");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  assert.equal(await campaignCard("Thursday, Nov 5").count(), 0);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 5);

  // Contextual Post now moves Instagram to Nov 6 and keeps the remaining scope coherent.
  await openSaturday();
  await selectModalChannel("Instagram");
  await postCurrentNow();
  await page.getByText("Your Instagram post has been successfully posted.", { exact: true }).waitFor();
  await expectProgress("3 of 4");
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["◎Instagram post"]);
  assert.match(
    await campaignCard("Friday, Nov 6").locator(".calendar-card-details").textContent(),
    /Sent/,
  );
  assert.equal(await campaignCard("Friday, Nov 6").locator(".status-sent").count(), 1);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 4);

  // Single-channel date cards skip Summary and open scoped context directly.
  await campaignCard("Friday, Nov 6").click();
  await modal().waitFor();
  assert.equal(await page.locator(".v4-summary-modal").count(), 0);
  await expectProgress("1 of 1");
  await modal().getByText("Sent", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  await openCampaignReview("Saturday, Nov 7");
  await expectProgress("1 of 4");

  // Multiple Post now actions aggregate on one Nov 6 Sent card.
  await selectModalChannel("Facebook");
  await postCurrentNow();
  await page.getByText("Your Facebook post has been successfully posted.", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["fFacebook post", "◎Instagram post"]);
  assert.equal(await campaignCard("Friday, Nov 6").locator(".status-sent").count(), 2);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 3);

  // All five Post now actions collapse into one Nov 6 Sent card and remove Nov 7.
  await selectVersionFour();
  await openSaturday();
  for (let index = 0; index < 5; index += 1) {
    await postCurrentNow();
  }
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.equal(await campaignCard("Saturday, Nov 7").count(), 0);
  assert.equal((await cardChannels("Friday, Nov 6")).length, 5);
  assert.equal(await campaignCard("Friday, Nov 6").locator(".status-sent").count(), 5);

  // Prototype mixed-status controls update the active channel's current date card.
  await selectVersionFour();
  await openSaturday();
  await page.getByRole("group", { name: "Google contextual modal demo status" })
    .getByRole("button", { name: "Missed" })
    .click();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await campaignCard("Saturday, Nov 7").locator(".status-missed").count(), 1);
  assert.match(
    await campaignCard("Saturday, Nov 7").locator(".calendar-card-details").textContent(),
    /Needs review/,
  );

  // Scheduled Send now also moves a channel to Nov 6.
  await selectVersionFour();
  await openSaturday();
  await modalFooter().getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await page.getByText("Your post is scheduled", { exact: true }).waitFor();
  await expectProgress("2 of 5");
  await selectModalChannel("Google");
  await modalFooter().getByRole("button", { name: "Show scheduled post options" }).click();
  await modal().getByRole("menuitem", { name: "Send now", exact: true }).click();
  await page.getByText("Your Google post has been successfully posted.", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["GGoogle post"]);

  // A middle-channel date change advances without a toast; its green CTA owns success feedback.
  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  assert.equal(
    await reviewFooter().getByRole("button", { name: "Delete", exact: true }).getAttribute("aria-disabled"),
    null,
  );
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  await reviewSchedule.getByText("Nov 7, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
  await reviewStepper.getByRole("button", { name: /^Facebook,/ }).click();
  assert.equal(
    await reviewFooter().getByRole("button", { name: "Schedule Facebook post", exact: true }).count(),
    1,
  );
  await reviewFooter().getByRole("button", { name: "Schedule Facebook post", exact: true }).click();
  await page.getByText("Your post is scheduled", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  assert.equal(await reviewStepper.getByRole("button", { name: /^Facebook,/ }).count(), 0);
  assert.equal(await reviewStepper.getByRole("button").count(), 4);
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await campaignCard("Sunday, Nov 8").locator(".status-scheduled").count(), 1);

  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewFooter().getByRole("button", { name: "Show publishing options" }).click();
  await page.getByRole("menuitem", { name: "Post now", exact: true }).click();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  assert.equal(
    await reviewStepper.getByRole("button", { name: /^Facebook,/ }).count(),
    0,
  );
  assert.equal(await reviewStepper.getByRole("button").count(), 4);
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await expectProgress("2 of 4");
  await page.getByText("Your Facebook post has been successfully posted.", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["fFacebook post"]);
  assert.equal(await campaignCard("Sunday, Nov 8").count(), 0);

  // Moving the final review channel with Post now exits to Calendar.
  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Website");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Website Page" }).waitFor();
  await reviewFooter().getByRole("button", { name: "Show publishing options" }).click();
  await page.getByRole("menuitem", { name: "Publish now", exact: true }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["Website"]);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 4);

  // Deleting a middle review item immediately opens the next scoped preview.
  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await deleteCurrentFromReview();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  assert.equal(await reviewStepper.getByRole("button", { name: /^Facebook,/ }).count(), 0);
  await page.getByText("Facebook post is deleted", { exact: true }).waitFor();

  // Reschedule progression skips channels that were already deleted ahead.
  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Instagram");
  await deleteCurrentFromModal();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Review Email Campaign" }).waitFor();
  assert.equal(await reviewStepper.getByRole("button", { name: /^Instagram,/ }).count(), 0);
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);

  // Rescheduling the only channel in a direct card returns to the calendar.
  await selectVersionFour();
  await openSaturday();
  assert.equal(
    await modal().locator(".v4-context-facts").getByRole("button", { name: "Edit" }).count(),
    0,
  );
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-05");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  await campaignCard("Thursday, Nov 5").click();
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-04");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.equal(await campaignCard("Thursday, Nov 5").count(), 0);
  assert.deepEqual(await cardChannels("Wednesday, Nov 4"), ["GGoogle post"]);
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);

  // Reset restores five Nov 7 channels; V1 keeps its original static week.
  await page.getByRole("button", { name: "Version 1" }).click();
  assert.equal(await calendarDay("Sunday, Nov 1").count(), 1);
  assert.equal(await calendarDay("Sunday, Nov 8").count(), 0);
  await page.getByRole("button", { name: "Version 4" }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
  assert.equal(await campaignCard("Friday, Nov 6").count(), 0);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 5);
  await openSaturday();
  await expectProgress("1 of 5");

  console.log("Verified V4 dynamic dates, scoped cards, lifecycle moves, review parity, deletion, and reset.");
} finally {
  await browser.close();
}
