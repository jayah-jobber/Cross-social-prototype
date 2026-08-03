import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const editor = () => page.locator(".version-two-editor");
const buttonSection = () => editor().locator(".v4-google-button");
const preview = () => page.locator(".dedicated-channel-preview");
const buttonText = () => buttonSection().getByRole("button", { name: /^Button text,/ });
const linkDestination = () => buttonSection().getByRole("button", { name: /^Link destination,/ });
const buttonUrl = () => buttonSection().getByLabel("Button URL");
const saveEdit = () => page.locator(".editor-footer").getByRole("button", { name: "Save Edit" });
const cancelEdit = () => page.locator(".editor-footer").getByRole("button", { name: "Cancel" });

async function expectGoogleEditor() {
  await page.getByRole("heading", { name: "Edit Google Post", exact: true }).waitFor();
  assert.equal(await page.locator('[id*="cta-google"], [id*="hashtags-google"]').count(), 0);
  assert.equal(await buttonSection().count(), 1);
}

async function openSuggestedGoogleEditor() {
  await page.getByLabel("Add to your marketing calendar").fill("Google button QA");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await page.getByRole("heading", { name: "Suggested Marketing Content", exact: true }).waitFor();
  await page.locator(".suggested-content-footer").getByRole("button", { name: "Edit" }).click();
  await page.getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  await expectGoogleEditor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4" }).click();
  await openSuggestedGoogleEditor();

  // Figma default state and exact menu contents/order.
  assert.equal(await buttonText().getAttribute("aria-expanded"), "false");
  assert.equal(await buttonUrl().inputValue(), "http://yourwebsite.com");
  assert.match(await linkDestination().getAttribute("aria-label"), /External link$/);
  await buttonText().focus();
  await page.keyboard.press("ArrowDown");
  const menu = buttonSection().getByRole("menu", { name: "Button text options" });
  assert.deepEqual(
    await menu.getByRole("menuitemradio").allTextContents(),
    ["Learn more", "Book", "Call now"],
  );
  assert.equal(await menu.getByRole("menuitemradio").first().evaluate((item) => item === document.activeElement), true);
  await page.keyboard.press("ArrowDown");
  assert.equal(await menu.getByRole("menuitemradio", { name: "Book" }).evaluate((item) => item === document.activeElement), true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.count(), 0);
  assert.equal(await buttonText().evaluate((item) => item === document.activeElement), true);

  await buttonText().click();
  await page.getByRole("heading", { name: "Edit Google Post" }).click();
  assert.equal(await menu.count(), 0, "Outside click should close the Text menu");

  // Link menu has the exact selectable order, a non-selectable group label, and keyboard behavior.
  await linkDestination().focus();
  await page.keyboard.press("ArrowDown");
  const linkMenu = buttonSection().getByRole("menu", { name: "Link destination options" });
  assert.deepEqual(
    await linkMenu.getByRole("menuitemradio").allTextContents(),
    ["External link", "Online booking page", "Untitled Form (Default)", "My other form"],
  );
  await linkMenu.getByText("Request Forms", { exact: true }).waitFor();
  assert.equal(await linkMenu.getByRole("menuitem", { name: "Request Forms" }).count(), 0);
  assert.equal(await linkMenu.getByRole("menuitemradio", { name: "External link" }).getAttribute("aria-checked"), "true");
  assert.equal(await linkMenu.getByRole("menuitemradio", { name: "External link" }).locator("svg").count(), 1);
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await linkMenu.getByRole("menuitemradio", { name: "Online booking page" })
      .evaluate((item) => item === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await linkMenu.count(), 0);
  assert.equal(await linkDestination().evaluate((item) => item === document.activeElement), true);

  // Every internal destination hides external controls; returning restores the typed URL.
  await buttonUrl().fill("https://example.com/preserved");
  for (const option of ["Online booking page", "Untitled Form (Default)", "My other form"]) {
    await linkDestination().click();
    await linkMenu.getByRole("menuitemradio", { name: option }).click();
    assert.equal(await buttonUrl().count(), 0);
    assert.equal(
      await buttonSection().getByText(/Make sure your link doesn’t lead/).count(),
      0,
    );
  }
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "External link" }).click();
  assert.equal(await buttonUrl().inputValue(), "https://example.com/preserved");

  // Book preserves destination and URL while updating the live preview label.
  await buttonText().click();
  await menu.getByRole("menuitemradio", { name: "Book" }).click();
  assert.equal(await buttonUrl().inputValue(), "https://example.com/preserved");
  await preview().getByRole("link", { name: "Book", exact: true }).waitFor();

  // Call now hides all destination controls and shows exact two-line helper copy.
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "Online booking page" }).click();
  await buttonText().click();
  await menu.getByRole("menuitemradio", { name: "Call now" }).click();
  assert.equal(await linkDestination().count(), 0);
  assert.equal(await buttonSection().getByLabel("Button URL").count(), 0);
  assert.equal(
    (await buttonSection().locator(".v4-google-phone-helper").innerText()).trim(),
    "Customer will call the phone number registered with your Google Business Profile (778-8888-8888)\nContact info can be modified in Google setting.",
  );
  await preview().getByRole("button", { name: "Call now", exact: true }).waitFor();
  await buttonText().click();
  await menu.getByRole("menuitemradio", { name: "Book" }).click();
  assert.match(await linkDestination().getAttribute("aria-label"), /Online booking page$/);
  assert.equal(await buttonUrl().count(), 0);
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "External link" }).click();
  assert.equal(await buttonUrl().inputValue(), "https://example.com/preserved");

  // Button switch removes and restores configuration and preview CTA.
  await buttonSection().getByRole("switch", { name: "Button" }).click();
  assert.equal(await buttonText().count(), 0);
  assert.equal(await preview().getByRole("link", { name: "Book", exact: true }).count(), 0);
  await buttonSection().getByRole("switch", { name: "Button" }).click();
  assert.equal(await buttonUrl().inputValue(), "https://example.com/preserved");
  await preview().getByRole("link", { name: "Book", exact: true }).waitFor();

  // Cancel discards destination and URL changes.
  await buttonUrl().fill("https://example.com/cancelled");
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "Online booking page" }).click();
  await cancelEdit().click();
  await page.getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  await expectGoogleEditor();
  assert.equal(await buttonText().textContent(), "TextLearn more");
  assert.equal(await buttonUrl().inputValue(), "http://yourwebsite.com");
  assert.match(await linkDestination().getAttribute("aria-label"), /External link$/);

  // Save commits an internal destination plus its retained URL to all V4 origins.
  await buttonText().click();
  await menu.getByRole("menuitemradio", { name: "Book" }).click();
  await buttonUrl().fill("https://example.com/book");
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "Untitled Form (Default)" }).click();
  await saveEdit().click();
  await page.getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  await page.locator(".v4-facebook-preview").getByRole("button", { name: "Book", exact: true }).waitFor();
  assert.ok(!(await page.locator(".v4-facebook-preview").textContent()).includes("https://example.com/book"));
  await page.locator(".review-footer").getByRole("button", { name: "Back" }).click();
  await page.getByRole("heading", { name: "Suggested Marketing Content", exact: true }).waitFor();
  await page.locator(".suggested-preview-section").getByRole("button", { name: "Book", exact: true }).waitFor();

  // The committed draft also reaches Saturday contextual and Friday preview/editor origins.
  await page.getByLabel("Close suggested marketing content").click();
  await page.locator(".combined-target-card").click();
  await page.locator(".v4-context-preview").getByRole("button", { name: "Book", exact: true }).waitFor();
  assert.ok(!(await page.locator(".v4-context-preview").textContent()).includes("https://example.com/book"));
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.locator(".target-card:not(.combined-target-card)").click();
  await page.locator(".calendar-modal-preview").getByRole("button", { name: "Book", exact: true }).waitFor();
  await page.locator(".calendar-modal-actions").getByRole("button", { name: "Edit" }).click();
  await page.locator(".review-carousel-preview").getByRole("button", { name: "Book", exact: true }).waitFor();
  await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
  await expectGoogleEditor();
  assert.equal(await buttonText().textContent(), "TextBook");
  assert.match(await linkDestination().getAttribute("aria-label"), /Untitled Form \(Default\)$/);
  assert.equal(await buttonUrl().count(), 0);
  await linkDestination().click();
  await linkMenu.getByRole("menuitemradio", { name: "External link" }).click();
  assert.equal(await buttonUrl().inputValue(), "https://example.com/book");

  // Versions 1–3 retain their existing editors and do not receive the V4 control.
  for (const version of ["Version 1", "Version 2", "Version 3"]) {
    await page.getByRole("button", { name: version, exact: true }).click();
    await page.locator(".target-card:not(.combined-target-card)").click();
    await page.locator(".calendar-modal-actions").getByRole("button", { name: "Edit" }).click();
    await page.locator(".review-field").first().getByRole("button", { name: "Edit" }).click();
    if (version === "Version 1") {
      await page.getByRole("heading", { name: "Edit Social Posts", exact: true }).waitFor();
      assert.equal(await page.locator(".v4-google-button").count(), 0);
    } else {
      await page.getByRole("tab", { name: "Google", exact: true }).click();
      await page.locator(".v2-google-button:not(.v4-google-button)").waitFor();
      assert.equal(await page.locator(".v4-google-button").count(), 0);
      assert.equal(
        await page.locator(".v2-google-button:not(.v4-google-button) .select-row").first().textContent(),
        "TextLearn more",
      );
    }
  }

  console.log("Verified V4 GBP button design, accessibility, transactional state, and preview coverage.");
} finally {
  await browser.close();
}
