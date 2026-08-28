import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:4180";
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const flow = () => page.locator(".v4-generated-flow-shell");
const calendarIdeaSummary = () => flow().locator(".v4-summary-modal--generated");
const dashboardIdeaSummary = () => page.locator(".v4-dashboard-generated-summary");
const draftReview = () => page.locator(".v4-generated-review");
const exitDialog = () => page.getByRole("dialog", { name: "Save or discard draft" });
const generatedCard = () => page.locator(".generated-delivery-card");
const originalCard = () => page.locator(".combined-target-card");
const summaryArtworkPath = "/assets/v4-generated-summary-channel-artwork.png";
const exitBody = "Select whether you want to save this draft to your calendar or discard it. By discarding, you will remove it from your calendar.";
const staleExitCopy = [
  "Leave now",
  "Leave this modal",
  "Drafts are already saved to your calendar. Discarding them won’t affect content that’s already scheduled or posted.",
  "Discard and Exit",
  "Save drafts and Exit",
];
const calendarDay = (name) => page.locator(".calendar-day").filter({
  has: page.getByRole("heading", { name, exact: true }),
});

async function resetV4(origin = "calendar") {
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  if (origin !== "calendar") {
    await page.getByRole("button", {
      name: origin === "dashboard" ? "Dashboard" : "Ad-hoc",
      exact: true,
    }).click();
  }
}

async function generate(origin, prompt) {
  if (origin === "dashboard") {
    await page.getByLabel("Describe your marketing idea").fill(prompt);
    await page.getByRole("button", { name: "Generate Content", exact: true }).click();
  } else {
    await page.getByLabel("Add to your marketing calendar").fill(prompt);
    await page.getByRole("button", {
      name: "Generate suggested marketing content",
      exact: true,
    }).click();
  }
  await (origin === "dashboard" ? dashboardIdeaSummary() : calendarIdeaSummary())
    .waitFor({ timeout: 8000 });
}

async function commitDrafts(origin = "calendar") {
  const summary = origin === "dashboard" ? dashboardIdeaSummary() : calendarIdeaSummary();
  await summary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await draftReview().waitFor();
}

async function waitForPreview() {
  const glimmer = draftReview().locator(".v4-preview-glimmer");
  if (await glimmer.count()) await glimmer.waitFor({ state: "detached", timeout: 4500 });
}

async function requestExitWithClose() {
  await draftReview().getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
}

