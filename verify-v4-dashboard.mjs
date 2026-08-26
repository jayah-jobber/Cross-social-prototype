import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const entryControl = () => page.getByRole("group", { name: "Version 4 entry surface" });
const navigationControl = () => page.getByRole("group", {
  name: "Version 4 navigation style",
});
const dashboard = () => page.locator(".v4-dashboard-page");
const generatedFlow = () => page.locator(".v4-generated-flow-shell");
const dashboardLoading = () => dashboard().locator(".v4-dashboard-context-loading");
const dashboardSummary = () => dashboard().locator(".v4-dashboard-generated-summary");
const calendarSummary = () => generatedFlow().locator(".v4-summary-modal--generated");
const generatedReview = () => page.locator(".v4-generated-review");
const promotionPrompt = "Create a 15% Christmas promotion for winter landscaping services across Google, Facebook, Instagram, and Email.";

async function generateFromDashboard(prompt) {
  const generateButton = dashboard().getByRole("button", {
    name: "Generate Content",
    exact: true,
  });
  await dashboard().getByLabel("Describe your marketing idea").fill(prompt);
  assert.equal(await generateButton.isEnabled(), true);
  await generateButton.click();
  await dashboardLoading().waitFor();
  const loadingGeometry = await dashboardLoading().evaluate((container) => {
    const center = container.querySelector(".v4-loading-center");
    if (!center) throw new Error("Dashboard loading center is missing");
    const containerBox = container.getBoundingClientRect();
    const centerBox = center.getBoundingClientRect();
    return {
      centerDeltaX: Math.abs(
        (centerBox.left + centerBox.width / 2)
        - (containerBox.left + containerBox.width / 2),
      ),
      centerDeltaY: Math.abs(
        (centerBox.top + centerBox.height / 2)
        - (containerBox.top + containerBox.height / 2),
      ),
      container: [Math.round(containerBox.width), Math.round(containerBox.height)],
      center: [Math.round(centerBox.width), Math.round(centerBox.height)],
    };
  });
  assert.ok(loadingGeometry.centerDeltaX <= 1, JSON.stringify(loadingGeometry));
  assert.ok(loadingGeometry.centerDeltaY <= 1, JSON.stringify(loadingGeometry));
  assert.ok(
    loadingGeometry.center[0] >= loadingGeometry.container[0] - 2,
    JSON.stringify(loadingGeometry),
  );
  assert.ok(
    loadingGeometry.center[1] >= loadingGeometry.container[1] - 2,
    JSON.stringify(loadingGeometry),
  );
  assert.equal(await generatedFlow().count(), 0);
  assert.equal(await dashboard().count(), 1);
  await dashboardSummary().waitFor({ timeout: 8000 });
}

