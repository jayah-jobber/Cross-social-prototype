import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const jobberSources = [
  "/assets/jobber-google-channel-icon.svg",
  "/assets/jobber-facebook-channel-icon.svg",
  "/assets/jobber-instagram-channel-icon.svg",
];
const saturdayCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");
const v4Modal = () => page.locator(".v4-five-channel-modal");
const v5Modal = () => page.locator(".v5-context-modal");
const review = () => page.locator(".v4-channel-review");
const iconControls = () => page.getByRole("group", { name: "Social icon style" });

async function selectVersion(version) {
  await page.getByRole("button", { name: version, exact: true }).click();
}

async function resetTo(version) {
  const versionOne = page.getByRole("button", { name: "Version 1", exact: true });
  if (await versionOne.count()) await versionOne.click();
  await selectVersion(version);
}

async function openCampaign(version) {
  await resetTo(version);
  if (version === "Version 4") {
    await page.getByRole("button", { name: "Icon button", exact: true }).click();
  }
  await saturdayCard().click();
  if (version === "Version 4") {
    await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  }
  const modal = version === "Version 4" ? v4Modal() : v5Modal();
  await modal.waitFor();
  return modal;
}

async function imageSource(locator) {
  return locator.locator("img").evaluate((image) => new URL(image.src).pathname);
}

async function socialSwitcherSources(switcher) {
  return switcher.getByRole("radio").evaluateAll((options) => (
    options.slice(0, 3).map((option) => {
      const image = option.querySelector("img");
      return image ? new URL(image.src).pathname : null;
    })
  ));
}

async function buttonStyle(button) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderColor: style.borderTopColor,
      borderWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
      color: style.color,
    };
  });
}

async function assertActive(button) {
  await page.waitForTimeout(180);
  assert.deepEqual(await buttonStyle(button), {
    background: "rgb(244, 249, 242)",
    borderColor: "rgb(56, 133, 35)",
    borderWidth: "1px",
    boxShadow: "none",
    color: "rgb(56, 133, 35)",
  });
}

async function assertNeutral(button) {
  await page.waitForTimeout(180);
  const style = await buttonStyle(button);
  assert.equal(style.background, "rgb(255, 255, 255)");
  assert.equal(style.borderColor, "rgba(0, 0, 0, 0)");
  assert.equal(style.borderWidth, "1px");
}

