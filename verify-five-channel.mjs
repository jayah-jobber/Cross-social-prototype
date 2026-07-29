import { chromium } from "playwright";
import assert from "node:assert/strict";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const channels = [
  { id: "google", review: "Review Google Post", editor: "Edit Google Post" },
  { id: "facebook", review: "Review Facebook Post", editor: "Edit Facebook Post" },
  { id: "instagram", review: "Review Instagram Post", editor: "Edit Instagram Post" },
  { id: "email", review: "Review Email Campaign", editor: "Edit Email Campaign" },
  { id: "website", review: "Review Website Page", editor: "Edit Website Page" },
];

const suggestedFooterEdit = () => page.locator(".suggested-content-footer").getByRole("button", { name: "Edit" });
const contentEdit = () => page.locator(".review-field").first().getByRole("button", { name: "Edit" });
const reviewBack = () => page.locator(".review-footer").getByRole("button", { name: "Back" });

async function expectHeading(text) {
  await page.getByRole("heading", { name: text, exact: true }).waitFor();
}

async function assertSidebarFree() {
  assert.equal(
    await page.locator(".side-navigation,.compact-side-navigation,.top-bar").count(),
    0,
    "V4 review/edit flow should not render internal navigation",
  );
}

async function editFields(channel, marker) {
  if (channel === "google") {
    await page.locator("#v2-message-google").fill(marker);
    await page.getByLabel("Button URL").fill(`https://example.com/${marker}`);
  } else if (channel === "facebook" || channel === "instagram") {
    await page.locator("#v4-social-message").fill(marker);
  } else {
    await page.locator(`#suggested-${channel}-title`).fill(`${marker} title`);
    await page.locator(`#suggested-${channel}-body`).fill(`${marker} body`);
  }
}

async function verifyChannel(channel, index) {
  await suggestedFooterEdit().click();
  await expectHeading(channel.review);
  assert.equal(await page.getByRole("heading", { name: channel.editor, exact: true }).count(), 0);
  await assertSidebarFree();

  const scheduleEdit = page.locator(".review-field").nth(1).getByRole("button", { name: "Edit" });
  assert.equal(await scheduleEdit.getAttribute("aria-disabled"), "true");
  await scheduleEdit.dispatchEvent("click");
  await expectHeading(channel.review);

  await reviewBack().click();
  await expectHeading("Suggested Marketing Content");
  assert.equal(await page.getByLabel("Edit marketing content prompt").inputValue(), "Five channel QA prompt");
  await page.getByText(`${index + 1} of 5`, { exact: true }).waitFor();

  await suggestedFooterEdit().click();
  await contentEdit().click();
  await expectHeading(channel.editor);
  await assertSidebarFree();

  const cancelMarker = `${channel.id}-cancelled`;
  await editFields(channel.id, cancelMarker);
  await page.locator(".editor-footer").getByRole("button", { name: "Cancel" }).click();
  await expectHeading(channel.review);
  assert.equal((await page.locator(".review-field").first().textContent()).includes(cancelMarker), false);

  await contentEdit().click();
  const saveMarker = `${channel.id}-saved`;
  await editFields(channel.id, saveMarker);
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading(channel.review);

  if (channel.id === "facebook" || channel.id === "instagram") {
    await page.getByRole("dialog", { name: "Apply changes to other channels?" }).waitFor();
    await page.keyboard.press("Escape");
  }

  await expectHeading(channel.review);
  assert.ok((await page.locator(".review-field").first().textContent()).includes(saveMarker));
  if (channel.id === "google") {
    assert.ok((await page.locator(".v4-facebook-preview").textContent()).includes(`https://example.com/${saveMarker}`));
  }

  await reviewBack().click();
  await expectHeading("Suggested Marketing Content");
  assert.ok((await page.locator(".suggested-preview-section").textContent()).includes(saveMarker));

  if (index < channels.length - 1) {
    await page.getByRole("button", { name: "Next channel" }).click();
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const versionFourButton = page.getByRole("button", { name: "Version 4" });
  if (await versionFourButton.count()) await versionFourButton.click();
  await page.getByLabel("Add to your marketing calendar").fill("Five channel QA prompt");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await expectHeading("Suggested Marketing Content");

  for (const [index, channel] of channels.entries()) {
    await verifyChannel(channel, index);
  }

  await page.getByLabel("Close suggested marketing content").click();
  await page.locator(".combined-target-card").click();
  await page.getByRole("button", { name: "Next channel" }).click();
  await page.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Facebook Post");
  await reviewBack().click();
  await page.getByRole("dialog").waitFor();
  await page.getByText("2 of 5", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.locator(".target-card:not(.combined-target-card)").click();
  await page.locator(".calendar-modal-actions").getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Social Posts");
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await expectHeading("Marketing Plan");

  console.log("Verified five Suggested review-before-edit flows plus Saturday and Friday origins.");
} finally {
  await browser.close();
}