async function assertGeneratedSummaryIconGeometry(scope, rowSelector) {
  const geometry = await scope.locator(rowSelector).evaluateAll((rows) => rows.map((row) => {
    const wrapper = row.querySelector(".channel-icon");
    const glyph = wrapper?.querySelector("img, svg");
    if (!wrapper || !glyph) throw new Error("Generated summary channel icon is incomplete");
    const wrapperBox = wrapper.getBoundingClientRect();
    const glyphBox = glyph.getBoundingClientRect();
    const wrapperStyle = getComputedStyle(wrapper);
    const glyphStyle = getComputedStyle(glyph);
    return {
      channel: wrapper.getAttribute("data-channel"),
      wrapper: [wrapperStyle.width, wrapperStyle.height],
      glyph: [glyphStyle.width, glyphStyle.height],
      maxSize: [glyphStyle.maxWidth, glyphStyle.maxHeight],
      transform: glyphStyle.transform,
      centerDelta: [
        Math.abs(
          wrapperBox.left + wrapperBox.width / 2 - (glyphBox.left + glyphBox.width / 2),
        ),
        Math.abs(
          wrapperBox.top + wrapperBox.height / 2 - (glyphBox.top + glyphBox.height / 2),
        ),
      ],
    };
  }));
  assert.deepEqual(
    geometry.map(({ channel, wrapper, glyph, maxSize, transform }) => ({
      channel,
      wrapper,
      glyph,
      maxSize,
      transform,
    })),
    [
      ...["google", "facebook", "instagram", "email"].map((channel) => ({
        channel,
        wrapper: ["24px", "24px"],
        glyph: channel === "google" ? ["20px", "20px"] : ["24px", "24px"],
        maxSize: ["none", "none"],
        transform: "none",
      })),
    ],
  );
  assert.ok(geometry.every(({ centerDelta }) => centerDelta.every((delta) => delta <= 0.5)));
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await entryControl().count(), 0);
  assert.equal(await navigationControl().count(), 0);

  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await entryControl().waitFor();
  assert.equal(
    await entryControl().getByRole("button", { name: "Calendar", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await dashboard().count(), 0);
  assert.equal(
    await entryControl().evaluate((control) => (
      document.querySelector(".prototype-frame")?.contains(control) ?? false
    )),
    false,
  );

  await entryControl().getByRole("button", { name: "Dashboard", exact: true }).click();
  await dashboard().waitFor();
  assert.equal(
    await dashboard().getByRole("tab", { name: "Start with your own idea" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await dashboard().getByRole("button", { name: "Generate Content", exact: true }).isDisabled(),
    true,
  );
  const geometry = await dashboard().evaluate(() => {
    const panel = document.querySelector(".v4-dashboard-idea-panel");
    const card = document.querySelector(".v4-dashboard-prompt-card");
    const chips = Array.from(document.querySelectorAll(".v4-dashboard-suggestions button"));
    const trySlot = document.querySelector(".v4-dashboard-suggestions strong");
    if (!panel || !card || !trySlot || chips.length !== 4) {
      throw new Error("Dashboard idea panel is incomplete");
    }
    const panelBox = panel.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const tryBox = trySlot.getBoundingClientRect();
    const chipBoxes = chips.map((chip) => chip.getBoundingClientRect());
    const panelStyle = getComputedStyle(panel);
    const cardStyle = getComputedStyle(card);
    return {
      panel: {
        width: Math.round(panelBox.width),
        radius: panelStyle.borderRadius,
        padding: [
          panelStyle.paddingTop,
          panelStyle.paddingRight,
          panelStyle.paddingBottom,
          panelStyle.paddingLeft,
        ],
        background: panelStyle.backgroundColor,
        shadow: panelStyle.boxShadow,
      },
      card: {
        width: Math.round(cardBox.width),
        height: Math.round(cardBox.height),
        radius: cardStyle.borderRadius,
        border: cardStyle.borderTopColor,
        padding: [
          cardStyle.paddingTop,
          cardStyle.paddingRight,
          cardStyle.paddingBottom,
          cardStyle.paddingLeft,
        ],
      },
      trySlot: [Math.round(tryBox.width), Math.round(tryBox.height)],
      chipHeights: chipBoxes.map(({ height }) => Math.round(height)),
      chipTops: chipBoxes.map(({ top }) => Math.round(top)),
    };
  });
  assert.deepEqual(geometry.panel.width, 800);
  assert.equal(geometry.panel.radius, "32px");
  assert.deepEqual(geometry.panel.padding, ["48px", "32px", "48px", "32px"]);
  assert.equal(geometry.panel.background, "rgb(247, 245, 243)");
  assert.match(geometry.panel.shadow, /rgba\(0, 0, 0, 0\.05\).*1px 1px/);
  assert.deepEqual(geometry.card, {
    width: 736,
    height: 320,
    radius: "16px",
    border: "rgb(218, 223, 226)",
    padding: ["25px", "25px", "25px", "25px"],
  });
  assert.deepEqual(geometry.trySlot, [31, 40]);
  assert.deepEqual(geometry.chipHeights, [40, 40, 40, 40]);
  assert.equal(new Set(geometry.chipTops.slice(0, 3)).size, 1);
  assert.ok(geometry.chipTops[3] > geometry.chipTops[2]);
  assert.deepEqual(
    await dashboard().locator(".v4-dashboard-channels > span").allTextContents(),
    ["Google", "Facebook", "Instagram", "Email", "Website"],
  );
  const expectedTools = [
    ["Google Business Profile", "A complete profile helps you rank in local searches nearby."],
    ["Social Posts", "Regular posts keep your business top of mind between jobs."],
    ["Your Website", "A real site builds credibility when people look you up."],
    ["Job Showcase", "Photos of past work show new customers you can deliver."],
    ["Review Management", "Fresh reviews boost trust and your ranking in local search."],
    ["Email Campaigns", "Reaching past customers brings repeat work at little cost."],
    ["Referral Campaigns", "Referrals convert better than ads and cost you nothing."],
  ];
  assert.deepEqual(
    await dashboard().locator(".v4-dashboard-tool").evaluateAll((items) => items.map((item) => [
      item.querySelector(".v4-dashboard-tool-copy > strong")?.textContent,
      item.querySelector(".v4-dashboard-tool-copy > span")?.textContent,
    ])),
    expectedTools,
  );
  const rightColumn = await dashboard().locator(".v4-dashboard-tools").evaluate((column) => {
    const style = getComputedStyle(column);
    const sections = Array.from(column.querySelectorAll(".v4-dashboard-tool-section"));
    const items = Array.from(column.querySelectorAll(".v4-dashboard-tool"));
    const tiles = Array.from(column.querySelectorAll(".v4-dashboard-tool-icon"));
    const firstHeader = column.querySelector(".v4-dashboard-tool-section > header");
    const firstHeading = column.querySelector(".v4-dashboard-tool-section h2");
    const firstDivider = column.querySelector(".v4-dashboard-tool-section > header > span");
    const firstTitle = column.querySelector(".v4-dashboard-tool-copy > strong");
    const firstDescription = column.querySelector(".v4-dashboard-tool-copy > span");
    return {
      width: Math.round(column.getBoundingClientRect().width),
      gap: style.rowGap,
      sectionGaps: sections.map((section) => getComputedStyle(section).rowGap),
      listGaps: sections.map((section) => (
        getComputedStyle(section.querySelector(".v4-dashboard-tool-list")).rowGap
      )),
      itemGaps: items.map((item) => getComputedStyle(item).columnGap),
      tileSizes: tiles.map((tile) => {
        const box = tile.getBoundingClientRect();
        return [Math.round(box.width), Math.round(box.height)];
      }),
      tileRadii: tiles.map((tile) => getComputedStyle(tile).borderRadius),
      tileColors: tiles.map((tile) => getComputedStyle(tile).backgroundColor),
      headerGap: getComputedStyle(firstHeader).columnGap,
      heading: {
        size: getComputedStyle(firstHeading).fontSize,
        weight: getComputedStyle(firstHeading).fontWeight,
        spacing: getComputedStyle(firstHeading).letterSpacing,
        color: getComputedStyle(firstHeading).color,
        lineHeight: getComputedStyle(firstHeading).lineHeight,
      },
      divider: {
        height: Math.round(firstDivider.getBoundingClientRect().height),
        color: getComputedStyle(firstDivider).backgroundColor,
      },
      title: {
        size: getComputedStyle(firstTitle).fontSize,
        weight: getComputedStyle(firstTitle).fontWeight,
        color: getComputedStyle(firstTitle).color,
        lineHeight: getComputedStyle(firstTitle).lineHeight,
      },
      description: {
        size: getComputedStyle(firstDescription).fontSize,
        weight: getComputedStyle(firstDescription).fontWeight,
        color: getComputedStyle(firstDescription).color,
        lineHeight: getComputedStyle(firstDescription).lineHeight,
      },
    };
  });
  assert.equal(rightColumn.width, 400);
  assert.equal(rightColumn.gap, "40px");
  assert.deepEqual(rightColumn.sectionGaps, ["24px", "24px", "24px"]);
  assert.deepEqual(rightColumn.listGaps, ["24px", "24px", "24px"]);
  assert.ok(rightColumn.itemGaps.every((gap) => gap === "16px"));
  assert.ok(rightColumn.tileSizes.every(([width, height]) => width === 48 && height === 48));
  assert.ok(rightColumn.tileRadii.every((radius) => radius === "12px"));
  assert.deepEqual(rightColumn.tileColors, [
    "rgb(239, 246, 255)",
    "rgb(239, 246, 255)",
    "rgb(239, 246, 255)",
    "rgb(254, 243, 199)",
    "rgb(254, 243, 199)",
    "rgb(236, 253, 245)",
    "rgb(236, 253, 245)",
  ]);
  assert.equal(rightColumn.headerGap, "16px");
  assert.deepEqual(rightColumn.heading, {
    size: "11px",
    weight: "700",
    spacing: "0.55px",
    color: "rgb(35, 61, 72)",
    lineHeight: "16.5px",
  });
  assert.deepEqual(rightColumn.divider, {
    height: 1,
    color: "rgb(226, 232, 240)",
  });
  assert.deepEqual(rightColumn.title, {
    size: "16px",
    weight: "700",
    color: "rgb(35, 61, 72)",
    lineHeight: "20px",
  });
  assert.deepEqual(rightColumn.description, {
    size: "14px",
    weight: "400",
    color: "rgb(73, 100, 111)",
    lineHeight: "17.5px",
  });
  const dashboardAssets = [
    "/assets/v4-dashboard-arrow.svg",
    "/assets/v4-dashboard-social.svg",
    "/assets/v4-dashboard-website.svg",
    "/assets/v4-dashboard-job-showcase.svg",
    "/assets/v4-dashboard-review.svg",
    "/assets/v4-dashboard-email.svg",
    "/assets/v4-dashboard-referral.svg",
  ];
  for (const asset of dashboardAssets) {
    const response = await page.request.get(`${baseUrl}${asset}`);
    assert.equal(response.ok(), true, asset);
    assert.match(response.headers()["content-type"] ?? "", /image\/svg\+xml/);
  }

  // A directly entered dashboard prompt keeps loading and summary in context.
  await generateFromDashboard("Promote winter landscaping from the dashboard");
  await dashboardSummary().getByRole("heading", { name: "15% promotion", exact: true }).waitFor();
  assert.equal(await dashboardSummary().getByRole("switch").count(), 4);
  await assertGeneratedSummaryIconGeometry(
    dashboardSummary(),
    ".v4-dashboard-generated-channel",
  );
  await entryControl().getByRole("button", { name: "Calendar", exact: true }).click();
  await page.locator(".calendar-page").waitFor();
  await entryControl().getByRole("button", { name: "Dashboard", exact: true }).click();
  await dashboard().waitFor();

  // The promotion chip only prefills; generation remains an explicit action.
  await dashboard().getByRole("button", { name: "15% promotion", exact: true }).click();
  assert.equal(
    await dashboard().getByLabel("Describe your marketing idea").inputValue(),
    promotionPrompt,
  );
  assert.equal(await generatedFlow().count(), 0);
  await dashboard().getByRole("button", { name: "Generate Content", exact: true }).click();
  await dashboardLoading().waitFor();
  await dashboardSummary().waitFor({ timeout: 8000 });
  assert.equal(await dashboard().count(), 1);
  await dashboardSummary().getByRole("switch", { name: "Disable Instagram" }).click();
  assert.equal(
    await dashboardSummary().getByRole("switch", { name: "Enable Instagram" })
      .getAttribute("aria-checked"),
    "false",
  );
  await dashboardSummary().getByRole("button", { name: "Review Drafts", exact: true }).click();
  await generatedReview().waitFor();
  assert.equal(await dashboard().count(), 1);
  assert.equal(await dashboardSummary().count(), 1);
  assert.equal(await generatedReview().locator(".channel-icon-switcher--modal-v4").count(), 1);
  assert.equal(
    await generatedReview().getByRole("radio", { name: "Google", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  assert.equal(await generatedReview().getByRole("radio").count(), 3);
  assert.equal(await generatedReview().getByRole("radio", { name: "Instagram", exact: true }).count(), 0);
  assert.equal(await generatedFlow().count(), 0);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  await generatedReview().getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Leave now" })
    .getByRole("button", { name: "Save drafts and Exit", exact: true }).click();
  await dashboard().waitFor();

  await entryControl().getByRole("button", { name: "Calendar", exact: true }).click();
  await page.locator(".calendar-page").waitFor();
  assert.equal(await dashboard().count(), 0);

  // Calendar and Dashboard proposal selections reset independently between entry surfaces.
  await page.getByLabel("Add to your marketing calendar").fill("Calendar selection isolation");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  await calendarSummary().waitFor({ timeout: 8000 });
  assert.deepEqual(
    await calendarSummary().getByRole("switch").evaluateAll((switches) => (
      switches.map((toggle) => toggle.getAttribute("aria-label"))
    )),
    ["Disable Google", "Disable Facebook", "Disable Instagram", "Disable Email"],
  );
  await calendarSummary().getByRole("switch", { name: "Disable Facebook", exact: true }).click();
  await entryControl().getByRole("button", { name: "Dashboard", exact: true }).click();
  await generateFromDashboard("Dashboard selection isolation");
  assert.deepEqual(
    await dashboardSummary().getByRole("switch").evaluateAll((switches) => (
      switches.map((toggle) => toggle.getAttribute("aria-label"))
    )),
    ["Disable Google", "Disable Facebook", "Disable Instagram", "Disable Email"],
  );

  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  assert.equal(await entryControl().count(), 0);
  assert.equal(await navigationControl().count(), 0);
  assert.equal(await dashboard().count(), 0);

  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await entryControl().waitFor();
  assert.equal(
    await entryControl().getByRole("button", { name: "Calendar", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await navigationControl().getByRole("button", { name: "Icon button", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );

  console.log(
    "Verified V4 dashboard entry, prompt and chip behavior, generated-flow origin, close return, calendar switching, and V5 isolation.",
  );
} finally {
  await browser.close();
}