async function assertIconFootprints(modal, switcherSelector) {
  const switcherFootprints = await modal.locator(switcherSelector)
    .locator(".channel-icon")
    .evaluateAll((icons) => icons.map((icon) => {
      const wrapperBox = icon.getBoundingClientRect();
      const artworkBox = icon.firstElementChild?.getBoundingClientRect();
      return {
        channel: icon.getAttribute("data-channel"),
        wrapper: [Math.round(wrapperBox.width), Math.round(wrapperBox.height)],
        artwork: [Math.round(artworkBox?.width ?? 0), Math.round(artworkBox?.height ?? 0)],
      };
    }));
  assert.ok(
    switcherFootprints.every(({ channel, wrapper, artwork }) => (
      wrapper[0] === 24
      && wrapper[1] === 24
      && artwork[0] === (channel === "google" ? 20 : 24)
      && artwork[1] === (channel === "google" ? 20 : 24)
    )),
    JSON.stringify(switcherFootprints),
  );

  const headerIcon = modal.locator(".v4-context-preview .channel-preview-title-icon");
  if (await headerIcon.count()) {
    const alignment = await modal.locator(".v4-context-preview > header").evaluate((header) => {
      const wrapper = header.querySelector(".channel-preview-title-icon");
      const artwork = wrapper?.firstElementChild;
      const title = header.querySelector("strong");
      const wrapperBox = wrapper?.getBoundingClientRect();
      const artworkBox = artwork?.getBoundingClientRect();
      const titleBox = title?.getBoundingClientRect();
      return {
        channel: wrapper?.getAttribute("data-channel"),
        wrapper: [Math.round(wrapperBox?.width ?? 0), Math.round(wrapperBox?.height ?? 0)],
        artwork: [Math.round(artworkBox?.width ?? 0), Math.round(artworkBox?.height ?? 0)],
        centerDelta: Math.abs(
          (artworkBox?.top ?? 0) + (artworkBox?.height ?? 0) / 2
          - ((titleBox?.top ?? 0) + (titleBox?.height ?? 0) / 2),
        ),
      };
    });
    assert.deepEqual(alignment.wrapper, [24, 24]);
    assert.deepEqual(
      alignment.artwork,
      alignment.channel === "google" ? [20, 20] : [24, 24],
    );
    assert.ok(alignment.centerDelta <= 1, JSON.stringify(alignment));
  }
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // V4 uses fixed monochrome Jobber icons with no prototype selector.
  let modal = await openCampaign("Version 4");
  let switcher = modal.locator(".channel-icon-switcher--modal-v4");
  assert.equal(await iconControls().count(), 0);
  assert.deepEqual(await socialSwitcherSources(switcher), jobberSources);
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[0],
  );
  await assertIconFootprints(modal, ".channel-icon-switcher--modal-v4");
  await assertActive(switcher.getByRole("radio", { name: "Google", exact: true }));
  await assertNeutral(switcher.getByRole("radio", { name: "Facebook", exact: true }));
  assert.notEqual(
    await switcher.getByRole("radio", { name: "Google", exact: true })
      .locator(".jobber-social-icon")
      .evaluate((icon) => getComputedStyle(icon).filter),
    "none",
  );
  await page.screenshot({ path: "/tmp/v4-icons-jobber-google-active.png" });

  for (const [index, channel] of ["Google", "Facebook", "Instagram"].entries()) {
    await switcher.getByRole("radio", { name: channel, exact: true }).click();
    assert.equal(
      await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
      jobberSources[index],
    );
    await assertIconFootprints(modal, ".channel-icon-switcher--modal-v4");
  }
  for (const channel of ["Email", "Website"]) {
    await switcher.getByRole("radio", { name: channel, exact: true }).click();
    await assertIconFootprints(modal, ".channel-icon-switcher--modal-v4");
  }

  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  let reviewSwitcher = review().locator(".channel-icon-switcher--review");
  assert.deepEqual(await socialSwitcherSources(reviewSwitcher), jobberSources);
  assert.equal(await iconControls().count(), 0);
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  modal = v4Modal();
  await modal.waitFor();
  switcher = modal.locator(".channel-icon-switcher--modal-v4");
  await switcher.getByRole("radio", { name: "Google", exact: true }).click();
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[0],
  );

  // Scheduling changes content status without adding completion styling to navigation.
  await modal.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true })
    .click();
  modal = v4Modal();
  await modal.waitFor();
  switcher = modal.locator(".channel-icon-switcher--modal-v4");
  await assertNeutral(switcher.getByRole("radio", { name: "Google", exact: true }));
  await assertActive(switcher.getByRole("radio", { name: "Facebook", exact: true }));
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[1],
  );
  await page.screenshot({ path: "/tmp/v4-icons-facebook-active-google-scheduled.png" });
  await switcher.getByRole("radio", { name: "Google", exact: true }).click();
  await assertActive(switcher.getByRole("radio", { name: "Google", exact: true }));

  // V4 review uses the same selection-only treatment.
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  assert.equal(await iconControls().count(), 0);
  reviewSwitcher = review().locator(".channel-icon-switcher--review");
  assert.deepEqual(await socialSwitcherSources(reviewSwitcher), jobberSources);
  await assertActive(reviewSwitcher.getByRole("radio", { name: "Google", exact: true }));
  await reviewSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await assertActive(reviewSwitcher.getByRole("radio", { name: "Facebook", exact: true }));
  await assertNeutral(reviewSwitcher.getByRole("radio", { name: "Google", exact: true }));

  // V5 uses the same Jobber icon switcher without lifecycle semantics.
  modal = await openCampaign("Version 5");
  switcher = modal.locator(".channel-icon-switcher--modal-v5");
  assert.equal(await iconControls().count(), 0);
  assert.deepEqual(await socialSwitcherSources(switcher), jobberSources);
  await assertActive(switcher.getByRole("radio", { name: "Google", exact: true }));
  await assertNeutral(switcher.getByRole("radio", { name: "Facebook", exact: true }));
  await modal.locator(".v5-context-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true })
    .click();
  modal = v5Modal();
  await modal.waitFor();
  switcher = modal.locator(".channel-icon-switcher--modal-v5");
  await assertNeutral(switcher.getByRole("radio", { name: "Google", exact: true }));
  await assertActive(switcher.getByRole("radio", { name: "Facebook", exact: true }));
  await switcher.getByRole("radio", { name: "Google", exact: true }).click();
  await assertActive(switcher.getByRole("radio", { name: "Google", exact: true }));
  await modal.locator(".v5-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  reviewSwitcher = review().locator(".channel-icon-switcher--review");
  assert.deepEqual(await socialSwitcherSources(reviewSwitcher), jobberSources);
  await assertActive(reviewSwitcher.getByRole("radio", { name: "Google", exact: true }));
  await reviewSwitcher.getByRole("radio", { name: "Facebook", exact: true }).click();
  await assertActive(reviewSwitcher.getByRole("radio", { name: "Facebook", exact: true }));
  await assertNeutral(reviewSwitcher.getByRole("radio", { name: "Google", exact: true }));
  assert.equal(await iconControls().count(), 0);

  console.log(
    "Verified V4/V5 Jobber icon switchers, normalized artwork, selected-only styling, and workflow.",
  );
} finally {
  await browser.close();
}
