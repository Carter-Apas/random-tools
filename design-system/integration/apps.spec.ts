import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apps = [
  { name: "car-cost-comparison", port: 6101 },
  { name: "kiwi-fire-planner", port: 6102 },
  { name: "quiz-gen", port: 6103 },
  { name: "mermaid", port: 6104 },
  { name: "fishing-checklist", port: 6105 },
  { name: "reel-capacity", port: 6106 },
];

for (const app of apps) {
  test(`${app.name}: appearances, persistence, accessibility, and mobile layout`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`http://127.0.0.1:${app.port}`);
    await expect(page.locator("html")).toHaveAttribute("data-mono-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("mono.appearance"))).toBeNull();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mono-theme", "dark");
    await expect(page.locator(".mono-app-header")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".mono-app-mark")).toHaveText("C");
    await expect(page.locator(".mono-app-header small")).toHaveCount(0);
    const picker = page.locator(".mono-theme-toggle");
    for (const theme of ["mirage", "light", "dark"]) {
      for (
        let clicks = 0;
        clicks < 3 && (await picker.getAttribute("data-theme")) !== theme;
        clicks++
      )
        await picker.click();
      await expect(page.locator("html")).toHaveAttribute("data-mono-theme", theme);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ html, failureSummary }) => ({ html, failureSummary })),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`${app.name}-${theme}.png`),
        fullPage: true,
      });
    }
    await page.reload();
    await expect(picker).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(picker).toHaveAttribute("data-theme", "dark");
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("fishing checklist retains packing progress and reset", async ({ page }) => {
  await page.goto("http://127.0.0.1:6105");
  const first = page.getByRole("checkbox").first();
  await first.check();
  await expect(page.locator("#total-packed")).toHaveText("1");
  await page.reload();
  await expect(first).toBeChecked();
  await page.getByRole("button", { name: "Reset checklist", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset checklist" }).click();
  await expect(first).not.toBeChecked();
});

test("reel calculator responds to inputs and preserves them", async ({ page }) => {
  await page.goto("http://127.0.0.1:6106");
  await expect(page.locator("#storage-notice")).toBeHidden();
  await expect(page.locator("#result-metres")).toHaveText("313");
  await page.locator("#known-length").fill("400");
  await expect(page.locator("#result-metres")).toHaveText("625");
  await page.reload();
  await expect(page.locator("#known-length")).toHaveValue("400");
});

test("planner adds and removes an expense with shared controls", async ({ page }) => {
  await page.goto("http://127.0.0.1:6102");
  await page.getByRole("textbox", { name: "Expense Label" }).fill("Weekly groceries");
  await page.getByRole("spinbutton", { name: "Amount", exact: true }).fill("200");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const row = page.getByRole("row", { name: /Weekly groceries/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toHaveCount(0);
});

test("vehicle inputs and shared switches update the calculator", async ({ page }) => {
  await page.goto("http://127.0.0.1:6101");
  const distance = page.getByRole("spinbutton", { name: "Distance per year" });
  await distance.fill("20000");
  await expect(distance).toHaveValue("20000");
  const toggle = page.getByRole("switch", { name: "Use national averages" }).first();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("heading", { name: "Car cost comparison" })).toBeVisible();
});

test("quiz host and player forms use shared inputs", async ({ page }) => {
  await page.goto("http://127.0.0.1:6103/host");
  await page.getByRole("textbox", { name: "Topic", exact: true }).fill("Space");
  await expect(page.getByRole("textbox", { name: "Topic", exact: true })).toHaveClass(/mono-input/);
  await page.goto("http://127.0.0.1:6103/play");
  await page.getByRole("textbox", { name: "Room code", exact: true }).fill("ABCD");
  await page.getByRole("textbox", { name: "Nickname", exact: true }).fill("Carter");
  await expect(page.getByRole("textbox", { name: "Nickname", exact: true })).toHaveValue("Carter");
});

test("Mermaid renders and saves an edited diagram", async ({ page }) => {
  await page.goto("http://127.0.0.1:6104");
  const source = page.getByRole("textbox", { name: "Mermaid source", exact: true });
  await expect(source).toBeEnabled();
  await source.fill("flowchart LR\n A[Design] --> B[Shared]");
  await expect(page.locator("#diagram svg")).toContainText("Shared");
  await expect(page.locator("#save-status")).toHaveText("All changes saved");
  await page.reload();
  await expect(source).toHaveValue("flowchart LR\n A[Design] --> B[Shared]");
});

test("Mermaid supports pointer-anchored zoom, drag panning, fit, and inline tab actions", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:6104");
  const tabs = page.getByRole("tab");
  await expect(tabs.first()).toBeVisible();
  const count = await tabs.count();
  const add = page.getByRole("button", { name: "New tab", exact: true });
  const tabBounds = await page.locator("#tabs").boundingBox();
  const addBounds = await add.boundingBox();
  expect(addBounds!.x - (tabBounds!.x + tabBounds!.width)).toBeLessThanOrEqual(10);
  await add.click();
  await expect(tabs).toHaveCount(count + 1);
  const created = page.getByRole("tab", { selected: true });
  const createdId = await created.getAttribute("id");
  try {
    await page
      .getByRole("textbox", { name: "Mermaid source", exact: true })
      .fill("flowchart LR\n A[First] --> B[Second]");
    await expect(page.locator("#diagram svg")).toContainText("Second");
    await expect(page.locator("#save-status")).toHaveText("All changes saved");
    const node = page.locator("#diagram .node rect").first();
    const boxStyle = await node.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: style.strokeWidth,
        radius: style.rx,
        filter: style.filter,
        stroke: style.stroke,
        expected: getComputedStyle(document.documentElement)
          .getPropertyValue("--mono-control-border")
          .trim(),
      };
    });
    expect(boxStyle.width).toBe("1px");
    expect(boxStyle.radius).toBe("6px");
    expect(boxStyle.filter).toBe("none");
    const actualStroke = await page.evaluate((color) => {
      const element = document.createElement("span");
      element.style.color = color;
      document.body.append(element);
      const normalized = getComputedStyle(element).color;
      element.remove();
      return normalized;
    }, boxStyle.expected);
    expect(boxStyle.stroke).toBe(actualStroke);
    const canvas = page.locator("#preview-scroll");
    const bounds = (await canvas.boundingBox())!;
    const svg = page.locator("#diagram > svg");
    const original = (await svg.boundingBox())!;
    const point = {
      x: Math.round(bounds.x + bounds.width * 0.65),
      y: Math.round(bounds.y + bounds.height * 0.5),
    };
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await svg.boundingBox())!.width).toBeGreaterThan(original.width);
    const enlarged = (await svg.boundingBox())!;
    expect((point.x - enlarged.x) / enlarged.width).toBeCloseTo(
      (point.x - original.x) / original.width,
      3,
    );
    expect((point.y - enlarged.y) / enlarged.height).toBeCloseTo(
      (point.y - original.y) / original.height,
      3,
    );
    await page.mouse.down();
    await page.mouse.move(point.x + 80, point.y + 45, { steps: 5 });
    await page.mouse.up();
    const panned = (await svg.boundingBox())!;
    expect(panned.x - enlarged.x).toBeCloseTo(80, 0);
    expect(panned.y - enlarged.y).toBeCloseTo(45, 0);
    await page.mouse.wheel(0, 300);
    await expect.poll(async () => (await svg.boundingBox())!.width).toBeLessThan(enlarged.width);
    await page.getByRole("button", { name: "Fit", exact: true }).click();
    await expect(page.locator("#zoom-level")).toHaveText("Fit");
    const fitted = (await svg.boundingBox())!;
    expect(fitted.x + fitted.width / 2).toBeCloseTo(bounds.x + bounds.width / 2, 0);
    expect(fitted.y + fitted.height / 2).toBeCloseTo(bounds.y + bounds.height / 2, 0);
    await page.locator(`#${createdId}`).focus();
    await page.keyboard.press("Delete");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tabs).toHaveCount(count + 1);
    await tabs.first().click();
    const activeId = await page.getByRole("tab", { selected: true }).getAttribute("id");
    await page.locator(`#${createdId} [data-close-tab]`).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete tab", exact: true }).click();
    await expect(tabs).toHaveCount(count);
    await expect(page.getByRole("tab", { selected: true })).toHaveAttribute("id", activeId!);
  } finally {
    const snapshot = (await (await page.request.get("http://127.0.0.1:6104/api/state")).json()) as {
      tabs: { id: string; revision: number }[];
    };
    const remaining = snapshot.tabs.find((tab) => `tab-${tab.id}` === createdId);
    if (remaining)
      await page.request.delete(`http://127.0.0.1:6104/api/tabs/${remaining.id}`, {
        data: { expectedRevision: remaining.revision, actor: "mono-integration-cleanup" },
      });
  }
});

