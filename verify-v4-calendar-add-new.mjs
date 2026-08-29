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
const menu = () => page.getByRole("menu", { name: "Add new marketing content" });
const item = (name) => menu().getByRole("menuitem", { name, exact: true });
const entryControl = () => page.getByRole("group", { name: "Version 4 entry surface" });
const originalCard = () => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
}).locator(".combined-target-card");
const labels = [
  "Email campaign",
  "Website page",
  "Google post",
  "Facebook post",
  "Instagram post",
  "Create for Multiple Channels",
];

async function selectVersion(name) {
  await page.getByRole("button", { name, exact: true }).click();
  if (name === "Version 4") {
    await page.getByRole("button", { name: "Icon button", exact: true }).click();
  }
}

async function openMenu() {
  await addNew().click();
  await menu().waitFor();
  assert.equal(await addNew().getAttribute("aria-expanded"), "true");
}

async function snapshotCalendar() {
  return {
    cards: await page.locator(".v4-campaign-calendar-card").evaluateAll((cards) => (
      cards.map((card) => ({
        state: card.getAttribute("data-card-state"),
        label: card.getAttribute("aria-label"),
        channels: Array.from(card.querySelectorAll(".v4-calendar-channel-icon"))
          .map((icon) => icon.getAttribute("data-channel")),
      }))
    )),
    promptCount: await page.getByLabel("Add to your marketing calendar").count(),
    createNewCount: await page.locator(".marketing-page-header .create-new").count(),
    tasks: await page.locator(".v4-pending-task-card").count(),
    overlays: await page.locator(".calendar-modal-overlay").count(),
    heading: await page.getByRole("heading", { name: "Marketing Plan", exact: true }).count(),
  };
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  for (const version of ["Version 1", "Version 2", "Version 3", "Version 5"]) {
    await selectVersion(version);
    const legacyAddNew = page.locator(".calendar-toolbar .add-new");
    assert.equal(await legacyAddNew.evaluate((element) => element.tagName), "SPAN");
    assert.equal(await legacyAddNew.getAttribute("aria-haspopup"), null);
    await legacyAddNew.click();
    assert.equal(await menu().count(), 0);
  }

  await selectVersion("Version 4");
  assert.equal(await addNew().evaluate((element) => element.tagName), "BUTTON");
  assert.equal(await addNew().getAttribute("aria-haspopup"), "menu");
  assert.equal(await addNew().getAttribute("aria-expanded"), "false");
  assert.equal(await addNew().getAttribute("aria-controls"), "v4-calendar-add-new-menu");
  assert.equal(await page.getByLabel("Add to your marketing calendar").count(), 0);
  assert.equal(await page.locator(".marketing-page-header .create-new").count(), 0);

  const initialCalendar = await snapshotCalendar();
  await openMenu();

  assert.deepEqual(await menu().getByRole("menuitem").allTextContents(), labels);
  assert.deepEqual(
    await menu().evaluate((surface) => (
      Array.from(surface.children).flatMap((wrapper) => (
        Array.from(wrapper.children).map((child) => (
          child.getAttribute("role") === "separator"
            ? "divider"
            : child.textContent?.trim()
        ))
      ))
    )),
    [
      "Email campaign",
      "Website page",
      "Google post",
      "Facebook post",
      "Instagram post",
      "divider",
      "Create for Multiple Channels",
    ],
  );

  assert.equal(await item("Email campaign").locator("svg.lucide-mail").count(), 1);
  assert.equal(
    new URL(await item("Website page").locator("img").getAttribute("src"), baseUrl).pathname,
    "/assets/website-channel-icon.svg",
  );
  for (const channel of ["google", "facebook", "instagram"]) {
    assert.equal(
      new URL(
        await menu().locator(`[data-menu-action="${channel}"] img`).getAttribute("src"),
        baseUrl,
      ).pathname,
      `/assets/jobber-${channel}-channel-icon.svg`,
    );
  }
  assert.equal(
    await item("Create for Multiple Channels").locator("svg.lucide-sparkles").count(),
    1,
  );
  assert.ok(await menu().locator(".v4-add-new-menu-icon").evaluateAll((icons) => (
    icons.every((icon) => {
      const bounds = icon.getBoundingClientRect();
      return bounds.width === 24 && bounds.height === 24;
    })
  )));

  const geometry = await menu().evaluate((surface) => {
    const trigger = document.querySelector(".calendar-toolbar button.add-new");
    const frame = document.querySelector(".prototype-frame");
    const calendar = document.querySelector(".marketing-calendar");
    const menuBounds = surface.getBoundingClientRect();
    const triggerBounds = trigger?.getBoundingClientRect();
    const frameBounds = frame?.getBoundingClientRect();
    const calendarBounds = calendar?.getBoundingClientRect();
    const style = getComputedStyle(surface);
    const defaultRow = getComputedStyle(surface.querySelector('[data-menu-action="website"]'));
    const finalRow = surface.querySelector('[data-menu-action="multiple"]');
    const finalLabel = finalRow?.lastElementChild?.getBoundingClientRect();
    return {
      width: menuBounds.width,
      topGap: menuBounds.top - (triggerBounds?.bottom ?? 0),
      rightDelta: Math.abs(menuBounds.right - (triggerBounds?.right ?? 0)),
      insideFrame: menuBounds.left >= (frameBounds?.left ?? 0)
        && menuBounds.right <= (frameBounds?.right ?? 0)
        && menuBounds.bottom <= (frameBounds?.bottom ?? 0),
      insideCalendar: menuBounds.left >= (calendarBounds?.left ?? 0)
        && menuBounds.right <= (calendarBounds?.right ?? 0)
        && menuBounds.bottom <= (calendarBounds?.bottom ?? 0),
      border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
      radius: style.borderRadius,
      padding: style.padding,
      background: style.backgroundColor,
      shadow: style.boxShadow,
      zIndex: Number(style.zIndex),
      rowGap: defaultRow.gap,
      rowBackground: defaultRow.backgroundColor,
      rowRadius: defaultRow.borderRadius,
      finalHeight: finalRow?.getBoundingClientRect().height ?? 0,
      finalLabelHeight: finalLabel?.height ?? 0,
    };
  });
  assert.equal(geometry.width, 200);
  assert.equal(geometry.topGap, 8);
  assert.ok(geometry.rightDelta <= 1);
  assert.equal(geometry.insideFrame, true);
  assert.equal(geometry.insideCalendar, true);
  assert.equal(geometry.border, "1px solid rgb(218, 223, 226)");
  assert.equal(geometry.radius, "8px");
  assert.equal(geometry.padding, "8px");
  assert.equal(geometry.background, "rgb(255, 255, 255)");
  assert.equal(
    geometry.shadow,
    "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px, rgba(0, 0, 0, 0.05) 0px 4px 6px 0px",
  );
  assert.equal(geometry.zIndex, 18);
  assert.equal(geometry.rowGap, "12px");
  assert.equal(geometry.rowBackground, "rgb(255, 255, 255)");
  assert.equal(geometry.rowRadius, "8px");
  assert.ok(geometry.finalHeight >= 50);
  assert.ok(geometry.finalLabelHeight >= 34);
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
  assert.equal(
    await item("Email campaign").evaluate((row) => getComputedStyle(row).backgroundColor),
    "rgb(241, 245, 246)",
  );
  await menu().screenshot({ path: "/tmp/v4-calendar-add-new-menu.png" });

  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Email campaign",
  );
  await page.keyboard.press("ArrowUp");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Create for Multiple Channels",
  );
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Email campaign",
  );
  await page.keyboard.press("End");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Create for Multiple Channels",
  );
  await page.keyboard.press("Home");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Email campaign",
  );
  await page.keyboard.press("Escape");
  await menu().waitFor({ state: "detached" });
  assert.equal(await addNew().getAttribute("aria-expanded"), "false");
  assert.equal(await addNew().evaluate((button) => document.activeElement === button), true);

  await openMenu();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await menu().waitFor({ state: "detached" });
  const startIdea = page.getByRole("dialog", { name: "Start with your own idea" });
  await startIdea.waitFor();
  await startIdea.getByRole("button", { name: "Close start with your own idea" }).click();
  assert.deepEqual(await snapshotCalendar(), initialCalendar);

  await openMenu();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await menu().waitFor({ state: "detached" });
  assert.deepEqual(await snapshotCalendar(), initialCalendar);

  await openMenu();
  await page.keyboard.press("Tab");
  await menu().waitFor({ state: "detached" });
  assert.equal(await addNew().getAttribute("aria-expanded"), "false");

  await openMenu();
  await page.getByRole("heading", { name: "Marketing Plan", exact: true }).click();
  await menu().waitFor({ state: "detached" });

  await openMenu();
  await addNew().click();
  await menu().waitFor({ state: "detached" });
  assert.equal(await addNew().getAttribute("aria-expanded"), "false");

  for (const label of labels.slice(0, -1)) {
    await openMenu();
    await item(label).click();
    await menu().waitFor({ state: "detached" });
    assert.deepEqual(await snapshotCalendar(), initialCalendar);
  }

  await openMenu();
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  assert.equal(await menu().count(), 0);
  await selectVersion("Version 4");
  const resetCalendar = await snapshotCalendar();

  await openMenu();
  await entryControl().getByRole("button", { name: "Dashboard", exact: true }).click();
  assert.equal(await menu().count(), 0);
  await entryControl().getByRole("button", { name: "Calendar", exact: true }).click();
  await addNew().waitFor();

  await openMenu();
  await originalCard().click();
  await page.locator(".v4-summary-modal--calendar").waitFor();
  assert.equal(await menu().count(), 0);
  const overlayZIndex = await page.locator(".calendar-modal-overlay")
    .evaluate((overlay) => Number(getComputedStyle(overlay).zIndex));
  assert.ok(overlayZIndex > geometry.zIndex);
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Close summary" })
    .click();

  assert.equal(await page.getByRole("button", { name: /3 pending tasks/ }).count(), 1);
  assert.equal(await page.locator(".v4-pending-task-card.v4-add-new-menu-item").count(), 0);
  assert.deepEqual(await snapshotCalendar(), resetCalendar);

  console.log(
    "Verified the V4-only Add New menu, removed legacy creation controls, Figma geometry, accessibility, keyboard behavior, dismissal paths, modal layering, and version/surface isolation.",
  );
} finally {
  await browser.close();
}
