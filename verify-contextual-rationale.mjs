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
    rationale: "Help nearby homeowners discover your work when they search for landscaping services in Hamilton. A recent project builds local trust and gives customers a clear reason to contact you.",
  },
  {
    label: "Facebook",
    heading: "About this Facebook post",
    rationale: "Show the transformation to your local community, encourage reactions and shares, and keep your business top of mind when homeowners need seasonal clean up and mulching.",
  },
  {
    label: "Instagram",
    heading: "About this Instagram post",
    rationale: "Lead with the visual transformation to showcase your craftsmanship, reach people looking for landscaping inspiration, and build recognition for your work in Hamilton.",
  },
  {
    label: "Email",
    heading: "About this email campaign",
    rationale: "Give past customers and leads a timely seasonal reminder, demonstrate the results you deliver, and make it easy to book a similar clean up and mulching service.",
  },
  {
    label: "Website",
    heading: "About this website page",
    rationale: "Turn this project into lasting proof of your expertise. It helps visitors evaluate your work, supports local search visibility, and gives homeowners confidence to request a similar service.",
  },
];

async function selectVersion(label) {
  const button = page.getByRole("button", { name: label, exact: true });
  await button.click();
}

async function verifyModal({ version, modalSelector, stepperSelector, copySelector, headingSelector }) {
  await selectVersion(version);
  await saturdayCard().click();
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
