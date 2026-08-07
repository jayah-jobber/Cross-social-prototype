import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const brandSources = [
  "/assets/google-channel-icon.svg",
  "/assets/facebook-channel-icon.png",
  "/assets/instagram-channel-icon.png",
];
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

async function socialStepperSources(stepper) {
  return stepper.getByRole("button").evaluateAll((buttons) => (
    buttons.slice(0, 3).map((button) => {
      const image = button.querySelector("img");
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

async function assertActive(button, borderColor = "rgb(3, 43, 58)") {
  await page.waitForTimeout(180);
  assert.deepEqual(await buttonStyle(button), {
    background: "rgb(3, 43, 58)",
    borderColor,
    borderWidth: "2px",
    boxShadow: "none",
    color: "rgb(255, 255, 255)",
  });
}

async function assertNeutral(button) {
  await page.waitForTimeout(180);
  const style = await buttonStyle(button);
  assert.equal(style.background, "rgb(255, 255, 255)");
  assert.equal(style.borderColor, "rgb(207, 216, 219)");
  assert.equal(style.borderWidth, "2px");
}

async function assertCompleted(button) {
  await page.waitForTimeout(180);
  const style = await buttonStyle(button);
  assert.equal(style.background, "rgb(255, 255, 255)");
  assert.equal(style.borderColor, "rgb(56, 133, 35)");
  assert.equal(style.borderWidth, "2px");
  assert.equal(style.boxShadow, "rgba(3, 43, 58, 0.06) 0px 1px 2px 0px");
}

async function assertIconFootprints(modal, stepperSelector) {
  const stepperFootprints = await modal.locator(stepperSelector)
    .locator(".channel-progress-icon")
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
    stepperFootprints.every(({ channel, wrapper, artwork }) => (
      wrapper[0] === 24
      && wrapper[1] === 24
      && artwork[0] === (channel === "google" ? 20 : 24)
      && artwork[1] === (channel === "google" ? 20 : 24)
    )),
    JSON.stringify(stepperFootprints),
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
  let stepper = modal.locator(".channel-progress-stepper--modal-v4");
  assert.equal(await iconControls().count(), 0);
  assert.deepEqual(await socialStepperSources(stepper), jobberSources);
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[0],
  );
  await assertIconFootprints(modal, ".channel-progress-stepper--modal-v4");
  await assertActive(stepper.getByRole("button", { name: "Google, unscheduled" }));
  await assertNeutral(stepper.getByRole("button", { name: "Facebook, unscheduled" }));
  assert.notEqual(
    await stepper.getByRole("button", { name: "Google, unscheduled" })
      .locator(".jobber-social-icon")
      .evaluate((icon) => getComputedStyle(icon).filter),
    "none",
  );
  await page.screenshot({ path: "/tmp/v4-icons-jobber-google-active.png" });

  for (const [index, channel] of ["Google", "Facebook", "Instagram"].entries()) {
    await stepper.getByRole("button", { name: new RegExp(`^${channel},`) }).click();
    assert.equal(
      await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
      jobberSources[index],
    );
    await assertIconFootprints(modal, ".channel-progress-stepper--modal-v4");
  }
  for (const channel of ["Email", "Website"]) {
    await stepper.getByRole("button", { name: new RegExp(`^${channel},`) }).click();
    await assertIconFootprints(modal, ".channel-progress-stepper--modal-v4");
  }

  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  let reviewStepper = review().locator(".channel-progress-stepper--review");
  assert.deepEqual(await socialStepperSources(reviewStepper), jobberSources);
  assert.equal(await iconControls().count(), 0);
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  modal = v4Modal();
  await modal.waitFor();
  stepper = modal.locator(".channel-progress-stepper--modal-v4");
  await stepper.getByRole("button", { name: /^Google,/ }).click();
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[0],
  );

  // Scheduling Google yields the exact Google-complete/Facebook-active state.
  await modal.locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true })
    .click();
  modal = v4Modal();
  await modal.waitFor();
  stepper = modal.locator(".channel-progress-stepper--modal-v4");
  await assertCompleted(stepper.getByRole("button", { name: "Google, scheduled" }));
  await assertActive(stepper.getByRole("button", { name: "Facebook, unscheduled" }));
  assert.equal(
    await imageSource(modal.locator(".v4-context-preview .channel-preview-title-icon")),
    jobberSources[1],
  );
  await page.screenshot({ path: "/tmp/v4-icons-facebook-active-google-scheduled.png" });
  await stepper.getByRole("button", { name: "Google, scheduled" }).click();
  await assertActive(
    stepper.getByRole("button", { name: "Google, scheduled" }),
    "rgb(56, 133, 35)",
  );

  // V4 review inherits shared state visuals but never exposes the modal-only control.
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  assert.equal(await iconControls().count(), 0);
  reviewStepper = review().locator(".channel-progress-stepper--review");
  assert.deepEqual(await socialStepperSources(reviewStepper), jobberSources);
  await assertActive(
    reviewStepper.getByRole("button", { name: "Google, scheduled" }),
    "rgb(56, 133, 35)",
  );
  await reviewStepper.getByRole("button", { name: "Facebook, unscheduled" }).click();
  await assertActive(reviewStepper.getByRole("button", { name: "Facebook, unscheduled" }));
  await assertCompleted(reviewStepper.getByRole("button", { name: "Google, scheduled" }));

  // V5 keeps brand artwork/no icon control while sharing progress-state semantics.
  modal = await openCampaign("Version 5");
  stepper = modal.locator(".channel-progress-stepper--modal-v5");
  assert.equal(await iconControls().count(), 0);
  assert.deepEqual(await socialStepperSources(stepper), brandSources);
  await assertActive(stepper.getByRole("button", { name: "Google, unscheduled" }));
  await assertNeutral(stepper.getByRole("button", { name: "Facebook, unscheduled" }));
  await modal.locator(".v5-context-footer")
    .getByRole("button", { name: "Schedule and view next", exact: true })
    .click();
  modal = v5Modal();
  await modal.waitFor();
  stepper = modal.locator(".channel-progress-stepper--modal-v5");
  await assertCompleted(stepper.getByRole("button", { name: "Google, scheduled" }));
  await assertActive(stepper.getByRole("button", { name: "Facebook, unscheduled" }));
  await stepper.getByRole("button", { name: "Google, scheduled" }).click();
  await assertActive(
    stepper.getByRole("button", { name: "Google, scheduled" }),
    "rgb(56, 133, 35)",
  );
  await modal.locator(".v5-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await review().waitFor();
  reviewStepper = review().locator(".channel-progress-stepper--review");
  assert.deepEqual(await socialStepperSources(reviewStepper), brandSources);
  await assertActive(
    reviewStepper.getByRole("button", { name: "Google, scheduled" }),
    "rgb(56, 133, 35)",
  );
  await reviewStepper.getByRole("button", { name: "Facebook, unscheduled" }).click();
  await assertActive(reviewStepper.getByRole("button", { name: "Facebook, unscheduled" }));
  await assertCompleted(reviewStepper.getByRole("button", { name: "Google, scheduled" }));
  assert.equal(await iconControls().count(), 0);

  console.log(
    "Verified fixed V4 Jobber icons, normalized artwork, full-modal active/completed states, workflow, and V5 isolation.",
  );
} finally {
  await browser.close();
}
