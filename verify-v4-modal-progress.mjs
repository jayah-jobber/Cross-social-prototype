import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const transition =
  "transform 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 460ms cubic-bezier(0.22, 1, 0.36, 1)";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const newPage = (reducedMotion = "no-preference") => browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion,
});
const modal = (page) => page.locator(".v4-five-channel-modal");
const textPanels = (page) => modal(page).locator(".v4-sliding-panel--text");
const cardPanels = (page) => modal(page).locator(".v4-sliding-panel--card");
const progress = (page) => modal(page).locator(".v4-delivery-progress");
const activeText = (page) => modal(page).locator(".v4-sliding-panel--text.is-active");
const originalCard = (page) => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");

async function openV4(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openOriginal(page) {
  await originalCard(page).click();
  await page.locator(".v4-summary-modal")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await modal(page).waitFor();
}

async function waitForPreview(scope) {
  const glimmer = scope.locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 8000 });
}

async function markStart(page) {
  await page.evaluate(() => {
    window.__v4DeliveryStartedAt = performance.now();
  });
}

async function waitUntilElapsed(page, milliseconds) {
  const elapsed = await page.evaluate(() => performance.now() - window.__v4DeliveryStartedAt);
  if (elapsed < milliseconds) await page.waitForTimeout(milliseconds - elapsed);
}

async function assertPanelState(panel, {
  active,
  transform,
  zIndex,
}) {
  const state = await panel.evaluate((node) => ({
    active: node.getAttribute("data-active"),
    ariaHidden: node.getAttribute("aria-hidden"),
    inert: node.hasAttribute("inert"),
    opacity: node.style.opacity,
    pointerEvents: node.style.pointerEvents,
    transform: node.style.transform,
    transition: node.style.transition,
    zIndex: node.style.zIndex,
  }));
  assert.equal(state.active, String(active));
  assert.equal(state.ariaHidden, active ? "false" : "true");
  assert.equal(state.inert, !active);
  assert.equal(state.opacity, active ? "1" : "0");
  assert.equal(state.pointerEvents, active ? "auto" : "none");
  assert.equal(state.transform, transform);
  assert.equal(state.transition, transition);
  assert.equal(state.zIndex, String(zIndex));
}

async function assertPanelSet(page, count) {
  assert.equal(await textPanels(page).count(), count);
  assert.equal(await cardPanels(page).count(), count);
  for (const panels of [textPanels(page), cardPanels(page)]) {
    const transitions = await panels.evaluateAll((nodes) => nodes.map((node) => node.style.transition));
    assert.deepEqual(transitions, Array(count).fill(transition));
  }
}

async function sampleSynchronizedMotion(page, outgoingIndex, incomingIndex) {
  await page.waitForTimeout(110);
  const sample = await modal(page).evaluate((dialog, { outgoingIndex, incomingIndex }) => {
    const read = (layer, index) => {
      const node = dialog.querySelector(`.v4-sliding-panel--${layer}[data-index="${index}"]`);
      const style = getComputedStyle(node);
      return {
        opacity: Number.parseFloat(style.opacity),
        x: new DOMMatrixReadOnly(style.transform).m41,
      };
    };
    return {
      outgoingText: read("text", outgoingIndex),
      outgoingCard: read("card", outgoingIndex),
      incomingText: read("text", incomingIndex),
      incomingCard: read("card", incomingIndex),
    };
  }, { outgoingIndex, incomingIndex });
  assert.ok(sample.outgoingText.opacity > 0 && sample.outgoingText.opacity < 1);
  assert.ok(sample.incomingText.opacity > 0 && sample.incomingText.opacity < 1);
  assert.ok(sample.outgoingText.opacity + sample.incomingText.opacity > 0.5);
  for (const direction of ["outgoing", "incoming"]) {
    assert.ok(
      Math.abs(sample[`${direction}Text`].x - sample[`${direction}Card`].x) < 0.6,
      `${direction} text/card transforms diverged`,
    );
    assert.ok(
      Math.abs(sample[`${direction}Text`].opacity - sample[`${direction}Card`].opacity) < 0.03,
      `${direction} text/card opacity diverged`,
    );
  }
}

const page = await newPage();

