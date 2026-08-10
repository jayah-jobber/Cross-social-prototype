import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const screenshotPath = process.env.V4_GOOGLE_SCREENSHOT
  ?? "/tmp/marketing-qa-v4-generated-google-review.png";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const modal = () => page.locator(".v4-five-channel-modal");
const review = () => page.locator(".v4-channel-review");
const generatedFlow = () => page.locator(".v4-generated-flow-shell");
const channels = [
  ["Google", ".post-copy > p", ".post-header span"],
  ["Facebook", ".channel-post-copy > p:first-child", ".channel-post-header span"],
  ["Instagram", ".instagram-post-copy > p:first-child", ".channel-post-header span"],
  ["Email", ".email-content > .propagated-body", ".email-envelope p"],
  ["Website", ".website-copy > .propagated-body", ".website-nav"],
];

async function assertReadableBody(scope, bodySelector, metadataSelector) {
  const body = scope.locator(bodySelector);
  const metadata = scope.locator(metadataSelector).first();
  await body.waitFor();
  const bodyStyle = await body.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      whiteSpace: style.whiteSpace,
    };
  });
  const metadataSize = Number.parseFloat(
    await metadata.evaluate((element) => getComputedStyle(element).fontSize),
  );
  assert.equal(bodyStyle.fontSize, "16px");
  assert.ok(
    Number.parseFloat(bodyStyle.lineHeight) >= 21.5,
    `Expected readable line height, received ${bodyStyle.lineHeight}`,
  );
  assert.equal(bodyStyle.whiteSpace, "pre-wrap");
  assert.ok(metadataSize < 16, `Metadata unexpectedly enlarged to ${metadataSize}px`);
}

async function selectChannel(scope, channel, stepperClass) {
  await scope.locator(stepperClass)
    .getByRole("button", { name: new RegExp(`^${channel},`) })
    .click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Progress button", exact: true }).click();

  const saturday = page.locator(".calendar-day").filter({
    has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }),
  }).locator(".combined-target-card");
  await saturday.click();
  await page.locator(".v4-summary-modal")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();

  for (const [channel, bodySelector, metadataSelector] of channels) {
    await selectChannel(modal(), channel, ".channel-progress-stepper--modal-v4");
    await assertReadableBody(modal(), bodySelector, metadataSelector);
  }

  await selectChannel(modal(), "Google", ".channel-progress-stepper--modal-v4");
  await modal().locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  for (const [channel, bodySelector, metadataSelector] of channels) {
    await selectChannel(review(), channel, ".channel-progress-stepper--review");
    await assertReadableBody(review(), bodySelector, metadataSelector);
    const disclaimer = review().locator(".preview-disclaimer").first();
    if (await disclaimer.count()) {
      assert.ok(
        Number.parseFloat(await disclaimer.evaluate((element) => getComputedStyle(element).fontSize)) < 16,
        "Preview disclaimer must remain smaller than post content",
      );
    }
  }
  await review().locator(".review-footer").getByRole("button", { name: "Back", exact: true }).click();
  await modal().getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Add to your marketing calendar").fill("Generated readability QA");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const summary = generatedFlow().locator(".v4-summary-modal--generated");
  await summary.waitFor({ timeout: 8000 });
  await summary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedContext = generatedFlow().locator(".v4-generated-review");
  await assertReadableBody(generatedContext, ".post-copy > p", ".post-header span");
  await generatedContext.locator(".v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await review().getByRole("heading", { name: "Review Google Post", exact: true }).waitFor();
  await assertReadableBody(review(), ".post-copy > p", ".post-header span");
  await review().locator(".preview-panel").screenshot({ path: screenshotPath });

  console.log(`Verified V4 preview/review body typography and generated Google readability. Screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
}