async function assertExitCopy() {
  assert.equal(await exitDialog().getAttribute("aria-labelledby"), "generated-v4-exit-title");
  assert.equal(
    await exitDialog().getByRole("heading", { name: "Save or discard draft", exact: true })
      .getAttribute("id"),
    "generated-v4-exit-title",
  );
  assert.equal(await exitDialog().getByText(exitBody, { exact: true }).count(), 1);
  assert.equal(await exitDialog().locator("p").count(), 1);
  assert.equal(
    await exitDialog().getByRole("button", { name: "Discard Draft", exact: true }).count(),
    1,
  );
  assert.equal(
    await exitDialog().getByRole("button", { name: "Save Draft", exact: true }).count(),
    1,
  );
  assert.deepEqual(
    await exitDialog().getByRole("button").allTextContents(),
    ["Discard Draft", "Save Draft"],
  );
  for (const staleCopy of staleExitCopy) {
    assert.equal(await page.getByText(staleCopy, { exact: true }).count(), 0);
  }

  const styles = await exitDialog().evaluate((dialog) => {
    const heading = dialog.querySelector("h2");
    const body = dialog.querySelector("p");
    const footer = dialog.querySelector("footer");
    const [secondary, primary] = dialog.querySelectorAll("button");
    const read = (node) => getComputedStyle(node);
    const dialogBox = dialog.getBoundingClientRect();
    return {
      dialog: {
        width: dialogBox.width,
        padding: read(dialog).padding,
        border: read(dialog).border,
        borderRadius: read(dialog).borderRadius,
        boxShadow: read(dialog).boxShadow,
      },
      heading: {
        color: read(heading).color,
        fontFamily: read(heading).fontFamily,
        fontSize: read(heading).fontSize,
        fontWeight: read(heading).fontWeight,
        lineHeight: read(heading).lineHeight,
      },
      body: {
        color: read(body).color,
        fontFamily: read(body).fontFamily,
        fontSize: read(body).fontSize,
        fontWeight: read(body).fontWeight,
        lineHeight: read(body).lineHeight,
      },
      footer: {
        gap: read(footer).gap,
        justifyContent: read(footer).justifyContent,
        marginTop: read(footer).marginTop,
      },
      secondary: {
        height: read(secondary).height,
        backgroundColor: read(secondary).backgroundColor,
        border: read(secondary).border,
        fontSize: read(secondary).fontSize,
        fontWeight: read(secondary).fontWeight,
      },
      primary: {
        height: read(primary).height,
        color: read(primary).color,
        backgroundColor: read(primary).backgroundColor,
        fontSize: read(primary).fontSize,
        fontWeight: read(primary).fontWeight,
      },
    };
  });
  assert.deepEqual(styles, {
    dialog: {
      width: 400,
      padding: "16px",
      border: "1px solid rgb(218, 223, 226)",
      borderRadius: "8px",
      boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 4px 0px, rgba(0, 0, 0, 0.05) 0px 4px 12px 0px",
    },
    heading: {
      color: "rgb(3, 43, 58)",
      fontFamily: "Inter, sans-serif",
      fontSize: "24px",
      fontWeight: "700",
      lineHeight: "31.92px",
    },
    body: {
      color: "rgb(35, 61, 72)",
      fontFamily: "Inter, sans-serif",
      fontSize: "14px",
      fontWeight: "400",
      lineHeight: "17.5px",
    },
    footer: {
      gap: "8px",
      justifyContent: "flex-end",
      marginTop: "16px",
    },
    secondary: {
      height: "40px",
      backgroundColor: "rgb(255, 255, 255)",
      border: "1px solid rgb(218, 223, 226)",
      fontSize: "14px",
      fontWeight: "600",
    },
    primary: {
      height: "40px",
      color: "rgb(255, 255, 255)",
      backgroundColor: "rgb(46, 134, 31)",
      fontSize: "14px",
      fontWeight: "600",
    },
  });
}

async function dismissExit() {
  await assertExitCopy();
  await page.keyboard.press("Escape");
  await exitDialog().waitFor({ state: "detached" });
  await draftReview().waitFor();
}

async function saveAndExit() {
  await assertExitCopy();
  await exitDialog().getByRole("button", { name: "Save Draft", exact: true }).click();
  await exitDialog().waitFor({ state: "detached" });
}

async function discardAndExit() {
  await assertExitCopy();
  await exitDialog().getByRole("button", { name: "Discard Draft", exact: true }).click();
  await exitDialog().waitFor({ state: "detached" });
}

