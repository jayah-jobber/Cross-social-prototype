import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const modal = () => page.locator(".v5-context-modal");
const footer = () => modal().locator(".v5-context-footer");
const saturdayCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");

async function select(version) {
  await page.getByRole("button", { name: version, exact: true }).click();
}

async function openV5Saturday() {
  await select("Version 5");
  await saturdayCard().click();
  await modal().waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await openV5Saturday();

  assert.equal(await page.locator(".v4-five-channel-modal").count(), 0);
  assert.equal(
    await modal().getByRole("heading", { name: "Seasonal property cleanup in Hamilton" }).count(),
    1,
  );
  const modalSwitcher = modal().locator(".channel-icon-switcher--modal-v5");
  assert.equal(await modalSwitcher.getByRole("radio").count(), 5);
  assert.equal(await modal().locator(".v4-context-navigation-controls, .v5-context-navigation").count(), 0);
  assert.equal(await modal().locator(".v5-context-facts").getByRole("button", { name: "Edit" }).count(), 0);

  const overflow = await page.evaluate(() => ({
    body: getComputedStyle(document.body).overflow,
    preview: getComputedStyle(document.querySelector(".v5-context-preview-scroll")).overflowY,
  }));
  assert.equal(overflow.body, "hidden");
  assert.equal(overflow.preview, "auto");

  const footerPosition = await footer().boundingBox();
  const modalPosition = await modal().boundingBox();
  assert.ok(footerPosition && modalPosition);
  assert.ok(footerPosition.y + footerPosition.height <= modalPosition.y + modalPosition.height + 1);

  const channelNames = ["Google", "Facebook", "Instagram", "Email", "Website"];
  for (const channel of channelNames) {
    await modalSwitcher.getByRole("radio", { name: channel, exact: true }).click();
    await modal().locator(".v5-preview-channel").getByText(channel, { exact: true }).waitFor();
    assert.equal(await modal().locator(".v5-context-preview-surface > *").count(), 1);
  }

  await modalSwitcher.getByRole("radio", { name: "Google", exact: true }).click();

  const controls = page.getByRole("group", { name: "Google contextual modal demo status" });
  for (const state of ["Suggested", "Scheduled", "Sent", "Missed", "Error"]) {
    await controls.getByRole("button", { name: state, exact: true }).click();
    const expected = state === "Error" ? "Failed" : state;
    const status = modal().locator(".v5-preview-channel .v4-context-status");
    if (state === "Suggested") {
      assert.equal(await status.count(), 0);
    } else {
      assert.equal((await status.textContent())?.trim(), expected);
      assert.equal(
        await modal().locator(".v5-context-header .v4-context-status").count(),
        0,
        "Status belongs beside the channel, not the campaign heading",
      );
    }
  }

  await controls.getByRole("button", { name: "Suggested", exact: true }).click();
  await footer().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Google Post" }).waitFor();
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  const googleButton = page.locator(".v4-google-button");
  await googleButton.getByRole("button", { name: /^Button text,/ }).click();
  await googleButton.getByRole("menuitemradio", { name: "Book" }).click();
  await googleButton.getByLabel("Button URL").fill("https://example.com/v5-book");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  const bookLink = modal().locator(".v5-context-preview-surface").getByRole("link", { name: "Book" });
  await bookLink.waitFor();
  assert.equal(await bookLink.getAttribute("href"), "https://example.com/v5-book");
  assert.equal((await modal().textContent()).includes("https://example.com/v5-book"), false);

  await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await footer().getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  await page.locator("#v4-social-cta").fill("v5-only-contact");
  await page.locator("#v4-social-hashtags").fill("#v5-only-hashtag");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await modal().locator(".channel-post-copy").getByText("v5-only-contact", { exact: true }).waitFor();
  await modal().locator(".channel-post-copy").getByText("#v5-only-hashtag", { exact: true }).waitFor();

  await footer().getByRole("button", { name: "Schedule and view next", exact: true }).click();
  await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  assert.equal(
    (await modal().locator(".v5-preview-channel .v4-context-status").textContent())?.trim(),
    "Scheduled",
  );
  await footer().getByRole("button", { name: "Show scheduled post options" }).click();
  await modal().getByRole("menuitem", { name: "Cancel schedule", exact: true }).click();
  assert.equal(await modal().locator(".v5-preview-channel .v4-context-status").count(), 0);

  await modal().getByRole("button", { name: "Close", exact: true }).click();
  await select("Version 4");
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await saturdayCard().click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  assert.equal(await page.locator(".v4-five-channel-modal").count(), 1);
  assert.equal(await page.locator(".v5-context-modal").count(), 0);
  assert.equal(await page.locator(".v4-five-channel-modal .v4-context-navigation-controls").count(), 0);
  await page.locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: "Facebook", exact: true })
    .click();
  assert.equal(
    (await page.locator(".v4-context-preview").textContent()).includes("v5-only-contact"),
    false,
    "V5 content must not leak into V4",
  );

  await page.locator(".v4-five-channel-modal").getByRole("button", { name: "Close" }).click();
  await select("Version 5");
  await saturdayCard().click();
  assert.equal(
    await modal().locator(".channel-icon-switcher--modal-v5")
      .getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await modal().locator(".channel-icon-switcher--modal-v5")
    .getByRole("radio", { name: "Facebook", exact: true })
    .click();
  assert.equal(
    (await modal().locator(".v5-context-preview-surface").textContent()).includes("v5-only-contact"),
    false,
    "Switching versions resets V5 state",
  );

  await footer().getByRole("button", { name: "Show publishing options" }).click();
  await modal().getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await modal().getByRole("button", { name: "Close", exact: true }).click();
  const fridayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Friday, Nov 6", exact: true }) })
    .locator(".combined-target-card");
  assert.deepEqual(await fridayCard.locator(".calendar-channel-label").allTextContents(), ["fFacebook post"]);
  assert.equal((await saturdayCard().locator(".calendar-channel-label").count()), 4);

  await fridayCard.click();
  await footer().getByRole("button", { name: "Delete Post", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  assert.equal(await fridayCard.count(), 0);

  console.log("Verified V5 vertical modal, statuses, edits, GBP state, lifecycle, regrouping, isolation, and reset.");
} finally {
  await browser.close();
}
