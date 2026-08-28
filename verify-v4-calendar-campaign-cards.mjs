import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { deriveV4CampaignCardState } from "./src/v4CampaignCardState.ts";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});
const originalCard = (day = "Saturday, Nov 7") => (
  calendarDay(day).locator(".combined-target-card")
);
const v4Modal = () => page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
const statusControls = () => page.getByRole("group", {
  name: "Google contextual modal demo status",
});

async function resetV4() {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
}

async function openOriginalCampaign() {
  await originalCard().click();
  await page.locator(".v4-summary-modal--calendar")
    .getByRole("button", { name: "Review Drafts", exact: true })
    .click();
  await v4Modal().waitFor();
}

async function selectChannel(channel) {
  await v4Modal().locator(".channel-icon-switcher--modal-v4")
    .getByRole("radio", { name: channel, exact: true })
    .click();
}

async function setGoogleState(state) {
  await selectChannel("Google");
  await statusControls().getByRole("button", { name: state, exact: true }).click();
}

async function scheduleOtherChannels() {
  for (const [channel, action] of [
    ["Facebook", "Schedule Facebook post"],
    ["Instagram", "Schedule Instagram post"],
    ["Email", "Schedule Email"],
    ["Website", "Publish Website page"],
  ]) {
    await selectChannel(channel);
    await v4Modal().locator(".v4-context-footer")
      .getByRole("button", { name: action, exact: true })
      .click();
  }
}

async function assertVisualState(card, {
  state,
  date,
  borderWidth = "1px",
  borderStyle = "solid",
  background = "rgb(255, 255, 255)",
  barColor = null,
  sentCheck = false,
}) {
  assert.equal(await card.getAttribute("data-card-state"), state);
  const styles = await card.evaluate((element) => {
    const cardStyle = getComputedStyle(element);
    const title = getComputedStyle(element.querySelector(".calendar-card-title"));
    const metadata = getComputedStyle(element.querySelector(".v4-calendar-card-details"));
    const supporting = getComputedStyle(element.querySelector(".v4-calendar-card-supporting"));
    const channelRow = getComputedStyle(element.querySelector(".v4-calendar-card-channels"));
    const before = getComputedStyle(element, "::before");
    return {
      borderWidth: cardStyle.borderTopWidth,
      borderStyle: cardStyle.borderTopStyle,
      borderColor: cardStyle.borderTopColor,
      borderRadius: cardStyle.borderRadius,
      background: cardStyle.backgroundColor,
      padding: cardStyle.padding,
      overflow: cardStyle.overflow,
      title: {
        fontSize: title.fontSize,
        fontWeight: title.fontWeight,
        lineHeight: title.lineHeight,
      },
      metadata: {
        fontSize: metadata.fontSize,
        fontWeight: metadata.fontWeight,
        lineHeight: metadata.lineHeight,
        color: metadata.color,
      },
      cardGap: cardStyle.gap,
      supportingGap: supporting.gap,
      channelGap: channelRow.gap,
      before: {
        content: before.content,
        width: before.width,
        background: before.backgroundColor,
      },
    };
  });

  assert.deepEqual(styles.title, {
    fontSize: "12px",
    fontWeight: "400",
    lineHeight: "15px",
  });
  assert.deepEqual(styles.metadata, {
    fontSize: "10px",
    fontWeight: "400",
    lineHeight: "12.5px",
    color: "rgb(35, 61, 72)",
  });
  assert.equal(styles.borderWidth, borderWidth);
  assert.equal(styles.borderStyle, borderStyle);
  assert.equal(styles.borderColor, "rgb(218, 223, 226)");
  assert.equal(styles.borderRadius, "8px");
  assert.equal(styles.background, background);
  assert.equal(styles.padding, "12px");
  assert.equal(styles.overflow, "hidden");
  assert.equal(styles.cardGap, "16px");
  assert.equal(styles.supportingGap, "8px");
  assert.equal(styles.channelGap, "4px");
  assert.deepEqual(
    await card.locator(".v4-calendar-card-metadata-row").allTextContents(),
    [date, state === "failed" ? "1 failed" : state[0].toUpperCase() + state.slice(1)],
  );
  assert.equal(await card.locator(".calendar-card-meta, .channel-status-dot").count(), 0);
  assert.ok(await card.locator(".calendar-channel-label").evaluateAll(
    (icons) => icons.every((icon) => icon.textContent === ""),
  ));
  assert.ok(await card.locator(".v4-calendar-channel-icon").evaluateAll(
    (icons) => icons.every((icon) => {
      const bounds = icon.getBoundingClientRect();
      const artwork = icon.firstElementChild?.getBoundingClientRect();
      return bounds.width === 18
        && bounds.height === 18
        && artwork?.width === 18
        && artwork?.height === 18;
    }),
  ));
  assert.equal(await card.locator(".v4-calendar-card-success").count(), sentCheck ? 1 : 0);
  if (sentCheck) {
    const check = await card.locator(".v4-calendar-card-success").boundingBox();
    assert.equal(check?.width, 16);
    assert.equal(check?.height, 16);
  }
  if (barColor) {
    assert.equal(styles.before.content, "\"\"");
    assert.equal(styles.before.width, "4px");
    assert.equal(styles.before.background, barColor);
  } else {
    assert.equal(styles.before.content, "none");
  }
}