test("reel inputs recover from corrupt storage and report failed saves", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("reel-capacity:v1", "{invalid JSON");
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    };
  });
  await page.goto("http://127.0.0.1:6106");
  await expect(page.locator("#known-length")).toHaveValue("200");
  await expect(page.locator("#storage-notice")).toBeVisible();
  await page.locator("#known-length").fill("400");
  await expect(page.locator("#result-metres")).toHaveText("625");
  await expect(page.locator("#storage-notice")).toBeVisible();
  const toggle = page.locator(".mono-theme-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-theme", "mirage");
});

test("invalid reel values cannot acquire a different meaning when units change", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:6106");
  const size = page.locator("#known-size");
  await size.fill("0.171");
  await page.locator("#size-unit").selectOption("pe");
  await expect(size).toHaveValue("1");
  await size.fill("0");
  await page.locator("#size-unit").selectOption("mm");
  await expect(size).toHaveValue("");
  await expect(size).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#input-error")).not.toBeEmpty();
  await page.locator("#known-length").fill("0");
  await page.locator("#length-unit").selectOption("yd");
  await expect(page.locator("#known-length")).toHaveValue("");
});

test("an audio failure turns sound off without interrupting packing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: class {
        constructor() {
          throw new DOMException("Audio unavailable", "NotSupportedError");
        }
      },
    });
  });
  await page.goto("http://127.0.0.1:6105");
  const sound = page.getByRole("button", { name: "Packing sounds", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  const item = page.getByRole("checkbox").first();
  await item.check();
  await expect(item).toBeChecked();
  await expect(page.locator("#total-packed")).toHaveText("1");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await expect(sound).toHaveAttribute("title", "Packing sounds failed. Enable sound to try again.");
});
