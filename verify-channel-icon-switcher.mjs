import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const channelOrder = ["Google", "Facebook", "Instagram", "Email", "Website"];
const saturdayCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");
const context = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const review = () => page.locator(".v4-channel-review");

async function waitForContextChannel(channel) {
  await page.waitForFunction(
    (expected) => (
      document.querySelector(
        ".v4-five-channel-modal:not(.v4-generated-review) .v4-context-body",
      )?.getAttribute("data-channel") === expected
    ),
    channel.toLowerCase(),
  );
}

async function openV4Context() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await saturdayCard().click();
  await page.locator(".v4-summary-modal")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await context().waitFor();
}

async function assertSwitcher(scope, selector, expectedChannels = channelOrder) {
  const switcher = scope.locator(selector);
  assert.equal(await switcher.getAttribute("role"), "radiogroup");
  assert.equal(await switcher.getAttribute("aria-label"), "Channel view");
  const options = switcher.getByRole("radio");
  assert.deepEqual(await options.evaluateAll((items) => (
    items.map((item) => item.getAttribute("aria-label"))
  )), expectedChannels);
  assert.ok(await options.evaluateAll((items) => items.every((item) => (
    item.getAttribute("aria-label") && !item.getAttribute("aria-label").includes(",")
  ))));

  const geometry = await switcher.evaluate((control) => {
    const controlBox = control.getBoundingClientRect();
    const optionBoxes = Array.from(control.querySelectorAll("[role='radio']"))
      .map((option) => option.getBoundingClientRect());
    const style = getComputedStyle(control);
    return {
      width: controlBox.width,
      height: controlBox.height,
      borderWidth: style.borderTopWidth,
      borderRadius: style.borderRadius,
      optionWidths: optionBoxes.map((box) => box.width),
      optionHeights: optionBoxes.map((box) => box.height),
    };
  });
  assert.ok(Math.abs(geometry.width - expectedChannels.length * 79.6) <= 1, JSON.stringify(geometry));
  assert.equal(Math.round(geometry.height), 40);
  assert.equal(geometry.borderWidth, "1px");
  assert.equal(geometry.borderRadius, "8px");
  assert.ok(
    Math.max(...geometry.optionWidths) - Math.min(...geometry.optionWidths) <= 0.5,
    JSON.stringify(geometry),
  );
  assert.ok(geometry.optionHeights.every((height) => Math.round(height) === 38));
  assert.equal(await switcher.locator(".completed, [aria-current='step']").count(), 0);
  return switcher;
}

async function optionStyle(option) {
  return option.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      background: style.backgroundColor,
      border: style.borderTopColor,
      color: style.color,
    };
  });
}