try {
  assert.deepEqual(
    {
      failedSuggested: deriveV4CampaignCardState(["error", "suggested"]),
      twoFailed: deriveV4CampaignCardState(["error", "error"]),
      suggestedSent: deriveV4CampaignCardState(["suggested", "sent"]),
      sentMissed: deriveV4CampaignCardState(["sent", "missed"]),
      scheduledMissed: deriveV4CampaignCardState(["scheduled", "missed"]),
      allScheduled: deriveV4CampaignCardState(["scheduled", "scheduled"]),
      allSent: deriveV4CampaignCardState(["sent", "sent"]),
    },
    {
      failedSuggested: { state: "failed", label: "1 failed", failedCount: 1 },
      twoFailed: { state: "failed", label: "2 failed", failedCount: 2 },
      suggestedSent: { state: "suggested", label: "Suggested" },
      sentMissed: { state: "sent", label: "Sent" },
      scheduledMissed: { state: "missed", label: "Missed" },
      allScheduled: { state: "scheduled", label: "Scheduled" },
      allSent: { state: "sent", label: "Sent" },
    },
  );

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();

  const inertCard = calendarDay("Friday, Nov 6").locator(".v4-campaign-calendar-card")
    .filter({ has: page.getByText("Post title 1", { exact: true }) });
  assert.equal(await inertCard.evaluate((card) => card.tagName), "DIV");
  assert.equal(await inertCard.getAttribute("role"), null);
  assert.match(await inertCard.getAttribute("aria-label"), /Channels: Google, Instagram, Facebook/);
  assert.match(await inertCard.getAttribute("aria-label"), /Date: Nov 6/);
  await assertVisualState(inertCard, {
    state: "suggested",
    date: "Nov 6",
    borderWidth: "2px",
    borderStyle: "dashed",
    background: "rgba(0, 0, 0, 0)",
  });
  assert.deepEqual(
    await inertCard.locator(".v4-calendar-channel-icon").evaluateAll(
      (icons) => icons.map((icon) => icon.getAttribute("data-channel")),
    ),
    ["google", "instagram", "facebook"],
  );
  await inertCard.screenshot({ path: "/tmp/v4-calendar-card-suggested.png" });

  const hoverCard = originalCard();
  await hoverCard.hover();
  const hoverStyles = await hoverCard.evaluate((card) => {
    const style = getComputedStyle(card);
    return {
      borderColor: style.borderTopColor,
      boxShadow: style.boxShadow,
      transform: style.transform,
    };
  });
  assert.equal(hoverStyles.borderColor, "rgb(218, 223, 226)");
  assert.notEqual(hoverStyles.boxShadow, "none");
  assert.equal(hoverStyles.transform, "none");

  const sentCard = calendarDay("Wednesday, Nov 4")
    .locator(".v4-campaign-calendar-card[data-card-state='sent']")
    .first();
  await assertVisualState(sentCard, {
    state: "sent",
    date: "Nov 4",
    sentCheck: true,
  });
  await sentCard.screenshot({ path: "/tmp/v4-calendar-card-sent.png" });

  assert.equal(await page.getByRole("button", { name: /3 pending tasks/ }).count(), 1);
  assert.equal(await page.locator(".v4-pending-task-card.v4-campaign-calendar-card").count(), 0);
  assert.ok(await page.locator(".v4-campaign-calendar-card").evaluateAll(
    (cards) => cards.every((card) => card.querySelectorAll(".v4-calendar-channel-icon").length > 0),
  ));
  const initialSingleChannelCards = page.locator(
    ".v4-campaign-calendar-card:has(.v4-calendar-card-channels.is-single-channel)",
  );
  assert.deepEqual(
    (await initialSingleChannelCards.locator(".v4-calendar-single-channel-label").allTextContents())
      .sort(),
    ["Email", "Website"],
  );
  assert.ok(await initialSingleChannelCards.evaluateAll((cards) => cards.every((card) => {
    const label = card.querySelector(".v4-calendar-single-channel-label")?.textContent ?? "";
    return card.getAttribute("aria-label") === null
      && card.querySelector(".v4-calendar-card-channels")?.getAttribute("aria-hidden") === null
      && card.innerText.split(label).length - 1 === 1;
  })));
  assert.ok(await page.locator(
    ".v4-campaign-calendar-card .v4-calendar-card-channels:not(.is-single-channel)",
  ).evaluateAll((rows) => rows.every((row) => (
    row.getAttribute("aria-hidden") === "true"
    && row.querySelector(".v4-calendar-single-channel-label") === null
    && row.closest(".v4-campaign-calendar-card")?.getAttribute("aria-label")?.match(/Channels:/g)?.length === 1
  ))));

  await openOriginalCampaign();
  await setGoogleState("Error");
  await v4Modal().getByRole("button", { name: "Close", exact: true }).click();
  await assertVisualState(originalCard(), {
    state: "failed",
    date: "Nov 7",
    barColor: "rgb(210, 66, 50)",
  });
  assert.equal(await originalCard().getAttribute("data-failed-count"), "1");
  assert.match(await originalCard().getAttribute("aria-label"), /Status: 1 failed/);
  await originalCard().screenshot({ path: "/tmp/v4-calendar-card-failed.png" });

  await resetV4();
  await openOriginalCampaign();
  await setGoogleState("Missed");
  await scheduleOtherChannels();
  await v4Modal().getByRole("button", { name: "Close", exact: true }).click();
  await assertVisualState(originalCard(), {
    state: "missed",
    date: "Nov 7",
    barColor: "rgb(205, 181, 45)",
  });
  await originalCard().screenshot({ path: "/tmp/v4-calendar-card-missed.png" });

  await resetV4();
  await openOriginalCampaign();
  await setGoogleState("Scheduled");
  await scheduleOtherChannels();
  const completion = page.locator(".v4-topic-completion");
  if (await completion.count()) {
    await completion.getByRole("button", { name: "Back to Calendar", exact: true }).click();
  } else {
    await v4Modal().getByRole("button", { name: "Close", exact: true }).click();
  }
  await assertVisualState(originalCard(), {
    state: "scheduled",
    date: "Nov 7",
  });
  await originalCard().screenshot({ path: "/tmp/v4-calendar-card-scheduled.png" });

  await resetV4();
  await page.getByLabel("Add to your marketing calendar").fill("Shared generated card QA");
  await page.getByRole("button", { name: "Generate suggested marketing content" }).click();
  const generatedSummary = page.locator(".v4-generated-flow-shell .v4-summary-modal--generated");
  await generatedSummary.waitFor({ timeout: 8_000 });
  await generatedSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const generatedReview = page.locator(".v4-generated-review");
  const glimmer = generatedReview.locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4_500 });
  await generatedReview.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Save or discard draft" })
    .getByRole("button", { name: "Save Draft", exact: true }).click();
  const generatedCard = page.locator(
    ".generated-delivery-card.v4-campaign-calendar-card",
  );
  assert.equal(await generatedCard.evaluate((card) => card.tagName), "BUTTON");
  assert.equal(await generatedCard.locator(".v4-calendar-channel-icon").count(), 4);
  assert.equal(await generatedCard.locator(".v4-calendar-single-channel-label").count(), 0);
  assert.equal(await generatedCard.getAttribute("data-card-state"), "suggested");

  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  assert.equal(await page.locator(".v4-campaign-calendar-card").count(), 0);
  assert.ok(await page.locator(".marketing-calendar-card .calendar-card-meta").count() > 0);
  await page.getByRole("button", { name: "Version 5", exact: true }).click();
  assert.equal(await page.locator(".v4-campaign-calendar-card").count(), 0);

  console.log(
    "Verified V4 shared calendar campaign cards, five visual states, exact styling, aggregation precedence, failed counts, icon order, dates, accessibility, generated/inert behavior, and version isolation.",
  );
} finally {
  await browser.close();
}
