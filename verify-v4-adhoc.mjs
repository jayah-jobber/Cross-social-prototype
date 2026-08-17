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

const entryControl = () => page.getByRole("group", { name: "Version 4 entry surface" });
const adhoc = () => page.locator(".v4-adhoc-page");
const calendar = () => page.locator(".calendar-page");
const dashboard = () => page.locator(".v4-dashboard-page");
const liveCampaignRow = () => adhoc().locator(".adhoc-live-campaign-row");
const childRows = () => adhoc().locator(".adhoc-campaign-child-row");
const childRow = (channel) => adhoc().locator(
  `.adhoc-campaign-child-row[data-channel='${channel}']`,
);
const contextModal = () => page.locator(".v4-five-channel-modal");
const summaryModal = () => page.locator(".v4-summary-modal--calendar");

async function selectEntry(name) {
  await entryControl().getByRole("button", { name, exact: true }).click();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();

  assert.equal(await calendar().count(), 1);
  await selectEntry("Dashboard");
  await dashboard().waitFor();
  assert.equal(await calendar().count(), 0);

  await selectEntry("Ad-hoc");
  await adhoc().waitFor();
  assert.equal(await dashboard().count(), 0);
  assert.equal(
    await entryControl().getByRole("button", { name: "Ad-hoc", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );

  await adhoc().getByRole("heading", { name: "Job Showcase", exact: true }).waitFor();
  assert.equal(await adhoc().getByText("Beta", { exact: true }).count(), 1);
  assert.equal(
    await adhoc().getByRole("tab", { name: "Job showcase", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.deepEqual(
    await adhoc().getByRole("tab").allTextContents(),
    ["Dashboard", "Marketing Plan", "Label", "Facebook", "Job showcase"],
  );

  await adhoc().getByRole("heading", {
    name: "Turn finished jobs into new ones",
    exact: true,
  }).waitFor();
  assert.equal(
    await adhoc().getByText(
      "With the job showcase, you can turn the photos and details of your jobs into engaging posts that can be shared across your social channels, website and via email campaigns",
      { exact: true },
    ).count(),
    1,
  );
  assert.equal(
    await adhoc().getByRole("button", { name: "Pick a Job to Showcase", exact: true }).count(),
    1,
  );

  await adhoc().getByRole("heading", { name: "All job showcases", exact: true }).waitFor();
  assert.equal(await adhoc().getByText("(0,000 results)", { exact: true }).count(), 1);
  assert.equal(await adhoc().getByRole("button", { name: /Created By.*\{User Name\}/ }).count(), 1);
  assert.equal(await adhoc().getByRole("button", { name: /Status.*All/ }).count(), 1);
  assert.equal(await adhoc().getByRole("button", { name: /Channel.*All/ }).count(), 1);
  assert.equal(
    await adhoc().getByRole("searchbox", { name: "Search job showcases" })
      .getAttribute("placeholder"),
    "Search",
  );

  const table = adhoc().getByRole("table", {
    name: "Job showcase examples and current campaign",
  });
  assert.deepEqual(
    (await table.getByRole("columnheader").allTextContents()).map((value) => value.trim()),
    ["Content", "Created by", "Status", "Channel", "Last Updated"],
  );
  const rows = table.locator("tbody tr");
  assert.equal(await rows.count(), 5);
  assert.deepEqual(
    await rows.evaluateAll((items) => items.map((row) => (
      Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent?.trim())
    ))),
    [
      ["Content title", "{SP name}", "Draft", "Facebook", "Jul 20, 2023 at 10:45PM"],
      [
        "Seasonal property clean up in Hamilton",
        "AI Recommended",
        "Draft",
        "Multi-channel",
        "Jul 20, 2023 at 10:45PM",
      ],
      ["Content title", "AI Recommended", "Draft", "Facebook", "Jul 20, 2023 at 10:45PM"],
      ["Content title", "AI Recommended", "Draft", "Facebook", "Jul 20, 2023 at 10:45PM"],
      ["Content title", "AI Recommended", "Draft", "Facebook", "Jul 20, 2023 at 10:45PM"],
    ],
  );

  const geometry = await adhoc().evaluate((surface) => {
    const hero = surface.querySelector(".adhoc-hero");
    const tableRows = Array.from(surface.querySelectorAll(".adhoc-showcase-table tbody tr"));
    if (!hero) throw new Error("Missing Ad-hoc hero");
    return {
      heroHeight: Math.round(hero.getBoundingClientRect().height),
      rowHeights: tableRows.map((row) => Math.round(row.getBoundingClientRect().height)),
      horizontalOverflow: surface.scrollWidth > surface.clientWidth,
      pageLeft: Math.round(surface.getBoundingClientRect().left),
    };
  });
  assert.equal(geometry.heroHeight, 252);
  assert.deepEqual(geometry.rowHeights, [68, 68, 68, 68, 68]);
  assert.equal(geometry.horizontalOverflow, false);
  assert.equal(geometry.pageLeft, 188);
  assert.equal(
    await adhoc().locator(".adhoc-hero-illustration").getAttribute("src"),
    "/assets/v4-adhoc-job-showcase-hero.png",
  );
  assert.equal(
    await adhoc().locator(
      ".adhoc-hero-texture, .adhoc-job-card, .adhoc-curved-arrow, "
      + ".adhoc-jobber-node, .adhoc-decorative-mark, .adhoc-hero-channel",
    ).count(),
    0,
  );

  // Static examples remain inert.
  await rows.first().click();
  assert.equal(await page.locator(".calendar-modal-overlay").count(), 0);

  // The live campaign is collapsed by default and expands without opening a modal.
  const expandButton = liveCampaignRow().locator(".adhoc-expand-button");
  assert.equal(await expandButton.getAttribute("aria-label"), "Expand campaign channels");
  assert.equal(await expandButton.getAttribute("aria-expanded"), "false");
  assert.deepEqual(
    (await expandButton.getAttribute("aria-controls")).split(" "),
    [
      "adhoc-campaign-google",
      "adhoc-campaign-facebook",
      "adhoc-campaign-instagram",
      "adhoc-campaign-email",
      "adhoc-campaign-website",
    ],
  );
  await expandButton.click();
  assert.equal(await page.locator(".calendar-modal-overlay").count(), 0);
  assert.equal(await childRows().count(), 5);
  assert.deepEqual(
    await childRows().evaluateAll((items) => items.map((row) => ({
      channel: row.getAttribute("data-channel"),
      content: row.cells[0]?.textContent?.trim(),
      channelText: row.cells[3]?.textContent?.trim(),
      status: row.querySelector(".adhoc-campaign-status")?.textContent?.trim(),
      underlyingStatus: row.querySelector(".adhoc-campaign-status")?.getAttribute("data-status"),
    }))),
    [
      { channel: "google", content: "", channelText: "Google", status: "Draft", underlyingStatus: "suggested" },
      { channel: "facebook", content: "", channelText: "Facebook", status: "Draft", underlyingStatus: "suggested" },
      { channel: "instagram", content: "", channelText: "Instagram", status: "Draft", underlyingStatus: "suggested" },
      { channel: "email", content: "", channelText: "Email", status: "Draft", underlyingStatus: "suggested" },
      { channel: "website", content: "", channelText: "Website", status: "Draft", underlyingStatus: "suggested" },
    ],
  );
  assert.equal(
    await table.locator(
      ".adhoc-channel-icon, .adhoc-channel-stack, td:nth-child(4) img",
    ).count(),
    0,
  );
  assert.equal(
    (await liveCampaignRow().locator(".adhoc-campaign-status").textContent()).trim(),
    "Draft",
  );
  assert.equal(
    await liveCampaignRow().locator(".adhoc-campaign-status").getAttribute("data-status"),
    "suggested",
  );

  // Native keyboard interaction collapses and expands without bubbling into row navigation.
  await expandButton.focus();
  await page.keyboard.press("Enter");
  assert.equal(await childRows().count(), 0);
  assert.equal(await summaryModal().count(), 0);
  await page.keyboard.press("Space");
  assert.equal(await childRows().count(), 5);
  assert.equal(await summaryModal().count(), 0);

  // Parent navigation uses the existing campaign summary and enters Google first.
  await liveCampaignRow().click({ position: { x: 440, y: 34 } });
  await summaryModal().waitFor();
  assert.deepEqual(
    await summaryModal().locator(".v4-summary-status-list li").evaluateAll((items) => (
      items.map((item) => ({
        channel: item.getAttribute("data-channel"),
        status: item.querySelector(".v4-summary-status")?.textContent?.trim(),
      }))
    )),
    [
      { channel: "google", status: "Suggested" },
      { channel: "facebook", status: "Suggested" },
      { channel: "instagram", status: "Suggested" },
      { channel: "email", status: "Suggested" },
      { channel: "website", status: "Suggested" },
    ],
  );
  await summaryModal().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await contextModal().getByRole("heading", {
    name: "About this Google post",
    exact: true,
  }).waitFor();
  await contextModal().getByText("Suggested", { exact: true }).waitFor();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  await adhoc().waitFor();
  assert.equal(await childRows().count(), 5);

  // A child opens its channel directly while keeping full canonical campaign navigation.
  await childRow("facebook").click();
  await contextModal().getByRole("heading", {
    name: "About this Facebook post",
    exact: true,
  }).waitFor();
  assert.equal(
    await contextModal().locator(".v4-arrow-navigator").getByText("2 of 5", { exact: true }).count(),
    1,
  );
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await childRows().count(), 5);

  // A shared Google status change is presented as mixed (no parent tag), then as 1 Failed.
  await childRow("google").click();
  const googleStatusControls = page.getByRole("group", {
    name: "Google contextual modal demo status",
  });
  await googleStatusControls.getByRole("button", { name: "Scheduled", exact: true }).click();
  assert.equal(await liveCampaignRow().locator(".adhoc-campaign-status").count(), 0);
  assert.equal(
    (await childRow("google").locator(".adhoc-campaign-status").textContent()).trim(),
    "Scheduled",
  );
  await googleStatusControls.getByRole("button", { name: "Error", exact: true }).click();
  assert.equal(
    (await liveCampaignRow().locator(".adhoc-campaign-status").textContent()).trim(),
    "1 Failed",
  );
  assert.equal(
    (await childRow("google").locator(".adhoc-campaign-status").textContent()).trim(),
    "Error",
  );
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();

  // Scheduling and deletion through contextual modals update the same live rows.
  await childRow("facebook").click();
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true })
    .click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(
    (await childRow("facebook").locator(".adhoc-campaign-status").textContent()).trim(),
    "Scheduled",
  );

  await childRow("instagram").click();
  await contextModal().locator(".v4-context-footer")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Post", exact: true })
    .click();
  await contextModal().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await childRow("instagram").count(), 0);
  assert.deepEqual(
    await childRows().evaluateAll((items) => items.map((row) => row.getAttribute("data-channel"))),
    ["google", "facebook", "email", "website"],
  );

  for (const asset of [
    "v4-adhoc-job-showcase-hero.png",
    "v4-adhoc-job-thumbnail.png",
  ]) {
    const response = await page.request.get(`${baseUrl}/assets/${asset}`);
    assert.equal(response.ok(), true, asset);
    assert.match(response.headers()["content-type"] ?? "", /^image\//, asset);
  }

  assert.equal(
    await page.locator(
      ".calendar-modal-overlay, .v4-generated-flow-shell, .v4-summary-modal, .v4-channel-review",
    ).count(),
    0,
  );

  await selectEntry("Calendar");
  await calendar().waitFor();
  assert.equal(await adhoc().count(), 0);
  assert.equal(await calendar().locator(".combined-target-card").count(), 1);
  assert.equal(
    await calendar().locator(".combined-target-card .calendar-channel-label")
      .filter({ hasText: "Instagram" }).count(),
    0,
  );

  // Switching surfaces closes an open V4 summary without changing its campaign content.
  await calendar().locator(".combined-target-card").click();
  await page.locator(".v4-summary-modal").waitFor();
  await selectEntry("Ad-hoc");
  await adhoc().waitFor();
  assert.equal(await page.locator(".v4-summary-modal").count(), 0);
  await selectEntry("Calendar");
  await calendar().waitFor();
  assert.equal(await calendar().locator(".combined-target-card").count(), 1);

  console.log(
    "Verified V4 Ad-hoc visuals, accessible expansion, shared statuses, summary/context navigation, lifecycle synchronization, deletion, and entry switching.",
  );
} finally {
  await browser.close();
}
