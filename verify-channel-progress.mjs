import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const saturdayCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");
const review = () => page.locator(".v4-channel-review");
const reviewFooter = () => review().locator(".review-footer");

async function resetTo(version) {
  const versionOne = page.getByRole("button", { name: "Version 1", exact: true });
  if (await versionOne.count()) await versionOne.click();
  await page.getByRole("button", { name: version, exact: true }).click();
}

async function openCampaign(version) {
  await resetTo(version);
  if (version === "Version 4") {
    await page.getByRole("button", { name: "Progress button", exact: true }).click();
  }
  await saturdayCard().click();
  if (version === "Version 4") {
    await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  }
  const selector = version === "Version 4" ? ".v4-five-channel-modal" : ".v5-context-modal";
  await page.locator(selector).waitFor();
  return page.locator(selector);
}

async function openPublishingMenu() {
  await reviewFooter().getByRole("button", { name: "Show publishing options" }).click();
}

async function assertNormalizedStepperIcons(stepper, socialSources = [
  "/assets/google-channel-icon.svg",
  "/assets/facebook-channel-icon.png",
  "/assets/instagram-channel-icon.png",
]) {
  const icons = await stepper.getByRole("button").evaluateAll((buttons) => (
    buttons.map((button) => {
      const wrapper = button.querySelector(".channel-progress-icon");
      const artwork = wrapper?.firstElementChild;
      const wrapperBox = wrapper?.getBoundingClientRect();
      const artworkBox = artwork?.getBoundingClientRect();
      return {
        label: button.getAttribute("aria-label"),
        wrapperWidth: Math.round(wrapperBox?.width ?? 0),
        wrapperHeight: Math.round(wrapperBox?.height ?? 0),
        artworkWidth: Math.round(artworkBox?.width ?? 0),
        artworkHeight: Math.round(artworkBox?.height ?? 0),
        source: artwork instanceof HTMLImageElement
          ? new URL(artwork.src).pathname
          : artwork?.tagName.toLowerCase(),
        ariaHidden: artwork?.getAttribute("aria-hidden"),
      };
    })
  ));

  assert.equal(icons.length, 5);
  assert.ok(icons.every(({ wrapperWidth, wrapperHeight }) => (
    wrapperWidth === 24 && wrapperHeight === 24
  )), JSON.stringify(icons, null, 2));
  assert.ok(icons.every(({ artworkWidth, artworkHeight }) => (
    artworkWidth > 0 && artworkWidth <= 24 && artworkHeight > 0 && artworkHeight <= 24
  )), JSON.stringify(icons, null, 2));
  assert.deepEqual(
    icons.map(({ source }) => source),
    [
      ...socialSources,
      "svg",
      "/assets/website-channel-icon.svg",
    ],
  );
  assert.ok(icons.every(({ ariaHidden }) => ariaHidden === "true"));
}

