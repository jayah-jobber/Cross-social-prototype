import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const channels = ["Google", "Facebook", "Instagram", "Email", "Website"];

async function selectVersion(name) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function openSuggested(prompt, version) {
  await page.getByLabel("Add to your marketing calendar").fill(prompt);
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  if (version === "v4") {
    const summary = page.locator(".v4-summary-modal--generated");
    await summary.waitFor();
    await summary.getByRole("button", { name: "Review Drafts" }).click();
  } else {
    await page.locator(".suggested-vertical-dialog").waitFor();
  }
}

async function verifyCarousel(dialog, previewSurface) {
  for (const [index, channel] of channels.entries()) {
    await dialog.getByText(`${index + 1} of 5`, { exact: true }).waitFor();
    assert.ok((await dialog.textContent()).includes(channel));
    assert.equal(await dialog.locator(previewSurface).locator("> *").count(), 1);
    if (index < channels.length - 1) {
      await dialog.getByRole("button", { name: "Next channel" }).click();
    }
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  await selectVersion("Version 4");
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await openSuggested("V4 suggested layout prompt", "v4");
  const generatedReview = page.locator(".v4-generated-review");
  await generatedReview.waitFor();
  assert.equal(await page.locator(".v4-generated-flow-shell").count(), 0);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  await generatedReview.getByRole("heading", { name: "15% promotion", exact: true }).waitFor();
  assert.equal(await page.locator(".suggested-vertical-dialog").count(), 0);
  assert.equal(
    await generatedReview.getByRole("heading", { name: "REVIEW MULTIPLE CHANNELS", exact: true }).count(),
    0,
  );
  assert.equal(await generatedReview.locator(".channel-icon-switcher--modal-v4").count(), 1);
  assert.equal(await generatedReview.locator(".v4-context-body").count(), 1);
  for (const channel of channels.slice(0, 4)) {
    const channelButton = generatedReview.getByRole("radio", { name: channel, exact: true });
    await channelButton.click();
    assert.equal(await channelButton.getAttribute("aria-checked"), "true");
    assert.equal(await generatedReview.locator(".v4-context-preview-scroll > *").count(), 1);
  }
  await generatedReview.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await page.getByRole("heading", { name: "Review Email Campaign", exact: true }).waitFor();
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await generatedReview.getByRole("radio", { name: "Email", exact: true }).waitFor();
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave now" })
    .getByRole("button", { name: "Save drafts and Exit", exact: true }).click();

  await selectVersion("Version 5");
  await openSuggested("V5 suggested layout prompt", "v5");
  const vertical = page.locator(".suggested-vertical-dialog");
  await vertical.getByRole("heading", { name: "Start from your own idea", exact: true }).waitFor();
  assert.equal(await page.locator(".suggested-horizontal-dialog").count(), 0);
  assert.equal(await vertical.locator(".v5-preview-top-row").count(), 1);
  assert.equal(
    await vertical.getByRole("heading", { name: "Seasonal property cleanup in Hamilton", exact: true }).count(),
    1,
  );
  await verifyCarousel(vertical, ".v5-context-preview-surface");

  const geometry = await page.evaluate(() => {
    const dialog = document.querySelector(".suggested-vertical-dialog");
    const footer = dialog?.querySelector(".suggested-content-footer");
    const preview = dialog?.querySelector(".v5-context-preview-scroll");
    const dialogBox = dialog?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    return {
      dialogBottom: dialogBox?.bottom,
      footerBottom: footerBox?.bottom,
      bodyOverflow: getComputedStyle(document.body).overflow,
      previewOverflow: preview ? getComputedStyle(preview).overflowY : null,
    };
  });
  assert.equal(geometry.bodyOverflow, "hidden");
  assert.equal(geometry.previewOverflow, "auto");
  assert.ok(
    geometry.footerBottom !== undefined
      && geometry.dialogBottom !== undefined
      && geometry.footerBottom <= geometry.dialogBottom + 1,
  );

  for (let index = 0; index < 4; index += 1) {
    await vertical.getByRole("button", { name: "Previous channel" }).click();
  }
  await vertical.getByRole("button", { name: "Show publishing options" }).click();
  await vertical.getByRole("menuitem", { name: "Post now and view next", exact: true }).click();
  await vertical.getByText("2 of 5", { exact: true }).waitFor();
  for (let index = 0; index < 4; index += 1) {
    await vertical.getByRole("button", { name: "Schedule and view next", exact: true }).click();
  }
  await vertical.waitFor({ state: "detached" });
  assert.equal(await page.locator(".generated-suggestion-card").count(), 1);
  assert.equal(await page.locator(".generated-suggestion-card .calendar-channel-label").count(), 5);

  const saturdayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".combined-target-card");
  await saturdayCard.click();
  const saturdayVertical = page.locator(".v5-context-modal");
  await saturdayVertical.waitFor();
  assert.equal(Math.round((await saturdayVertical.boundingBox()).height), 852);

  console.log("Verified V4 horizontal and V5 vertical Suggested Content layouts.");
} finally {
  await browser.close();
}