async function assertLeftAligned(scope, {
  switcherSelector,
  contentSelector,
  closeInset,
}) {
  await page.waitForTimeout(320);
  const geometry = await scope.evaluate((surface, selectors) => {
    const surfaceBox = surface.getBoundingClientRect();
    const switcherBox = surface.querySelector(selectors.switcherSelector)?.getBoundingClientRect();
    const contentBox = surface.querySelector(selectors.contentSelector)?.getBoundingClientRect();
    const closeBox = surface.querySelector(".context-navigation-close")?.getBoundingClientRect();
    return {
      leftDelta: Math.abs((switcherBox?.left ?? 0) - (contentBox?.left ?? 0)),
      centerDelta: Math.abs(
        (switcherBox?.left ?? 0) + (switcherBox?.width ?? 0) / 2
          - (surfaceBox.left + surfaceBox.width / 2),
      ),
      closeRightDelta: closeBox
        ? Math.abs(closeBox.right - (surfaceBox.right - selectors.closeInset))
        : null,
    };
  }, { switcherSelector, contentSelector, closeInset });
  assert.ok(geometry.leftDelta <= 1, JSON.stringify(geometry));
  assert.ok(geometry.centerDelta >= 40, JSON.stringify(geometry));
  if (geometry.closeRightDelta !== null) {
    assert.ok(geometry.closeRightDelta <= 1, JSON.stringify(geometry));
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: "Icon button", exact: true }).count(),
    1,
  );
  assert.equal(await page.getByText("Progress button", { exact: true }).count(), 0);

  await openV4Context();
  let switcher = await assertSwitcher(context(), ".channel-icon-switcher--modal-v4");
  assert.equal(
    (await context().locator(".v4-delivery-progress").textContent()).trim(),
    "0/5 scheduled",
  );
  await assertLeftAligned(context(), {
    switcherSelector: ".channel-icon-switcher--modal-v4",
    contentSelector: ".v4-context-details",
    closeInset: 32,
  });
  let google = switcher.getByRole("radio", { name: "Google", exact: true });
  let facebook = switcher.getByRole("radio", { name: "Facebook", exact: true });
  assert.equal(await google.getAttribute("aria-checked"), "true");
  assert.deepEqual(await optionStyle(google), {
    background: "rgb(244, 249, 242)",
    border: "rgb(56, 133, 35)",
    color: "rgb(56, 133, 35)",
  });
  assert.deepEqual(await optionStyle(facebook), {
    background: "rgb(255, 255, 255)",
    border: "rgba(0, 0, 0, 0)",
    color: "rgb(35, 61, 72)",
  });

  await google.focus();
  await google.press("ArrowRight");
  await waitForContextChannel("Facebook");
  assert.equal(await facebook.getAttribute("aria-checked"), "true");
  assert.equal(await facebook.evaluate((node) => document.activeElement === node), true);
  await facebook.press("End");
  await waitForContextChannel("Website");
  assert.equal(
    await switcher.getByRole("radio", { name: "Website", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await switcher.getByRole("radio", { name: "Website", exact: true }).press("Home");
  await waitForContextChannel("Google");
  assert.equal(await google.getAttribute("aria-checked"), "true");

  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  await context().getByRole("heading", { name: "About this Facebook post", exact: true }).waitFor();
  switcher = context().locator(".channel-icon-switcher--modal-v4");
  google = switcher.getByRole("radio", { name: "Google", exact: true });
  facebook = switcher.getByRole("radio", { name: "Facebook", exact: true });
  assert.equal(await google.getAttribute("aria-checked"), "false");
  assert.notEqual((await optionStyle(google)).border, "rgb(56, 133, 35)");
  assert.equal(await facebook.getAttribute("aria-checked"), "true");
  assert.equal(
    (await context().locator(".v4-delivery-progress").textContent()).trim(),
    "1/5 scheduled",
  );

  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await review().waitFor();
  const reviewSwitcher = await assertSwitcher(review(), ".channel-icon-switcher--review");
  const reviewProgress = review().locator(".v4-delivery-progress");
  assert.equal((await reviewProgress.textContent()).trim(), "1/5 scheduled");
  assert.equal(await reviewProgress.getAttribute("data-delivered"), "1");
  assert.equal(await reviewProgress.getAttribute("data-active"), "5");
  await assertLeftAligned(review(), {
    switcherSelector: ".channel-icon-switcher--review",
    contentSelector: ".review-scroll h1",
    closeInset: 0,
  });
  await reviewSwitcher.getByRole("radio", { name: "Email", exact: true }).click();
  assert.equal(
    await reviewSwitcher.getByRole("radio", { name: "Email", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await context().waitFor();

  switcher = context().locator(".channel-icon-switcher--modal-v4");
  await switcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  await assertSwitcher(
    context(),
    ".channel-icon-switcher--modal-v4",
    ["Google", "Instagram", "Email", "Website"],
  );

  await context().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await saturdayCard().click();
  const v5 = page.locator(".v5-context-modal");
  await v5.waitFor();
  await assertSwitcher(v5, ".channel-icon-switcher--modal-v5");
  await assertLeftAligned(v5, {
    switcherSelector: ".channel-icon-switcher--modal-v5",
    contentSelector: ".v5-context-campaign-intro h1",
    closeInset: 32,
  });
  assert.equal(
    await v5.locator(".v5-context-header").getByText("Review multiple channels", { exact: true }).count(),
    0,
  );
  await v5.locator(".v5-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  await assertLeftAligned(review(), {
    switcherSelector: ".channel-icon-switcher--review",
    contentSelector: ".review-scroll h1",
    closeInset: 0,
  });

  assert.equal(await page.locator(".channel-progress-stepper").count(), 0);
  console.log(
    "Verified V4/V5 icon switcher geometry, semantics, styling, keyboard/click selection, canonical order, lifecycle-neutral state, and deletion.",
  );
} finally {
  await browser.close();
}