async function assertIdeaOnly(origin) {
  await resetV4(origin);
  await generate(origin, `${origin} winter promotion`);
  const summary = origin === "dashboard" ? dashboardIdeaSummary() : calendarIdeaSummary();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(
    await page.getByLabel(
      origin === "dashboard" ? "Describe your marketing idea" : "Edit marketing content prompt",
    ).count(),
    1,
  );
  assert.equal(
    await summary.getByText(
      "Create drafts for:",
      { exact: true },
    ).count(),
    1,
  );
  assert.equal(await summary.getByText(/Recommended/).count(), 0);
  assert.equal(
    await summary.getByText("Schedule date:", { exact: true }).count(),
    origin === "dashboard" ? 1 : 0,
  );
  assert.equal(await summary.locator(".v4-context-preview, .social-card").count(), 0);
  assert.equal(await summary.getByText("Website", { exact: true }).count(), 0);
  assert.equal(await summary.getByRole("switch").count(), 4);
  assert.equal(await summary.getByText("Suggested", { exact: true }).count(), 0);
  assert.ok(
    (await summary.getByRole("switch").evaluateAll((switches) => (
      switches.map((toggle) => toggle.getAttribute("aria-checked"))
    ))).every((checked) => checked === "true"),
  );
  assert.equal(
    new URL(
      await summary.locator(
        origin === "dashboard"
          ? ".v4-dashboard-generated-artwork"
          : ".v4-summary-artwork",
      ).getAttribute("src"),
      baseUrl,
    ).pathname,
    summaryArtworkPath,
  );

  if (origin === "calendar") {
    for (const channel of ["Google", "Facebook", "Instagram", "Email"]) {
      await summary.getByRole("switch", { name: `Disable ${channel}`, exact: true }).click();
      assert.equal(
        await summary.getByRole("switch", { name: `Enable ${channel}`, exact: true })
          .getAttribute("aria-checked"),
        "false",
      );
    }
    assert.equal(
      await summary.getByRole("button", { name: "Review Drafts", exact: true }).isDisabled(),
      true,
    );
    await summary.getByRole("switch", { name: "Enable Google", exact: true }).click();
    assert.equal(
      await summary.getByRole("switch", { name: "Disable Google", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    assert.equal(
      await summary.getByRole("button", { name: "Review Drafts", exact: true }).isEnabled(),
      true,
    );
    await summary.getByRole("switch", { name: "Disable Google", exact: true }).click();
  } else {
    await summary.getByRole("switch", { name: "Disable Facebook", exact: true }).click();
  }

  if (origin === "dashboard") {
    await page.getByLabel("Describe your marketing idea").fill(`${origin} regenerated idea`);
    await page.getByRole("button", { name: "Generate Content", exact: true }).click();
  } else {
    await flow().getByLabel("Edit marketing content prompt").fill(`${origin} regenerated idea`);
    await flow().getByRole("button", { name: "Regenerate suggestions", exact: true }).click();
  }
  await summary.waitFor({ timeout: 8000 });
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await summary.getByText(/Recommended/).count(), 0);
  assert.deepEqual(
    await summary.getByRole("switch").evaluateAll((switches) => (
      switches.map((toggle) => [
        toggle.getAttribute("aria-label"),
        toggle.getAttribute("aria-checked"),
      ])
    )),
    [
      ["Disable Google", "true"],
      ["Disable Facebook", "true"],
      ["Disable Instagram", "true"],
      ["Disable Email", "true"],
    ],
  );

  if (origin === "dashboard") {
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.locator(".calendar-page").waitFor();
  } else {
    await flow().getByLabel("Close suggested marketing content").click();
    await flow().waitFor({ state: "detached" });
  }
  assert.equal(await exitDialog().count(), 0);
  assert.equal(await generatedCard().count(), 0);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // P1 is recommendation-only and ephemeral for both entry surfaces.
  await assertIdeaOnly("calendar");
  await assertIdeaOnly("dashboard");

  // Calendar P1 selection is committed once and scopes loading, persistence, and reopen.
  await resetV4("calendar");
  await generate("calendar", "Selected generated channels");
  await calendarIdeaSummary().getByRole("switch", { name: "Disable Facebook", exact: true }).click();
  await calendarIdeaSummary().getByRole("switch", { name: "Disable Email", exact: true }).click();
  await commitDrafts();
  assert.deepEqual(
    await draftReview().getByRole("radio").evaluateAll((radios) => (
      radios.map((radio) => radio.getAttribute("aria-label"))
    )),
    ["Google", "Instagram"],
  );
  assert.equal(await draftReview().getByRole("radio", { name: "Facebook", exact: true }).count(), 0);
  assert.equal(await draftReview().getByRole("radio", { name: "Email", exact: true }).count(), 0);
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 2);
  assert.deepEqual(
    await generatedCard().locator(".calendar-channel-label").evaluateAll((labels) => (
      labels.map((label) => label.getAttribute("data-channel"))
    )),
    ["google", "instagram"],
  );
  await draftReview().getByRole("status", { name: "Loading Google preview" }).waitFor();
  assert.equal(await draftReview().getByRole("status", { name: "Loading Facebook preview" }).count(), 0);
  assert.equal(await draftReview().getByRole("status", { name: "Loading Email preview" }).count(), 0);
  await waitForPreview();
  await draftReview().getByRole("radio", { name: "Instagram", exact: true }).click();
  await draftReview().getByRole("status", { name: "Loading Instagram preview" }).waitFor();
  await waitForPreview();
  await requestExitWithClose();
  await saveAndExit();
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 2);
  await generatedCard().click();
  const selectedCalendarSummary = page.locator(".v4-summary-modal--calendar");
  await selectedCalendarSummary.waitFor();
  assert.deepEqual(
    await selectedCalendarSummary.locator(".v4-summary-channel").allTextContents(),
    ["Google", "Instagram"],
  );
  assert.equal(await selectedCalendarSummary.getByText("Facebook", { exact: true }).count(), 0);
  assert.equal(await selectedCalendarSummary.getByText("Email", { exact: true }).count(), 0);
  await selectedCalendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const selectedReopenedReview = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await selectedReopenedReview.waitFor();
  assert.deepEqual(
    await selectedReopenedReview.getByRole("radio").evaluateAll((radios) => (
      radios.map((radio) => radio.getAttribute("aria-label"))
    )),
    ["Google", "Instagram"],
  );
  await selectedReopenedReview.getByRole("button", { name: "Close", exact: true }).click();
  await saveAndExit();

  // Dashboard-origin P2 is equally committed and returns to its own entry surface.
  await resetV4("dashboard");
  await generate("dashboard", "Dashboard committed lifecycle");
  await commitDrafts("dashboard");
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await page.getByRole("button", { name: "Ad-hoc", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await requestExitWithClose();
  await saveAndExit();
  await page.getByLabel("Describe your marketing idea").waitFor();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await generatedCard().count(), 1);

  // Dashboard discard returns to a fresh idea panel and removes undelivered drafts.
  await resetV4("dashboard");
  await generate("dashboard", "Dashboard discard reset");
  await commitDrafts("dashboard");
  await requestExitWithClose();
  await discardAndExit();
  await page.getByLabel("Describe your marketing idea").waitFor();
  assert.equal(await page.getByLabel("Describe your marketing idea").inputValue(), "");
  assert.equal(await dashboardIdeaSummary().count(), 0);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await generatedCard().count(), 0);

  // P2 commits immediately, removes the prompt, and guards every external exit.
  await resetV4("calendar");
  await generate("calendar", "Guarded generated lifecycle");
  await calendarIdeaSummary().getByRole("button", { name: "Review Drafts", exact: true })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await draftReview().waitFor();
  assert.equal(await generatedCard().count(), 1);
  assert.deepEqual(
    await draftReview()
      .locator(".v4-sliding-panel--text.is-active .v4-content-status")
      .allTextContents(),
    ["Suggested"],
  );
  assert.equal(
    await draftReview().locator(`img[src="${summaryArtworkPath}"]`).count(),
    0,
  );
  assert.equal(
    await calendarDay("Saturday, Nov 7").locator(".generated-delivery-card").count(),
    1,
  );
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);
  assert.equal(await page.getByLabel("Edit marketing content prompt").count(), 0);
  assert.equal(
    await draftReview()
      .locator(".v4-sliding-panel--text.is-active")
      .getByText("Nov 7, 2026 · 9:00 AM", { exact: true })
      .count(),
    1,
  );
  await draftReview().getByRole("status", { name: "Loading Google preview" }).waitFor();

  // Rapid close is idempotent; focus starts on Save and remains trapped.
  await draftReview().getByRole("button", { name: "Close", exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(await exitDialog().count(), 1);
  assert.equal(
    await exitDialog().getByText(exitBody, { exact: true }).count(),
    1,
  );
  assert.equal(await exitDialog().locator("p").count(), 1);
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Save Draft",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Discard Draft",
  );
  await dismissExit();

  // Escape and backdrop are guarded; cancel returns to intact P2.
  await page.keyboard.press("Escape");
  await exitDialog().waitFor();
  await dismissExit();
  await page.locator(".v4-generated-flow-overlay").click({ position: { x: 2, y: 2 } });
  await exitDialog().waitFor();
  await dismissExit();
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 4);

  // Internal channel/review/editor navigation never opens the exit dialog.
  await waitForPreview();
  await draftReview().getByRole("radio", { name: "Facebook", exact: true }).click();
  await waitForPreview();
  await draftReview().locator(".v4-sliding-panel--text.is-active .v4-context-footer")
    .getByRole("button", { name: "Edit", exact: true }).click();
  const channelReview = page.locator(".v4-channel-review");
  await channelReview.waitFor();
  assert.equal(await exitDialog().count(), 0);
  await channelReview.locator(".review-field").first()
    .getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator(".v4-social-editor").waitFor();
  assert.equal(await exitDialog().count(), 0);
  await page.locator(".v4-social-editor").getByRole("button", { name: "Cancel", exact: true }).click();
  await channelReview.getByRole("button", { name: "Back", exact: true }).click();
  await draftReview().waitFor();
  assert.equal(await exitDialog().count(), 0);

  // Surface navigation is guarded and Save honors the selected destination.
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await exitDialog().waitFor();
  await dismissExit();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();
  await page.getByRole("heading", { name: "Marketing Dashboard", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Describe your marketing idea").count(), 1);
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await generatedCard().count(), 1);

  // Saved drafts reopen through summary into guarded P2.
  await generatedCard().click();
  const calendarSummary = page.locator(".v4-summary-modal--calendar");
  await calendarSummary.waitFor();
  assert.equal(await calendarSummary.locator(".v4-summary-status-list > li").count(), 4);
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  await page.locator(".v4-five-channel-modal:not(.v4-generated-review)").waitFor();
  await page.locator(".v4-five-channel-modal:not(.v4-generated-review)")
    .getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();
  assert.equal(await generatedCard().count(), 1);

  // Discard with no protected deliveries removes only the active generated campaign.
  await resetV4("calendar");
  await generate("calendar", "Discard all generated drafts");
  await commitDrafts();
  await requestExitWithClose();
  await discardAndExit();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await originalCard().count(), 1);
  assert.equal(await originalCard().locator(".calendar-channel-label").count(), 5);

  // Discard protects scheduled content and removes every remaining draft.
  await generate("calendar", "Protect scheduled generated content");
  await commitDrafts();
  await waitForPreview();
  await draftReview().locator(".v4-sliding-panel--text.is-active .v4-context-footer")
    .getByRole("button", { name: "Schedule Google post", exact: true }).click();
  await requestExitWithClose();
  await discardAndExit();
  assert.equal(await generatedCard().count(), 1);
  assert.equal(await generatedCard().locator(".calendar-channel-label").count(), 1);
  assert.equal(await generatedCard().getAttribute("data-card-state"), "scheduled");
  await generatedCard().click();
  await calendarSummary.waitFor();
  assert.equal(await calendarSummary.locator(".v4-summary-status-list > li").count(), 1);
  assert.equal(await calendarSummary.getByText("Scheduled", { exact: true }).count(), 1);
  assert.equal(await calendarSummary.getByText(/Nov 7, 2026 9:00 AM/).count(), 1);
  await calendarSummary.getByRole("button", { name: "Review Drafts", exact: true }).click();
  const protectedReview = page.locator(".v4-five-channel-modal:not(.v4-generated-review)");
  await protectedReview.waitFor();
  assert.equal(await protectedReview.getByRole("radio").count(), 1);
  await protectedReview.getByRole("button", { name: "Close", exact: true }).click();
  await exitDialog().waitFor();
  await saveAndExit();

  // Delete All remains destructive even for protected generated content.
  await generatedCard().click();
  await calendarSummary.getByRole("button", { name: "Delete All", exact: true }).click();
  const deletion = page.getByRole("dialog", { name: "Improve future recommendations" });
  await deletion.getByLabel("The content isn’t relevant").check();
  await deletion.getByRole("button", { name: "Delete Campaign", exact: true }).click();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await originalCard().count(), 1);

  // P1 closes directly, while version navigation from P2 is guarded and resets cleanly.
  await generate("calendar", "Clean prompt after delete");
  await flow().getByLabel("Close suggested marketing content").click();
  await generate("calendar", "Guard version reset");
  await commitDrafts();
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await exitDialog().waitFor();
  await discardAndExit();
  await page.getByRole("button", { name: "Version 1", exact: true }).waitFor();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  assert.equal(await generatedCard().count(), 0);
  assert.equal(await flow().count(), 0);
  assert.equal(await page.getByLabel("Add to your marketing calendar").inputValue(), "");

  console.log(
    "Verified V4 Calendar/Dashboard P1-P2 persistence boundary, guarded exits, save/discard protection, reopen, Delete All, focus, idempotency, and clean reset.",
  );
} finally {
  await browser.close();
}
