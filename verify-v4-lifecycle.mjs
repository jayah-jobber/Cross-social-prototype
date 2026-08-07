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

async function selectVersionFour() {
  await page.getByRole("button", { name: "Version 1" }).click();
  await page.getByRole("button", { name: "Version 4" }).click();
}

async function openSaturday() {
  await campaignCard("Saturday, Nov 7").click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await modal().waitFor();
}

async function openCampaignReview(day) {
  await campaignCard(day).click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
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

  // V4 alone uses the selected Nov 2–8 week and starts with one Nov 7 campaign card.
  assert.equal(await calendarDay("Sunday, Nov 1").count(), 0);
  assert.equal(await calendarDay("Sunday, Nov 8").count(), 1);
  assert.equal(await campaignCard("Saturday, Nov 7").count(), 1);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 5);
  await openSaturday();

  // Unscheduled contextual action is an exact split CTA.
  assert.equal(
    await modalFooter().getByRole("button", { name: "Schedule and view next", exact: true }).count(),
    1,
  );
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

  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-05");
  await scheduleDialog.getByLabel("Schedule time for Google").fill("14:30");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await reviewSchedule.getByText("Nov 5, 2026 2:30 PM", { exact: true }).waitFor();
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await expectProgress("1 of 1");
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Thursday, Nov 5"), ["GGoogle post"]);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 4);

  // Moving back aggregates with the existing same-topic Nov 7 channels.
  await openCampaignReview("Thursday, Nov 5");
  assert.equal(
    await modal().locator(".v4-context-facts").getByRole("button", { name: "Edit" }).count(),
    0,
  );
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Google").fill("2026-11-07");
  await scheduleDialog.getByLabel("Schedule time for Google").fill("09:00");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await expectProgress("1 of 5");
  await modal().getByRole("button", { name: "Close", exact: true }).click();
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

  // Date-specific cards open scoped carousels.
  await openCampaignReview("Friday, Nov 6");
  await expectProgress("1 of 1");
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
  await modalFooter().getByRole("button", { name: "Schedule and view next", exact: true }).click();
  await page.getByText("Your post is scheduled", { exact: true }).waitFor();
  await selectModalChannel("Google");
  await modalFooter().getByRole("button", { name: "Show scheduled post options" }).click();
  await modal().getByRole("menuitem", { name: "Send now", exact: true }).click();
  await page.getByText("Your Google post has been successfully posted.", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["GGoogle post"]);

  // Saturday review uses its current date and has scheduling/posting parity.
  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  assert.equal(
    await reviewFooter().getByRole("button", { name: "Delete Post" }).getAttribute("aria-disabled"),
    null,
  );
  await reviewSchedule.getByRole("button", { name: "Edit" }).click();
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits" }).click();
  await reviewSchedule.getByText("Nov 8, 2026 9:00 AM", { exact: true }).waitFor();
  assert.equal(
    await reviewFooter().getByRole("button", { name: "Schedule and view next", exact: true }).count(),
    1,
  );
  await reviewFooter().getByRole("button", { name: "Schedule and view next", exact: true }).click();
  await page.getByText("Your post is scheduled", { exact: true }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.equal(await campaignCard("Sunday, Nov 8").locator(".status-scheduled").count(), 1);

  await selectVersionFour();
  await openSaturday();
  await selectModalChannel("Facebook");
  await modalFooter().getByRole("button", { name: "Edit", exact: true }).click();
  await reviewFooter().getByRole("button", { name: "Show publishing options" }).click();
  await page.getByRole("menuitem", { name: "Post now", exact: true }).click();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Facebook, sent" }).getAttribute("class"),
    "completed",
  );
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await expectProgress("2 of 4");
  await page.getByText("Your Facebook post has been successfully posted.", { exact: true }).waitFor();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(await cardChannels("Friday, Nov 6"), ["fFacebook post"]);
  assert.equal(await campaignCard("Sunday, Nov 8").count(), 0);

  // Deleting the only channel in a moved group removes the card without 0-of-0.
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
  await reviewFooter().getByRole("button", { name: "Back" }).click();
  await deleteCurrentFromModal();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await modal().count(), 0);
  assert.equal(await campaignCard("Thursday, Nov 5").count(), 0);
  await page.getByText("Google post is deleted", { exact: true }).waitFor();

  // Reset restores five Nov 7 channels; V1 keeps its original static week.
  await page.getByRole("button", { name: "Version 1" }).click();
  assert.equal(await calendarDay("Sunday, Nov 1").count(), 1);
  assert.equal(await calendarDay("Sunday, Nov 8").count(), 0);
  await page.getByRole("button", { name: "Version 4" }).click();
  assert.equal(await campaignCard("Friday, Nov 6").count(), 0);
  assert.equal((await cardChannels("Saturday, Nov 7")).length, 5);
  await openSaturday();
  await expectProgress("1 of 5");

  console.log("Verified V4 dynamic dates, scoped cards, lifecycle moves, review parity, deletion, and reset.");
} finally {
  await browser.close();
}
