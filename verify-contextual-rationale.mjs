import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const verifyV5 = process.env.VERIFY_V5 === "1";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const saturdayCard = () => page.locator(".calendar-day")
  .filter({ has: page.getByRole("heading", { name: "Saturday, Nov 7", exact: true }) })
  .locator(".combined-target-card");

const channels = [
  {
    label: "Google",
    heading: "About this Google post",
    rationale: "Keep your Google presence active and help nearby homeowners find you in local search. Showcasing a real Hamilton project builds trust and gives potential leads confidence to contact you.",
  },
  {
    label: "Facebook",
    heading: "About this Facebook post",
    rationale: "Build trust by sharing real work with your local community. Facebook expands your reach through reactions and shares, helping more nearby homeowners discover your business and become potential leads.",
  },
  {
    label: "Instagram",
    heading: "About this Instagram post",
    rationale: "Build trust with a visual showcase of real work. Instagram helps your transformation reach a broader local audience, attract homeowners looking for inspiration, and turn that interest into potential leads.",
  },
  {
    label: "Email",
    heading: "About this email campaign",
    rationale: "Support relationships with existing customers and past leads by sharing timely, relevant work. This project reminds them what you offer and encourages repeat or seasonal bookings.",
  },
  {
    label: "Website",
    heading: "About this website page",
    rationale: "Keep your website current and help your business appear in local search with a detailed project update. Showing real work builds trust and helps visitors choose your service.",
  },
];

async function selectVersion(label) {
  const button = page.getByRole("button", { name: label, exact: true });
  await button.click();
}

async function verifyModal({ version, modalSelector, stepperSelector, copySelector, headingSelector }) {
  await selectVersion(version);
  if (version === "Version 4") {
    await page.getByRole("button", { name: "Progress button", exact: true }).click();
  }
  await saturdayCard().click();
  if (version === "Version 4") {
    await page.locator(".v4-summary-modal").getByRole("button", { name: "Review Drafts" }).click();
  }
  const modal = page.locator(modalSelector);
  await modal.waitFor();
  const stepper = modal.locator(stepperSelector);

  for (const channel of channels) {
    await stepper.getByRole("button", { name: new RegExp(`^${channel.label},`) }).click();
    assert.equal(
      (await modal.locator(copySelector).textContent())?.trim(),
      channel.rationale,
      `${version} ${channel.label} rationale must update immediately`,
    );
    if (headingSelector) {
      assert.equal(
        (await modal.locator(headingSelector).textContent())?.trim(),
        channel.heading,
        `${version} ${channel.label} About heading must update immediately`,
      );
    }
  }

  await modal.getByRole("button", { name: "Close", exact: true }).click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await verifyModal({
    version: "Version 4",
    modalSelector: ".v4-five-channel-modal",
    stepperSelector: ".channel-progress-stepper--modal-v4",
    copySelector: ".v4-about-copy > p",
    headingSelector: ".v4-about-heading h2",
  });

  if (verifyV5) {
    await verifyModal({
      version: "Version 5",
      modalSelector: ".v5-context-modal",
      stepperSelector: ".channel-progress-stepper--modal-v5",
      copySelector: ".v5-context-campaign-intro > p",
    });
  }

  console.log(`Verified channel-specific contextual rationale for V4${verifyV5 ? " and V5" : ""}.`);
} finally {
  await browser.close();
}
