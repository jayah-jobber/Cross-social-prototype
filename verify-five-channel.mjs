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
const generatedChannels = channels.filter(({ id }) => id !== "website");

const generatedReview = () => page.locator(".v4-generated-review");
const generatedSwitcher = () => generatedReview().locator(".channel-icon-switcher--modal-v4");
const activePreview = (scope = page) => scope.locator(
  ".v4-sliding-panel--card.is-active .v4-context-preview",
);
const suggestedFooterEdit = () => generatedReview()
  .locator(".v4-sliding-panel--text.is-active .v4-context-footer")
  .getByRole("button", { name: "Edit" });
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
    const buttonUrl = page.getByLabel("Button URL");
    if (await buttonUrl.count()) await buttonUrl.fill(`https://example.com/${marker}`);
  } else if (channel === "facebook" || channel === "instagram") {
    await page.locator("#v4-social-message").fill(`${marker}-body`);
  } else {
    await page.locator(`#suggested-${channel}-title`).fill(`${marker} title`);
    await page.locator(`#suggested-${channel}-body`).fill(`${marker} body`);
  }
}

async function assertInitialSocialFields(channel) {
  const body = await page.locator("#v4-social-message").inputValue();
  assert.ok(body.includes("#ChristmasSpecial"));
  assert.equal(await page.locator("#v4-social-cta, #v4-social-hashtags").count(), 0);

  const editorFieldIds = await page.locator(
    ".v4-social-editor .field-block textarea, .v4-social-editor .field-block input",
  ).evaluateAll((fields) => fields.map((field) => field.id));
  assert.deepEqual(editorFieldIds, ["v4-social-message"]);
  assert.equal(
    await page.locator(".v4-social-editor > label").count(),
    0,
    "The V4 flattened social editor must not render detached labels",
  );

  const previewCopy = page.locator(
    channel === "facebook" ? ".channel-post-copy" : ".instagram-post-copy",
  );
  const previewText = await previewCopy.textContent();
  assert.ok(previewText.includes(body));

}