try {
  await openV4(page);
  await openOriginal(page);
  await assertPanelSet(page, 5);

  await assertPanelState(textPanels(page).nth(0), {
    active: true,
    transform: "translateX(0px)",
    zIndex: 5,
  });
  await assertPanelState(cardPanels(page).nth(0), {
    active: true,
    transform: "translateX(0px)",
    zIndex: 20,
  });
  await assertPanelState(textPanels(page).nth(1), {
    active: false,
    transform: "translateX(44px)",
    zIndex: 1,
  });
  await assertPanelState(cardPanels(page).nth(1), {
    active: false,
    transform: "translateX(44px)",
    zIndex: 10,
  });
  assert.equal(
    await modal(page).getByRole("heading", { name: "About this Facebook post" }).count(),
    0,
  );
  assert.equal(await textPanels(page).nth(1).getByRole("button").count(), 0);

  const fixedChrome = await modal(page).evaluate((dialog) => {
    const bounds = (selector) => {
      const box = dialog.querySelector(selector).getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    };
    return {
      header: bounds(".context-navigation-header"),
      tabs: bounds(".channel-icon-switcher"),
      progress: bounds(".v4-delivery-progress"),
    };
  });

  await modal(page).getByRole("radio", { name: "Facebook", exact: true }).click();
  await sampleSynchronizedMotion(page, 0, 1);
  await assertPanelState(textPanels(page).nth(0), {
    active: false,
    transform: "translateX(-44px)",
    zIndex: 1,
  });
  await assertPanelState(textPanels(page).nth(1), {
    active: true,
    transform: "translateX(0px)",
    zIndex: 5,
  });
  await page.waitForTimeout(400);

  await modal(page).getByRole("radio", { name: "Google", exact: true }).click();
  await sampleSynchronizedMotion(page, 1, 0);
  await page.waitForTimeout(400);
  await modal(page).getByRole("radio", { name: "Website", exact: true }).click();
  await assertPanelState(textPanels(page).nth(0), {
    active: false,
    transform: "translateX(-176px)",
    zIndex: 1,
  });
  await assertPanelState(textPanels(page).nth(4), {
    active: true,
    transform: "translateX(0px)",
    zIndex: 5,
  });
  await page.waitForTimeout(470);
  await modal(page).getByRole("radio", { name: "Website", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await modal(page).getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );

  const fixedChromeAfter = await modal(page).evaluate((dialog) => {
    const bounds = (selector) => {
      const box = dialog.querySelector(selector).getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    };
    return {
      header: bounds(".context-navigation-header"),
      tabs: bounds(".channel-icon-switcher"),
      progress: bounds(".v4-delivery-progress"),
    };
  });
  for (const key of Object.keys(fixedChrome)) {
    assert.ok(fixedChrome[key].every(
      (value, index) => Math.abs(value - fixedChromeAfter[key][index]) <= 0.5,
    ));
  }

  await page.waitForTimeout(470);
  await markStart(page);
  await activeText(page).getByRole("button", { name: "Schedule Google post", exact: true }).click();
  assert.equal((await progress(page).textContent()).trim(), "1/5 complete");
  const toast = page.locator(".v4-delivery-toast");
  await toast.waitFor();
  assert.equal(
    (await toast.locator("span").textContent()).trim(),
    "Your Google post has been successfully scheduled.",
  );
  await waitUntilElapsed(page, 1390);
  assert.equal(
    await modal(page).getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await textPanels(page).nth(0).evaluate((node) => node.style.transform), "translateX(0px)");
  await waitUntilElapsed(page, 1425);
  assert.equal(
    await modal(page).getByRole("radio", { name: "Facebook", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await sampleSynchronizedMotion(page, 0, 1);
  await waitUntilElapsed(page, 1960);
  await page.waitForFunction(() => (
    document.querySelector(".v4-delivery-toast")?.classList.contains("is-fading")
  ));
  assert.ok(
    await page.evaluate(() => performance.now() - window.__v4DeliveryStartedAt) < 2060,
    "Toast fade started too late",
  );
  assert.equal(
    await toast.evaluate((node) => getComputedStyle(node).transitionDuration),
    "0.24s",
  );
  await waitUntilElapsed(page, 2230);
  assert.equal(await toast.count(), 0);

  // Deleting during a hold removes both panels and cancels stale auto-advance.
  await page.waitForTimeout(250);
  await activeText(page).getByRole("button", { name: "Schedule Facebook post", exact: true }).click();
  await activeText(page).getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  await assertPanelSet(page, 4);
  assert.equal(await modal(page).getByRole("radio", { name: "Facebook" }).count(), 0);
  await page.waitForTimeout(1500);
  assert.equal(await modal(page).count(), 1);

  // Dashboard review mounts only the selected active channel subset.
  await openV4(page);
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await page.getByLabel("Describe your marketing idea").fill("Option C subset verification");
  await page.getByRole("button", { name: "Generate Content", exact: true }).click();
  const dashboardSummary = page.locator(".v4-dashboard-generated-summary");
  await dashboardSummary.waitFor({ timeout: 8000 });
  await dashboardSummary.getByRole("switch", { name: "Disable Instagram" }).click();
  await dashboardSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await modal(page).waitFor();
  await waitForPreview(modal(page));
  await assertPanelSet(page, 3);

  const reducedPage = await newPage("reduce");
  try {
    await openV4(reducedPage);
    await openOriginal(reducedPage);
    await assertPanelSet(reducedPage, 5);
    const reducedState = await textPanels(reducedPage).nth(1).evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        opacity: style.opacity,
        transform: style.transform,
        transition: style.transition,
        visibility: style.visibility,
      };
    });
    assert.deepEqual(reducedState, {
      opacity: "0",
      transform: "none",
      transition: "none",
      visibility: "hidden",
    });
    await markStart(reducedPage);
    await activeText(reducedPage)
      .getByRole("button", { name: "Schedule Google post", exact: true })
      .click();
    await waitUntilElapsed(reducedPage, 1390);
    assert.equal(
      await modal(reducedPage).getByRole("radio", { name: "Google", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await waitUntilElapsed(reducedPage, 1425);
    assert.equal(
      await modal(reducedPage).getByRole("radio", { name: "Facebook", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    assert.equal(
      await textPanels(reducedPage).nth(1).evaluate((node) => getComputedStyle(node).transform),
      "none",
    );
  } finally {
    await reducedPage.close();
  }

  console.log(
    "Verified V4 Option C two-layer declarative panels, exact 460ms motion, accessibility, fixed chrome, 1400ms hold, 2200ms toast, deletion safety, selected scope, and reduced motion.",
  );
} finally {
  await page.close();
  await browser.close();
}
