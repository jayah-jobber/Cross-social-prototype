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

const adhoc = () => page.locator(".v4-adhoc-page");
const creation = () => page.getByRole("dialog", { name: "Showcase a Job" });
const summary = () => page.locator(".v4-summary-modal--calendar");
const context = () => page.locator(".v4-five-channel-modal");
const createdRows = () => adhoc().locator(".adhoc-created-campaign-row");
const createdRow = (index = 0) => createdRows().nth(index);
const createdChildren = (id) => adhoc().locator(
  `.adhoc-created-child-row[data-campaign-id='${id}']`,
);

async function openAdHoc() {
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Ad-hoc", exact: true }).click();
  await adhoc().waitFor();
}

async function openCreation() {
  await adhoc().getByRole("button", { name: "New Job Showcase", exact: true }).click();
  await creation().waitFor();
}

async function chooseChannels(labels) {
  for (const label of labels) {
    await creation().getByRole("checkbox", { name: label, exact: true }).check();
  }
}

async function waitForGeneratedContext() {
  await page.getByRole("dialog", { name: "Generating job showcase" }).waitFor();
  assert.equal(await page.getByText("Suggested Marketing Content", { exact: true }).count(), 0);
  assert.equal(await page.locator(".suggested-prompt-section, textarea").count(), 0);
  assert.equal(
    await page.getByRole("status", { name: "Understanding your marketing plan" }).count(),
    1,
  );
  await context().waitFor({ timeout: 8_000 });
  assert.equal(await page.locator(".v4-summary-modal").count(), 0);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await openAdHoc();
  const initialCalendarCards = await page.locator(".generated-delivery-card").count();

  await openCreation();
  assert.equal(
    await creation().getByRole("tab", { name: "Recommended Jobs", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await creation().getByRole("tab", { name: "All Jobs", exact: true })
      .getAttribute("aria-selected"),
    "false",
  );
  assert.equal(
    await creation().getByText(
      "Select the job you’d like to feature, then we’ll create a draft for you to review. We’ve highlighted jobs with strong images, complete details, and quality content",
      { exact: true },
    ).count(),
    1,
  );
  const radios = creation().getByRole("radio");
  assert.equal(await radios.count(), 3);
  assert.equal(await creation().getByRole("radio", { name: /#8 Property Cleanup/ }).isChecked(), true);
  assert.deepEqual(
    await radios.evaluateAll((items) => items.map((input) => input.value)),
    ["property-cleanup", "weather-stripping", "toilet-tank"],
  );
  assert.equal(await creation().getByText("03/15/2023", { exact: true }).count(), 3);
  assert.equal(await creation().getByText("Amy Lin", { exact: true }).count(), 3);
  assert.equal(await creation().getByText("{Property Address}", { exact: true }).count(), 3);
  assert.equal(await creation().getByText("+2", { exact: true }).count(), 1);
  assert.equal(await creation().getByText("+33", { exact: true }).count(), 1);
  assert.equal(await creation().getByText("Posted", { exact: true }).count(), 1);
  assert.equal(await creation().locator("img[src='/assets/v4-adhoc-job-thumbnail.png']").count(), 13);

  await creation().getByRole("radio", { name: /#7 Weather stripping/ }).check();
  await creation().getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await creation().count(), 0);
  await openCreation();
  assert.equal(await creation().getByRole("radio", { name: /#8 Property Cleanup/ }).isChecked(), true);

  await creation().getByRole("radio", { name: /#7 Weather stripping/ }).check();
  await creation().getByRole("button", { name: /^Next/ }).click();
  const createButton = creation().getByRole("button", {
    name: "Create Draft Post",
    exact: true,
  });
  assert.equal(await createButton.isDisabled(), true);
  assert.equal(await creation().getByRole("checkbox").count(), 5);
  assert.equal(await creation().getByRole("checkbox", { checked: true }).count(), 0);
  const googleCheckbox = creation().getByRole("checkbox", { name: "Google", exact: true });
  const googleVisual = googleCheckbox.locator("+ .adhoc-channel-checkbox");
  assert.deepEqual(
    await googleVisual.evaluate((element) => {
      const style = getComputedStyle(element);
      const listStyle = getComputedStyle(
        element.closest(".adhoc-create-channel-list"),
      );
      const labelStyle = getComputedStyle(element.closest("label"));
      const label = element.closest("label")?.querySelector("strong");
      return {
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        radius: style.borderRadius,
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        background: style.backgroundColor,
        rowGap: listStyle.rowGap,
        labelGap: labelStyle.columnGap,
        fontSize: label ? getComputedStyle(label).fontSize : null,
      };
    }),
    {
      width: 20,
      height: 20,
      radius: "4px",
      borderWidth: "2px",
      borderColor: "rgb(218, 223, 226)",
      background: "rgb(255, 255, 255)",
      rowGap: "6px",
      labelGap: "8px",
      fontSize: "14px",
    },
  );
  await googleCheckbox.focus();
  assert.equal(await googleCheckbox.evaluate((input) => document.activeElement === input), true);
  assert.equal(
    await googleVisual.evaluate((element) => getComputedStyle(element).outlineWidth),
    "3px",
  );
  await page.keyboard.press("Space");
  assert.equal(await googleCheckbox.isChecked(), true);
  assert.deepEqual(
    await googleVisual.evaluate((element) => {
      const style = getComputedStyle(element);
      const check = element.querySelector("img");
      return {
        borderColor: style.borderColor,
        background: style.backgroundColor,
        checkSource: check?.getAttribute("src"),
        checkWidth: check?.getBoundingClientRect().width,
        checkHeight: check?.getBoundingClientRect().height,
      };
    }),
    {
      borderColor: "rgb(56, 133, 35)",
      background: "rgb(56, 133, 35)",
      checkSource: "/assets/v4-adhoc-checkbox-check.svg",
      checkWidth: 12,
      checkHeight: 12,
    },
  );
  await page.keyboard.press("Space");
  assert.equal(await googleCheckbox.isChecked(), false);

  await chooseChannels(["Website", "Google", "Instagram"]);
  assert.deepEqual(
    await creation().getByRole("checkbox", { checked: true })
      .evaluateAll((items) => items.map((input) => input.parentElement?.textContent?.trim())),
    ["Google", "Instagram", "Website"],
  );
  await creation().getByRole("checkbox", { name: "Instagram", exact: true }).uncheck();
  await creation().getByRole("button", { name: "Back to job selection" }).click();
  assert.equal(await creation().getByRole("radio", { name: /#7 Weather stripping/ }).isChecked(), true);
  await creation().getByRole("button", { name: /^Next/ }).click();
  assert.deepEqual(
    await creation().getByRole("checkbox", { checked: true })
      .evaluateAll((items) => items.map((input) => input.value)),
    ["on", "on"],
  );
  await creation().getByRole("button", { name: "Close Showcase a Job" }).click();

  // Dismiss resets both job and channel choices.
  await openCreation();
  assert.equal(await creation().getByRole("radio", { name: /#8 Property Cleanup/ }).isChecked(), true);
  await creation().getByRole("button", { name: /^Next/ }).click();
  assert.equal(await creation().getByRole("checkbox", { checked: true }).count(), 0);

  await chooseChannels(["Email", "Facebook"]);
  await createButton.click();
  await waitForGeneratedContext();
  assert.equal(await createdRows().count(), 1);
  await context().getByRole("heading", {
    name: "About this Facebook post",
    exact: true,
  }).waitFor();
  assert.equal(await context().locator(".v4-arrow-navigator").getByText("1 of 2").count(), 1);
  await context().getByRole("button", { name: "Next channel", exact: true }).click();
  await context().getByRole("heading", {
    name: "About this email campaign",
    exact: true,
  }).waitFor();
  assert.equal(await context().locator(".v4-arrow-navigator").getByText("2 of 2").count(), 1);
  assert.equal(
    await context().getByRole("button", { name: "Next channel", exact: true }).isDisabled(),
    true,
  );
  await context().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await page.locator(".calendar-modal-overlay").count(), 0);
  assert.equal(await summary().count(), 0);
  await adhoc().waitFor();
  assert.equal(await createdRows().count(), 1);

  const firstId = await createdRow().getAttribute("data-campaign-id");
  assert.ok(firstId);
  await createdRow().getByRole("button", {
    name: "Expand Seasonal Property Clean Up in Hamilton channels",
  }).click();
  assert.deepEqual(
    await createdChildren(firstId).evaluateAll((items) => items.map((row) => ({
      channel: row.getAttribute("data-channel"),
      content: row.cells[0]?.textContent?.trim(),
      channelText: row.cells[3]?.textContent?.trim(),
      status: row.querySelector(".adhoc-campaign-status")?.textContent?.trim(),
    }))),
    [
      { channel: "facebook", content: "", channelText: "Facebook", status: "Draft" },
      { channel: "email", content: "", channelText: "Email", status: "Draft" },
    ],
  );
  assert.equal(
    await adhoc().locator(
      ".adhoc-channel-icon, .adhoc-channel-stack, td:nth-child(4) img",
    ).count(),
    0,
  );
  await createdChildren(firstId).filter({ has: page.getByText("Email", { exact: true }) })
    .first().click();
  await context().getByRole("heading", {
    name: "About this email campaign",
    exact: true,
  }).waitFor();
  assert.equal(await context().locator(".v4-arrow-navigator").getByText("2 of 2").count(), 1);
  await context().getByRole("button", { name: "Close", exact: true }).click();

  await createdRow().click({ position: { x: 450, y: 34 } });
  await summary().waitFor();
  assert.equal(
    await summary().getByRole("heading", {
      name: "Seasonal Property Clean Up in Hamilton",
      exact: true,
    }).count(),
    1,
  );
  assert.deepEqual(
    await summary().locator(".v4-summary-status-list li").evaluateAll((items) => (
      items.map((item) => ({
        channel: item.getAttribute("data-channel"),
        status: item.querySelector(".v4-summary-status")?.textContent?.trim(),
        underlying: item.querySelector(".v4-summary-status")?.getAttribute("data-status"),
      }))
    )),
    [
      { channel: "facebook", status: "Draft", underlying: "suggested" },
      { channel: "email", status: "Draft", underlying: "suggested" },
    ],
  );
  assert.equal(
    await summary().getByRole("button", { name: "Start Review", exact: true }).count(),
    1,
  );
  assert.equal(await page.locator(".suggested-prompt-section").count(), 0);
  await summary().getByRole("button", { name: "Start Review", exact: true }).click();
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Schedule Facebook post", exact: true }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();
  await summary().waitFor();
  assert.deepEqual(
    await summary().locator(".v4-summary-status-list .v4-summary-status").allTextContents(),
    ["Scheduled", "Draft"],
  );
  await summary().getByRole("button", { name: "Close summary" }).click();
  assert.equal(await createdRow().locator(".adhoc-campaign-status").count(), 0);

  await createdChildren(firstId).filter({ has: page.getByText("Email", { exact: true }) })
    .first().click();
  await context().locator(".v4-context-footer")
    .getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog", { name: "Improve future recommendations" })
    .getByRole("button", { name: "Delete Campaign", exact: true }).click();
  await context().getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await createdChildren(firstId).filter({ hasText: "Email" }).count(), 0);
  assert.equal(
    (await createdRow().locator(".adhoc-campaign-status").textContent()).trim(),
    "Scheduled",
  );

  // Create another independent table-only showcase.
  await page.getByRole("button", { name: "Icon button", exact: true }).click();
  await openCreation();
  await creation().getByRole("button", { name: /^Next/ }).click();
  await chooseChannels(["Google"]);
  await creation().getByRole("button", { name: "Create Draft Post", exact: true }).click();
  await waitForGeneratedContext();
  const iconGeometry = await context().evaluate((dialog) => {
    const dialogBox = dialog.getBoundingClientRect();
    const switcher = dialog.querySelector(".channel-icon-switcher")?.getBoundingClientRect();
    const details = dialog.querySelector(".v4-context-details")?.getBoundingClientRect();
    const close = dialog.querySelector(".context-navigation-close")?.getBoundingClientRect();
    return {
      leftDelta: Math.abs((switcher?.left ?? 0) - (details?.left ?? 0)),
      centerDelta: Math.abs(
        (switcher?.left ?? 0) + (switcher?.width ?? 0) / 2
          - (dialogBox.left + dialogBox.width / 2),
      ),
      closeRightDelta: Math.abs((close?.right ?? 0) - (dialogBox.right - 32)),
    };
  });
  assert.ok(iconGeometry.leftDelta <= 1, JSON.stringify(iconGeometry));
  assert.ok(iconGeometry.centerDelta >= 40, JSON.stringify(iconGeometry));
  assert.ok(iconGeometry.closeRightDelta <= 1, JSON.stringify(iconGeometry));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".calendar-modal-overlay").count(), 0);
  assert.equal(await summary().count(), 0);
  assert.equal(await createdRows().count(), 2);

  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.locator(".v4-dashboard-page").waitFor();
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Ad-hoc", exact: true }).click();
  assert.equal(await createdRows().count(), 2);

  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await page.locator(".generated-delivery-card").count(), initialCalendarCards);
  await page.getByRole("button", { name: "Version 1", exact: true }).click();
  await page.getByRole("button", { name: "Version 4", exact: true }).click();
  await page.getByRole("group", { name: "Version 4 entry surface" })
    .getByRole("button", { name: "Ad-hoc", exact: true }).click();
  assert.equal(await createdRows().count(), 0);

  console.log(
    "Verified Ad-hoc selection, direct canonical context handoff, X/Escape dismissal, table persistence, later summary reopening, lifecycle/deletion, switching, and reset.",
  );
} finally {
  await browser.close();
}
