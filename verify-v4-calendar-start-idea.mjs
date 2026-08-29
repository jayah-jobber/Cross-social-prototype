import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const addNew = () => page.locator(".calendar-toolbar")
  .getByRole("button", { name: "Add New", exact: true });
const multipleChannels = () => page.getByRole("menuitem", {
  name: "Create for Multiple Channels",
  exact: true,
});
const modal = () => page.locator(".v4-start-idea-modal");
const prompt = () => modal().getByLabel("Describe your marketing idea");
const generate = () => modal().getByRole("button", { name: "Generate Content", exact: true });

async function openModal() {
  await addNew().click();
  await multipleChannels().click();
  await modal().waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  await openModal();

  assert.equal(await modal().getAttribute("aria-modal"), "true");
  assert.equal(await prompt().evaluate((field) => document.activeElement === field), true);
  assert.equal(
    await prompt().getAttribute("placeholder"),
    "Describe your idea and we'll turn it into ready-to-send content for multiple channels",
  );
  assert.equal(await generate().isDisabled(), true);
  assert.deepEqual(
    await modal().getByRole("group", { name: "Channels" }).locator(":scope > span").allTextContents(),
    ["Google", "Facebook", "Instagram", "Email"],
  );
  assert.deepEqual(
    await modal().locator(".v4-start-idea-suggestions button").allTextContents(),
    [
      "15% promotion",
      "Win back old clients",
      "Fill next week’s open slots",
      "Ask happy customers for a review",
    ],
  );

  const geometry = await modal().evaluate((dialog) => {
    const style = getComputedStyle(dialog);
    const card = dialog.querySelector(".v4-start-idea-prompt-card");
    const cardStyle = card ? getComputedStyle(card) : null;
    const bounds = dialog.getBoundingClientRect();
    const cardBounds = card?.getBoundingClientRect();
    const heading = dialog.querySelector("h1");
    const headingStyle = heading ? getComputedStyle(heading) : null;
    const generateButton = dialog.querySelector(".v4-start-idea-generate");
    const generateStyle = generateButton ? getComputedStyle(generateButton) : null;
    const channelIcons = Array.from(
      dialog.querySelectorAll(".v4-start-idea-channels .channel-icon"),
    );
    const suggestionIcon = dialog.querySelector(".v4-start-idea-suggestions button img");
    return {
      width: bounds.width,
      height: bounds.height,
      border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
      radius: style.borderRadius,
      background: style.backgroundColor,
      shadow: style.boxShadow,
      cardWidth: cardBounds?.width,
      cardHeight: cardBounds?.height,
      cardBorder: cardStyle
        ? `${cardStyle.borderTopWidth} ${cardStyle.borderTopStyle} ${cardStyle.borderTopColor}`
        : "",
      cardRadius: cardStyle?.borderRadius,
      headingSize: headingStyle?.fontSize,
      headingWeight: headingStyle?.fontWeight,
      headingLineHeight: headingStyle?.lineHeight,
      buttonHeight: generateButton?.getBoundingClientRect().height,
      buttonRadius: generateStyle?.borderRadius,
      buttonSize: generateStyle?.fontSize,
      buttonWeight: generateStyle?.fontWeight,
      channelIconSizes: channelIcons.map((icon) => {
        const iconBounds = icon.getBoundingClientRect();
        return [iconBounds.width, iconBounds.height];
      }),
      suggestionIconSize: suggestionIcon
        ? [
            suggestionIcon.getBoundingClientRect().width,
            suggestionIcon.getBoundingClientRect().height,
          ]
        : [],
    };
  });
  assert.deepEqual(geometry, {
    width: 1000,
    height: 759,
    border: "1px solid rgb(218, 223, 226)",
    radius: "8px",
    background: "rgb(247, 245, 243)",
    shadow: "rgba(0, 0, 0, 0.05) 0px 4px 12px 0px, rgba(0, 0, 0, 0.1) 0px 1px 4px 0px",
    cardWidth: 872,
    cardHeight: 320,
    cardBorder: "1px solid rgb(218, 223, 226)",
    cardRadius: "16px",
    headingSize: "36px",
    headingWeight: "900",
    headingLineHeight: "39.96px",
    buttonHeight: 40,
    buttonRadius: "8px",
    buttonSize: "14px",
    buttonWeight: "700",
    channelIconSizes: [
      [16, 16],
      [16, 16],
      [16, 16],
      [16, 16],
    ],
    suggestionIconSize: [20, 20],
  });

  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await modal().getByRole("button", { name: "Close start with your own idea" })
      .evaluate((button) => document.activeElement === button),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(await prompt().evaluate((field) => document.activeElement === field), true);
  await page.keyboard.press("Escape");
  await modal().waitFor({ state: "detached" });
  await page.waitForFunction(() => (
    document.activeElement === document.querySelector(".calendar-toolbar button.add-new")
  ));
  assert.equal(await addNew().evaluate((button) => document.activeElement === button), true);

  await openModal();
  await modal().getByRole("button", { name: "15% promotion", exact: true }).click();
  assert.equal(
    await prompt().inputValue(),
    "Create a 15% Christmas promotion for winter landscaping services across Google, Facebook, Instagram, and Email.",
  );
  assert.equal(await generate().isEnabled(), true);
  await modal().getByRole("button", { name: "Close start with your own idea" }).click();
  await openModal();
  assert.equal(await prompt().inputValue(), "");

  await prompt().fill("   ");
  assert.equal(await generate().isDisabled(), true);
  await prompt().fill("First line");
  await prompt().press("Enter");
  await prompt().type("Second line");
  assert.equal(await prompt().inputValue(), "First line\nSecond line");

  await prompt().fill("  Build a spring clean-up campaign  ");
  await prompt().press("Meta+Enter");
  await modal().waitFor({ state: "detached" });
  const generatedFlow = page.locator(".v4-generated-flow-shell");
  await generatedFlow.waitFor();
  assert.equal(
    await generatedFlow.getByLabel("Edit marketing content prompt").inputValue(),
    "Build a spring clean-up campaign",
  );
  const generatedSummary = generatedFlow.locator(".v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8_000 });
  assert.equal(await generatedSummary.getByText("Website", { exact: true }).count(), 0);

  console.log(
    "Verified the V4 Calendar Start with your own idea modal layout, channels, suggestions, keyboard/focus behavior, local prompt isolation, and generated-idea submission lifecycle.",
  );
} finally {
  await browser.close();
}