async function assertContextModalLayout(modal, version) {
  const stepperClass = version === "v4"
    ? ".channel-progress-stepper--modal-v4"
    : ".channel-progress-stepper--modal-v5";
  const stepper = modal.locator(stepperClass);
  assert.equal(await modal.locator(".channel-progress-stepper").count(), 1);
  assert.equal(await modal.locator(".context-progress-header > .channel-progress-stepper").count(), 1);
  assert.equal(await modal.locator(".v4-context-navigation-controls, .v5-context-navigation").count(), 0);
  assert.equal(
    (await modal.locator(".context-progress-header").textContent())?.toLowerCase().includes(
      "review multiple channels",
    ),
    version === "v5",
  );
  assert.equal(
    await modal.locator(".context-progress-header").getByRole("button", { name: "Close" }).count(),
    1,
  );
  if (version === "v4") {
    const centerDelta = await modal.evaluate((dialog) => {
      const modalBox = dialog.getBoundingClientRect();
      const stepperBox = dialog.querySelector(".channel-progress-stepper")?.getBoundingClientRect();
      return Math.abs(
        (stepperBox?.left ?? 0) + (stepperBox?.width ?? 0) / 2
          - (modalBox.left + modalBox.width / 2),
      );
    });
    assert.ok(centerDelta <= 1);
  }
  assert.ok(await stepper.getByRole("button").evaluateAll((buttons) => (
    buttons.every((button) => {
      const box = button.getBoundingClientRect();
      return Math.round(box.width) === 40 && Math.round(box.height) === 40;
    })
  )));

  const layout = await modal.evaluate((dialog, layoutVersion) => {
    const box = (selector) => dialog.querySelector(selector)?.getBoundingClientRect();
    const dialogBox = dialog.getBoundingClientRect();
    const headerBox = box(".context-progress-header");
    const bodyBox = box(layoutVersion === "v4" ? ".v4-context-body" : ".v5-context-content");
    const detailsBox = box(".v4-context-details");
    const previewBox = box(
      layoutVersion === "v4" ? ".v4-context-preview" : ".v5-context-preview-scroll",
    );
    return {
      width: Math.round(dialogBox.width),
      height: Math.round(dialogBox.height),
      headerHeight: Math.round(headerBox?.height ?? 0),
      bodyBelowHeader: Math.round((bodyBox?.top ?? 0) - (headerBox?.bottom ?? 0)),
      detailsWidth: Math.round(detailsBox?.width ?? 0),
      previewWidth: Math.round(previewBox?.width ?? 0),
      columnGap: Math.round((previewBox?.left ?? 0) - (detailsBox?.right ?? 0)),
      hasCampaignIntro: Boolean(dialog.querySelector(".v5-context-campaign-intro")),
    };
  }, version);

  assert.equal(layout.height, 852);
  assert.equal(layout.headerHeight, 84);
  assert.equal(layout.bodyBelowHeader, 0);
  if (version === "v4") {
    assert.equal(layout.width, 1043);
    assert.equal(layout.detailsWidth, 437);
    assert.ok(Math.abs(layout.previewWidth - 462) <= 2, JSON.stringify(layout));
    assert.equal(layout.columnGap, 48);
    assert.equal(layout.hasCampaignIntro, false);
  } else {
    assert.equal(layout.width, 860);
    assert.equal(layout.hasCampaignIntro, true);
  }
}

