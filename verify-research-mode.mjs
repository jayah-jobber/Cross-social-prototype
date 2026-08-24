import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const loadingAssets = [
  "v4-loading-marketing-plan.svg",
  "v4-loading-jobber-data.svg",
  "v4-loading-audience.svg",
  "v4-loading-channel-visibility.svg",
  "v4-loading-finishing-touches.svg",
  "v4-loading-jobber-mark.svg",
];
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}.`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function withViteServer(script, env, callback) {
  const port = await availablePort();
  const child = spawn(
    "npm",
    ["run", script, "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: projectRoot,
      env,
      detached: true,
      stdio: "ignore",
    },
  );
  const url = `http://127.0.0.1:${port}`;

  try {
    await waitForServer(url);
    await callback(url);
  } finally {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // The process may have already exited after a failed assertion.
      }
    }
  }
}

function assertLoadingAssetsEmitted() {
  for (const asset of loadingAssets) {
    assert.ok(
      existsSync(join(projectRoot, "dist", "assets", asset)),
      `Missing emitted loading asset: /assets/${asset}`,
    );
  }
}

async function assertResearchChromeAbsent(page) {
  for (const selector of [
    ".ab-toolbar",
    ".version-switcher",
    ".v4-experiment-controls",
    ".v4-entry-surface-switcher",
    ".v4-navigation-style-switcher",
    ".prototype-status-controls",
  ]) {
    assert.equal(await page.locator(selector).count(), 0, `${selector} must be absent`);
  }
  assert.equal(await page.getByText("Version 1", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Version 5", { exact: true }).count(), 0);
}

async function assertFrameUsesToolbarSpace(page) {
  const geometry = await page.locator(".prototype-page").evaluate((prototypePage) => {
    const pageBox = prototypePage.getBoundingClientRect();
    const frameBox = prototypePage.querySelector(".prototype-frame")?.getBoundingClientRect();
    return {
      topDelta: Math.round((frameBox?.top ?? 0) - pageBox.top),
      heightDelta: Math.round(pageBox.height - (frameBox?.height ?? 0)),
    };
  });
  assert.deepEqual(geometry, { topDelta: 0, heightDelta: 0 });
}

async function verifyCalendar(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".calendar-page").waitFor();
  assert.equal(await page.locator(".v4-dashboard-page").count(), 0);
  assert.equal(
    await page.getByRole("heading", { name: "Marketing Plan", exact: true }).count(),
    1,
  );
  await assertResearchChromeAbsent(page);
  await assertFrameUsesToolbarSpace(page);

  const saturdayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".combined-target-card");
  await saturdayCard.click();
  await page.locator(".v4-summary-modal").getByRole("button", {
    name: "Review Drafts",
    exact: true,
  }).click();
  const flow = page.locator(".v4-five-channel-modal");
  await flow.locator(".v4-arrow-navigator").waitFor();
  await assertResearchChromeAbsent(page);
  assert.equal(await flow.locator(".channel-icon-switcher").count(), 0);
  await flow.getByRole("button", { name: "Next channel", exact: true }).click();
  await flow.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  const review = page.locator(".v4-channel-review");
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  const scheduleField = review.locator(".review-field").filter({ hasText: "Schedule Post" });
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  assert.equal(
    await review.locator(".v4-arrow-navigator").getByText("2 of 5", { exact: true }).count(),
    1,
  );
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
}

