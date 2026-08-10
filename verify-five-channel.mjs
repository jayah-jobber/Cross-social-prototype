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
const generatedStepper = () => generatedReview().locator(".channel-progress-stepper--modal-v4");
const suggestedFooterEdit = () => generatedReview()
  .locator(".v4-context-footer")
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
    await page.locator("#v4-social-cta").fill(`${marker}-cta-line-1\n${marker}-cta-line-2`);
    await page.locator("#v4-social-hashtags").fill(`#${marker}-hashtag`);
  } else {
    await page.locator(`#suggested-${channel}-title`).fill(`${marker} title`);
    await page.locator(`#suggested-${channel}-body`).fill(`${marker} body`);
  }
}

async function assertInsetField(fieldSelector, labelText) {
  const field = page.locator(fieldSelector);
  const wrapper = field.locator("..");
  const label = wrapper.locator("label");

  assert.equal(await wrapper.evaluate((element) => element.classList.contains("v4-inset-field")), true);
  assert.equal((await label.textContent())?.trim(), labelText);
  assert.equal(await label.getAttribute("for"), fieldSelector.slice(1));
  assert.deepEqual(
    await label.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.fontSize, style.fontWeight];
    }),
    ["12px", "400"],
  );
  assert.equal(await field.evaluate((element) => getComputedStyle(element).fontSize), "14px");
  assert.equal(
    await wrapper.evaluate((element) => getComputedStyle(element).borderTopWidth),
    "1px",
  );

  await field.focus();
  assert.notEqual(
    await wrapper.evaluate((element) => getComputedStyle(element).boxShadow),
    "none",
  );
  assert.equal(await field.evaluate((element) => getComputedStyle(element).boxShadow), "none");
}

async function assertInitialSocialFields(channel) {
  const body = await page.locator("#v4-social-message").inputValue();
  const cta = await page.locator("#v4-social-cta").inputValue();
  const hashtags = await page.locator("#v4-social-hashtags").inputValue();

  assert.equal(body.includes("416-624-3188"), false);
  assert.equal(body.includes("mycompany@gmail.com"), false);
  assert.equal(body.includes("#HamiltonLandscaping"), false);
  assert.equal(cta, "");
  assert.equal(
    hashtags,
    "#ChristmasSpecial #WinterLandscaping #LandscapeMaintenance #HolidaySavings",
  );

  const editorFieldIds = await page.locator(
    ".v4-social-editor .field-block textarea, .v4-social-editor .field-block input",
  ).evaluateAll((fields) => fields.slice(0, 3).map((field) => field.id));
  assert.deepEqual(editorFieldIds, [
    "v4-social-message",
    "v4-social-cta",
    "v4-social-hashtags",
  ]);
  assert.equal(
    await page.locator(".v4-social-editor > label").count(),
    0,
    "V4 Contact info and Hashtag labels must remain inside their bordered fields",
  );
  await assertInsetField("#v4-social-cta", "Contact info");
  await assertInsetField("#v4-social-hashtags", "Hashtag");

  const previewCopy = page.locator(
    channel === "facebook" ? ".channel-post-copy" : ".instagram-post-copy",
  );
  const previewText = await previewCopy.textContent();
  if (cta) {
    assert.ok(previewText.indexOf(body) < previewText.indexOf(cta));
    assert.ok(previewText.indexOf(cta) < previewText.indexOf(hashtags));
  } else {
    assert.ok(previewText.indexOf(body) < previewText.indexOf(hashtags));
  }

  if (channel === "instagram") {
    assert.deepEqual(
      await page.locator(".instagram-post-card").evaluate((card) => {
        const copy = card.querySelector(".instagram-post-copy");
        const image = card.querySelector(".instagram-post-image");
        const controls = card.querySelector(".instagram-controls");
        return [
          Boolean(image && copy && (image.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING)),
          Boolean(controls && copy && (controls.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING)),
        ];
      }),
      [true, true],
      "V4 Instagram image and actions should render before its copy",
    );
  }
}