async function verifyChannel(channel, index) {
  const channelButton = generatedSwitcher().getByRole("radio", {
    name: channel.id[0].toUpperCase() + channel.id.slice(1),
    exact: true,
  });
  await channelButton.click();
  if (channel.id === "instagram") {
    assert.equal(
      (await activePreview(generatedReview()).textContent()).includes("facebook-saved"),
      false,
      "Suggested Facebook edits must not change the Instagram draft",
    );
  }

  await suggestedFooterEdit().click();
  await expectHeading(channel.review);
  assert.equal(await page.getByRole("heading", { name: channel.editor, exact: true }).count(), 0);
  await assertSidebarFree();

  const scheduleEdit = page.locator(".review-field").nth(1).getByRole("button", { name: "Edit" });
  assert.equal(await scheduleEdit.getAttribute("aria-disabled"), null);

  await reviewBack().click();
  await generatedReview().locator("#v4-context-title").waitFor();
  assert.equal(await generatedReview().locator("#v4-context-title").textContent(), "15% promotion");
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  assert.equal(await channelButton.getAttribute("aria-checked"), "true");

  await suggestedFooterEdit().click();
  await contentEdit().click();
  await expectHeading(channel.editor);
  await assertSidebarFree();
  if (channel.id === "facebook" || channel.id === "instagram") {
    await assertInitialSocialFields(channel.id);
  } else {
    assert.equal(
      await page.locator(
        "#v4-social-cta, #v4-social-hashtags, [id^='v4-cta-'], [id^='v4-hashtags-']",
      ).count(),
      0,
      `V4 ${channel.id} editor must not show social CTA or Hashtag fields`,
    );
  }

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
    assert.equal(
      await page.getByRole("dialog", { name: "Apply changes to other channels?" }).count(),
      0,
      "V4 social save must not render a propagation dialog",
    );
  }

  await expectHeading(channel.review);
  assert.ok((await page.locator(".review-field").first().textContent()).includes(saveMarker));
  if (channel.id === "google") {
    const preview = page.locator(".v4-facebook-preview");
    const learnMoreLink = preview.getByRole("link", { name: "Learn More" });
    if (await learnMoreLink.count()) {
      assert.equal(await learnMoreLink.getAttribute("href"), `https://example.com/${saveMarker}`);
      assert.equal((await preview.textContent()).includes(`https://example.com/${saveMarker}`), false);
    }
  }

  await reviewBack().click();
  await generatedReview().locator("#v4-context-title").waitFor();
  assert.equal(await generatedReview().locator("#v4-context-title").textContent(), "15% promotion");
  assert.ok((await activePreview(generatedReview()).textContent()).includes(saveMarker));

  if (channel.id === "instagram") {
    await generatedSwitcher().getByRole("radio", { name: "Facebook", exact: true }).click();
    const facebookPreview = await activePreview(generatedReview()).textContent();
    assert.ok(facebookPreview.includes("facebook-saved"));
    assert.equal(
      facebookPreview.includes("instagram-saved"),
      false,
      "Suggested Instagram edits must not change the Facebook draft",
    );
    await generatedSwitcher().getByRole("radio", { name: "Instagram", exact: true }).click();
  }

  if (index < generatedChannels.length - 1) {
    const next = generatedChannels[index + 1];
    await generatedSwitcher().getByRole("radio", {
      name: next.id[0].toUpperCase() + next.id.slice(1),
      exact: true,
    }).click();
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const versionFourButton = page.getByRole("button", { name: "Version 4" });
  if (await versionFourButton.count()) await versionFourButton.click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await page.getByLabel("Add to your marketing calendar").fill("Five channel QA prompt");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await generatedReview().waitFor();
  await expectHeading("15% promotion");
  assert.equal(await page.locator(".v4-generated-flow-shell").count(), 0);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);

  for (const [index, channel] of generatedChannels.entries()) {
    await verifyChannel(channel, index);
  }

  await generatedReview().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave now" })
    .getByRole("button", { name: "Save drafts and Exit", exact: true }).click();
  await page.locator(".combined-target-card").click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  const modalSwitcher = page.locator(".channel-icon-switcher--modal-v4");
  await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await page.locator(".v4-sliding-panel--text.is-active .v4-context-footer")
    .getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Facebook Post");
  await contentEdit().click();
  await page.locator("#v4-social-message").fill("saturday-facebook-saved");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading("Review Facebook Post");
  assert.equal(
    await page.getByRole("dialog", { name: "Apply changes to other channels?" }).count(),
    0,
  );
  await reviewBack().click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await page.locator(".v4-context-navigation-controls").count(), 0);
  await modalSwitcher.getByRole("radio", { name: "Instagram", exact: true }).click();
  assert.equal(
    (await activePreview().textContent()).includes("saturday-facebook-saved"),
    false,
    "Saturday Facebook edits must not change the Instagram draft",
  );
  await page.locator(".v4-sliding-panel--text.is-active .v4-context-footer")
    .getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Instagram Post");
  await contentEdit().click();
  await page.locator("#v4-social-message").fill("saturday-instagram-saved");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading("Review Instagram Post");
  assert.equal(
    await page.getByRole("dialog", { name: "Apply changes to other channels?" }).count(),
    0,
  );
  await reviewBack().click();
  await modalSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  const saturdayFacebookPreview = await activePreview().textContent();
  assert.ok(saturdayFacebookPreview.includes("saturday-facebook-saved"));
  assert.equal(
    saturdayFacebookPreview.includes("saturday-instagram-saved"),
    false,
    "Saturday Instagram edits must not change the Facebook draft",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();

  console.log("Verified V4 channel-isolated saves across Suggested and Saturday origins.");
} finally {
  await browser.close();
}