async function assertFigmaReviewLayout() {
  const shell = review();
  const stepper = shell.locator(".channel-progress-stepper--review");
  assert.equal(await shell.locator(".channel-progress-stepper").count(), 1);
  assert.equal(await shell.locator(".review-navigation-header > .channel-progress-stepper").count(), 1);
  assert.equal(await shell.locator(".review-scroll .channel-progress-stepper").count(), 0);
  assert.equal(await shell.locator(".v4-context-navigation-controls, .v5-context-navigation").count(), 0);
  assert.equal(await stepper.getByRole("button").count(), 5);
  assert.ok((await stepper.getByRole("button").evaluateAll((buttons) => (
    buttons.every((button) => {
      const box = button.getBoundingClientRect();
      return Math.round(box.width) === 40 && Math.round(box.height) === 40;
    })
  ))));

  const layout = await shell.evaluate((main) => {
    const left = main.querySelector(".review-panel");
    const right = main.querySelector(".preview-panel");
    const header = main.querySelector(".review-navigation-header");
    const stepper = header?.querySelector(".channel-progress-stepper");
    const heading = main.querySelector(".review-scroll h1");
    const footer = main.querySelector(".review-footer");
    const preview = main.querySelector(".preview-content");
    const box = (element) => element?.getBoundingClientRect();
    const mainBox = box(main);
    const leftBox = box(left);
    const rightBox = box(right);
    const headerBox = box(header);
    const stepperBox = box(stepper);
    const headingBox = box(heading);
    const footerBox = box(footer);
    const previewBox = box(preview);
    return {
      leftRatio: (leftBox?.width ?? 0) / (mainBox?.width ?? 1),
      rightRatio: (rightBox?.width ?? 0) / (mainBox?.width ?? 1),
      headerHeight: Math.round(headerBox?.height ?? 0),
      headerCenterOffset: Math.round(
        (stepperBox?.left ?? 0) + (stepperBox?.width ?? 0) / 2
        - ((headerBox?.left ?? 0) + (headerBox?.width ?? 0) / 2),
      ),
      hasReviewLabel: header?.textContent?.includes("Review multiple channels") ?? false,
      contentTopGap: Math.round((headingBox?.top ?? 0) - (headerBox?.bottom ?? 0)),
      footerBottomGap: Math.round((leftBox?.bottom ?? 0) - (footerBox?.bottom ?? 0)),
      previewCenterOffset: Math.round(
        (previewBox?.left ?? 0) + (previewBox?.width ?? 0) / 2
        - ((rightBox?.left ?? 0) + (rightBox?.width ?? 0) / 2),
      ),
      rightBackground: right ? getComputedStyle(right).backgroundColor : "",
    };
  });
  assert.ok(Math.abs(layout.leftRatio - 0.491) < 0.005, JSON.stringify(layout));
  assert.ok(Math.abs(layout.rightRatio - 0.509) < 0.005, JSON.stringify(layout));
  assert.equal(layout.headerHeight, 68);
  assert.ok(Math.abs(layout.headerCenterOffset) <= 1, JSON.stringify(layout));
  assert.equal(layout.hasReviewLabel, false);
  assert.equal(layout.contentTopGap, 48);
  assert.equal(layout.footerBottomGap, 0);
  assert.ok(Math.abs(layout.previewCenterOffset) <= 1, JSON.stringify(layout));
  assert.equal(layout.rightBackground, "rgb(241, 240, 233)");
  assert.equal(await reviewFooter().getByRole("button", { name: "Back", exact: true }).count(), 1);
  assert.equal(await reviewFooter().locator(".delete-post").count(), 1);
  assert.equal(await reviewFooter().locator(".v4-review-split-action").count(), 1);
  assert.equal(await shell.locator(".preview-panel .preview-content").count(), 1);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // Modal steps are clickable, status-aware, and preserve the five-channel order.
  let modal = await openCampaign("Version 4");
  let modalStepper = modal.locator(".channel-progress-stepper--modal-v4");
  assert.equal(await modalStepper.getByRole("button").count(), 5);
  await assertContextModalLayout(modal, "v4");
  await assertNormalizedStepperIcons(modalStepper, [
    "/assets/jobber-google-channel-icon.svg",
    "/assets/jobber-facebook-channel-icon.svg",
    "/assets/jobber-instagram-channel-icon.svg",
  ]);
  assert.deepEqual(
    await modalStepper.getByRole("button").evaluateAll((buttons) => (
      buttons.map((button) => button.getAttribute("aria-label"))
    )),
    [
      "Google, unscheduled",
      "Facebook, unscheduled",
      "Instagram, unscheduled",
      "Email, unscheduled",
      "Website, unscheduled",
    ],
  );
  await modalStepper.getByRole("button", { name: "Email, unscheduled" }).press("Enter");
  assert.equal(
    await modalStepper.getByRole("button", { name: "Email, unscheduled" }).getAttribute("aria-current"),
    "step",
  );
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Email Campaign" }).waitFor();
  const reviewStepper = review().locator(".channel-progress-stepper--review");
  await assertNormalizedStepperIcons(reviewStepper, [
    "/assets/jobber-google-channel-icon.svg",
    "/assets/jobber-facebook-channel-icon.svg",
    "/assets/jobber-instagram-channel-icon.svg",
  ]);
  await assertFigmaReviewLayout();
  await reviewStepper.getByRole("button", { name: "Website, unscheduled" }).press("Enter");
  await page.getByRole("heading", { name: "Review Website Page" }).waitFor();

  // V4 Schedule advances review-to-review and marks the completed channel.
  modal = await openCampaign("Version 4");
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Google Post" }).waitFor();
  await reviewFooter().getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await page.getByRole("heading", { name: "Review Facebook Post" }).waitFor();
  await page.getByText(
    "Your Google post has been successfully scheduled.",
    { exact: true },
  ).waitFor();
  const scheduledGoogle = review().getByRole("button", { name: "Google, scheduled" });
  assert.equal(await scheduledGoogle.getAttribute("class"), "completed");
  await page.waitForFunction(() => {
    const button = document.querySelector(
      '.v4-channel-review [aria-label="Google, scheduled"]',
    );
    return button && getComputedStyle(button).borderTopColor === "rgb(56, 133, 35)";
  });
  assert.equal(
    await scheduledGoogle.evaluate((button) => getComputedStyle(button).borderTopColor),
    "rgb(56, 133, 35)",
  );
  assert.equal(
    await review().getByRole("button", { name: "Facebook, unscheduled" }).getAttribute("aria-current"),
    "step",
  );
  await scheduledGoogle.click();
  assert.equal(await scheduledGoogle.getAttribute("class"), "active completed");
  assert.equal(await scheduledGoogle.getAttribute("aria-current"), "step");
  await review().getByRole("button", { name: "Facebook, unscheduled" }).click();

  // V4 alternate Post now advances without removing campaign membership.
  await openPublishingMenu();
  await page.getByRole("menuitem", { name: "Post now", exact: true }).click();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  await page.getByText(
    "Your Facebook post has been successfully posted.",
    { exact: true },
  ).waitFor();
  assert.equal(await review().getByRole("button", { name: "Facebook, sent" }).count(), 1);
  assert.equal(await review().locator(".channel-progress-stepper--review").getByRole("button").count(), 5);
  assert.equal(
    await review().getByRole("button", { name: "Instagram, unscheduled" })
      .getAttribute("aria-current"),
    "step",
  );

  // Deleted channels disappear and are skipped by V4 review progression.
  modal = await openCampaign("Version 4");
  modalStepper = modal.locator(".channel-progress-stepper--modal-v4");
  await modalStepper.getByRole("button", { name: "Facebook, unscheduled" }).click();
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  modal = page.locator(".v4-five-channel-modal");
  await modal.waitFor();
  assert.equal(await modal.getByRole("button", { name: /Facebook,/ }).count(), 0);
  await modal.getByRole("button", { name: "Google, unscheduled" }).click();
  await modal.locator(".v4-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await reviewFooter().getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await page.getByRole("heading", { name: "Review Instagram Post" }).waitFor();
  assert.equal(await review().getByRole("button", { name: /Facebook,/ }).count(), 0);

  // Delivering the final available V4 channel returns to the calendar.
  await review().getByRole("button", { name: "Website, unscheduled" }).click();
  await page.getByRole("heading", { name: "Review Website Page" }).waitFor();
  await reviewFooter().getByRole("button", { name: "Publish Website page", exact: true }).click();
  await page.getByRole("heading", { name: "Marketing Plan" }).waitFor();
  assert.equal(await review().count(), 0);
  await page.getByText(
    "Your website page has been successfully scheduled.",
    { exact: true },
  ).waitFor();

  // V5 retains its review-to-context-modal behavior.
  modal = await openCampaign("Version 5");
  const v5Stepper = modal.locator(".channel-progress-stepper--modal-v5");
  await assertContextModalLayout(modal, "v5");
  await assertNormalizedStepperIcons(v5Stepper);
  await v5Stepper.getByRole("button", { name: "Google, unscheduled" }).click();
  await modal.locator(".v5-context-footer").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("heading", { name: "Review Google Post" }).waitFor();
  await assertNormalizedStepperIcons(review().locator(".channel-progress-stepper--review"));
  await assertFigmaReviewLayout();
  await reviewFooter().getByRole("button", { name: "Schedule and view next", exact: true }).click();
  modal = page.locator(".v5-context-modal");
  await modal.waitFor();
  assert.equal(await review().count(), 0);
  assert.equal(
    await modal.getByRole("button", { name: "Facebook, unscheduled" }).getAttribute("aria-current"),
    "step",
  );
  assert.equal(
    await modal.getByRole("button", { name: "Google, scheduled" }).getAttribute("class"),
    "completed",
  );

  console.log(
    "Verified V4/V5 modal and Figma-aligned review steppers, normalized Figma logos, removed legacy controls, pane geometry, actions, completion, deletion, progression, and V5 isolation.",
  );
} finally {
  await browser.close();
}