async function verifyChannel(channel, index) {
  const channelButton = generatedStepper().getByRole("button", {
    name: new RegExp(`^${channel.id[0].toUpperCase() + channel.id.slice(1)},`),
  });
  await channelButton.click();
  if (channel.id === "instagram") {
    assert.equal(
      (await generatedReview().locator(".v4-context-preview").textContent()).includes("facebook-saved"),
      false,
      "Suggested Facebook edits must not change the Instagram draft",
    );
  }

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
  assert.equal(await channelButton.getAttribute("aria-current"), "step");

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
  await expectHeading("Suggested Marketing Content");
  assert.ok((await generatedReview().locator(".v4-context-preview").textContent()).includes(saveMarker));

  if (channel.id === "instagram") {
    await generatedStepper().getByRole("button", { name: /^Facebook,/ }).click();
    const facebookPreview = await generatedReview().locator(".v4-context-preview").textContent();
    assert.ok(facebookPreview.includes("facebook-saved"));
    assert.equal(
      facebookPreview.includes("instagram-saved"),
      false,
      "Suggested Instagram edits must not change the Facebook draft",
    );
    await generatedStepper().getByRole("button", { name: /^Instagram,/ }).click();
  }

  if (index < generatedChannels.length - 1) {
    const next = generatedChannels[index + 1];
    await generatedStepper().getByRole("button", {
      name: new RegExp(`^${next.id[0].toUpperCase() + next.id.slice(1)},`),
    }).click();
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const versionFourButton = page.getByRole("button", { name: "Version 4" });
  if (await versionFourButton.count()) await versionFourButton.click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();
  await page.getByLabel("Add to your marketing calendar").fill("Five channel QA prompt");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  await expectHeading("Suggested Marketing Content");

  for (const [index, channel] of generatedChannels.entries()) {
    await verifyChannel(channel, index);
  }

  await page.getByLabel("Close suggested marketing content").click();
  await page.locator(".combined-target-card").click();
  await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  const modalStepper = page.locator(".channel-progress-stepper--modal-v4");
  await modalStepper.getByRole("button", { name: /^Facebook,/ }).click();
  await page.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Facebook Post");
  await contentEdit().click();
  await page.locator("#v4-social-message").fill("saturday-facebook-saved");
  await page.locator("#v4-social-cta").fill("saturday-facebook-cta");
  await page.locator("#v4-social-hashtags").fill("#saturday-facebook-hashtag");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading("Review Facebook Post");
  assert.equal(
    await page.getByRole("dialog", { name: "Apply changes to other channels?" }).count(),
    0,
  );
  await reviewBack().click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await modalStepper.getByRole("button", { name: /^Facebook,/ }).getAttribute("aria-current"),
    "step",
  );
  assert.equal(await page.locator(".v4-context-navigation-controls").count(), 0);
  await modalStepper.getByRole("button", { name: /^Instagram,/ }).click();
  assert.equal(
    (await page.locator(".v4-context-preview").textContent()).includes("saturday-facebook-saved"),
    false,
    "Saturday Facebook edits must not change the Instagram draft",
  );
  await page.locator(".v4-context-footer").getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Instagram Post");
  await contentEdit().click();
  await page.locator("#v4-social-message").fill("saturday-instagram-saved");
  await page.locator("#v4-social-cta").fill("saturday-instagram-cta");
  await page.locator("#v4-social-hashtags").fill("#saturday-instagram-hashtag");
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading("Review Instagram Post");
  assert.equal(
    await page.getByRole("dialog", { name: "Apply changes to other channels?" }).count(),
    0,
  );
  await reviewBack().click();
  await modalStepper.getByRole("button", { name: /^Facebook,/ }).click();
  const saturdayFacebookPreview = await page.locator(".v4-context-preview").textContent();
  assert.ok(saturdayFacebookPreview.includes("saturday-facebook-saved"));
  assert.equal(
    saturdayFacebookPreview.includes("saturday-instagram-saved"),
    false,
    "Saturday Instagram edits must not change the Facebook draft",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.locator(".target-card:not(.combined-target-card)").click();
  await page.locator(".calendar-modal-actions").getByRole("button", { name: "Edit" }).click();
  await expectHeading("Review Social Posts");
  await contentEdit().click();
  await page.getByRole("heading", { name: "Edit Google Post" }).waitFor();
  assert.equal(
    await page.locator("[id^='v4-cta-'], [id^='v4-hashtags-']").count(),
    0,
    "V4 Friday Google editor must not show social CTA or Hashtag fields",
  );
  assert.equal(
    await page.getByRole("tab", { name: "Your posts" }).count(),
    0,
    "V4 Friday editor must not expose an all-channel edit tab",
  );
  await page.getByRole("tab", { name: "Facebook" }).click();
  await assertInsetField("#v4-cta-facebook", "Contact info");
  await assertInsetField("#v4-hashtags-facebook", "Hashtag");
  await page.locator("#v2-message-facebook").fill("friday-facebook-saved");
  await page.locator("#v4-cta-facebook").fill("friday-facebook-cta");
  await page.locator("#v4-hashtags-facebook").fill("#friday-facebook-hashtag");
  await page.getByRole("tab", { name: "Instagram" }).click();
  await page.locator("#v2-message-instagram").fill("friday-instagram-unsaved");
  await page.locator("#v4-cta-instagram").fill("friday-instagram-unsaved-cta");
  await page.locator("#v4-hashtags-instagram").fill("#friday-instagram-unsaved");
  await page.getByRole("tab", { name: "Facebook" }).click();
  await page.locator(".editor-footer").getByRole("button", { name: "Save Edit" }).click();
  await expectHeading("Review Social Posts");
  await contentEdit().click();
  await page.getByRole("tab", { name: "Instagram" }).click();
  assert.equal(
    (await page.locator("#v2-message-instagram").inputValue()).includes("friday-facebook-saved"),
    false,
    "Friday Facebook edits must not change the Instagram draft",
  );
  assert.equal(
    (await page.locator("#v2-message-instagram").inputValue()).includes("friday-instagram-unsaved"),
    false,
    "Friday save must commit only the active channel",
  );
  assert.equal(await page.locator("#v4-cta-instagram").inputValue(), "saturday-instagram-cta");
  assert.equal(
    await page.locator("#v4-hashtags-instagram").inputValue(),
    "#saturday-instagram-hashtag",
  );
  await page.getByRole("tab", { name: "Facebook" }).click();
  assert.equal(await page.locator("#v2-message-facebook").inputValue(), "friday-facebook-saved");
  await page.locator("#v2-message-facebook").fill("friday-facebook-cancelled");
  await page.locator("#v4-cta-facebook").fill("friday-facebook-cancelled-cta");
  await page.locator("#v4-hashtags-facebook").fill("#friday-facebook-cancelled");
  await page.locator(".editor-footer").getByRole("button", { name: "Cancel" }).click();
  await expectHeading("Review Social Posts");
  await contentEdit().click();
  await page.getByRole("tab", { name: "Facebook" }).click();
  assert.equal(await page.locator("#v2-message-facebook").inputValue(), "friday-facebook-saved");
  assert.equal(
    await page.locator("#v4-cta-facebook").inputValue(),
    "friday-facebook-cta",
  );
  assert.equal(
    await page.locator("#v4-hashtags-facebook").inputValue(),
    "#friday-facebook-hashtag",
  );
  await page.locator(".editor-footer").getByRole("button", { name: "Cancel" }).click();
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await expectHeading("Marketing Plan");

  console.log("Verified V4 channel-isolated saves across Suggested, Saturday, and Friday origins.");
} finally {
  await browser.close();
}