async function verifyDashboard(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".v4-dashboard-page").waitFor();
  assert.equal(await page.locator(".calendar-page").count(), 0);
  assert.equal(
    await page.getByRole("tab", { name: "Start with your own idea", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await assertResearchChromeAbsent(page);
  await assertFrameUsesToolbarSpace(page);

  await page.getByLabel("Describe your marketing idea").fill("Research dashboard check");
  await page.getByRole("button", { name: "Generate Content", exact: true }).click();
  const summary = page.locator(".v4-summary-modal--generated");
  await summary.waitFor({ timeout: 8_000 });
  await summary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const flow = page.locator(".v4-generated-review");
  await flow.locator(".v4-arrow-navigator").waitFor();
  await assertResearchChromeAbsent(page);
  assert.equal(await flow.locator(".channel-icon-switcher").count(), 0);
  await flow.getByRole("button", { name: "Next channel", exact: true }).click();
  await flow.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  const review = page.locator(".v4-channel-review");
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  const scheduleField = review.locator(".review-field").filter({ hasText: "Schedule Post" });
  await scheduleField.getByRole("button", { name: "Edit", exact: true }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Schedule Date" });
  await scheduleDialog.getByLabel("Schedule date for Facebook").fill("2026-11-08");
  await scheduleDialog.getByRole("button", { name: "Save Edits", exact: true }).click();
  await review.getByRole("heading", { name: "Review Facebook Post", exact: true }).waitFor();
  assert.equal(
    await review.locator(".v4-arrow-navigator").getByText("2 of 4", { exact: true }).count(),
    1,
  );
  assert.equal(await page.getByText("Your post is rescheduled", { exact: true }).count(), 0);
}

async function verifyDevelopmentControls(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".ab-toolbar").count(), 1);
  assert.equal(await page.getByLabel("Prototype version").count(), 1);
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(await page.getByRole("group", { name: "Version 4 entry surface" }).count(), 1);
  const navigation = page.getByRole("group", { name: "Version 4 navigation style" });
  assert.equal(await navigation.count(), 1);
  assert.equal(
    await navigation.getByRole("button", { name: "Icon button", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await navigation.getByRole("button", { name: "Arrow button", exact: true }).click();
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(
    await navigation.getByRole("button", { name: "Icon button", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
}

async function verifyIconResearchNavigation(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  const saturdayCard = page.locator(".calendar-day")
    .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
    .locator(".combined-target-card");
  await saturdayCard.click();
  await page.locator(".v4-summary-modal").getByRole("button", {
    name: "Review Drafts",
    exact: true,
  }).click();
  const flow = page.locator(".v4-five-channel-modal");
  await flow.getByRole("radiogroup", { name: "Channel view" }).waitFor();
  assert.equal(await flow.locator(".channel-icon-switcher").count(), 1);
  assert.equal(await flow.locator(".v4-arrow-navigator").count(), 0);
}

const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

try {
  await run("npm", ["run", "build:research:calendar"]);
  assertLoadingAssetsEmitted();
  await withViteServer("preview", process.env, (url) => verifyCalendar(page, url));

  await run("npm", ["run", "build:research:dashboard"]);
  assertLoadingAssetsEmitted();
  await withViteServer("preview", process.env, (url) => verifyDashboard(page, url));

  for (const navigationStyle of ["icons", "progress"]) {
    const iconResearchEnv = {
      ...process.env,
      VITE_PROTOTYPE_VERSION: "version_4",
      VITE_RESEARCH_MODE: "true",
      VITE_ENTRY_SURFACE: "calendar",
      VITE_NAVIGATION_STYLE: navigationStyle,
    };
    await run("npm", ["run", "build"], { env: iconResearchEnv });
    await withViteServer("preview", iconResearchEnv, (url) => verifyIconResearchNavigation(page, url));
  }

  const developmentEnv = { ...process.env };
  delete developmentEnv.VITE_PROTOTYPE_VERSION;
  delete developmentEnv.VITE_RESEARCH_MODE;
  delete developmentEnv.VITE_ENTRY_SURFACE;
  delete developmentEnv.VITE_NAVIGATION_STYLE;
  await withViteServer("dev", developmentEnv, (url) => verifyDevelopmentControls(page, url));

  console.log(
    "Verified research Arrow builds, icon and legacy progress compatibility, absent controls, and development icon defaults.",
  );
} finally {
  await browser.close();
}
