import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const overview = "/iframe.html?id=start-here-overview--design-language&viewMode=story";

for (const theme of ["dark", "mirage", "light"]) {
  test(`${theme}: accessible overview at desktop and mobile widths`, async ({ page }) => {
    await page.goto(`${overview}&globals=theme:${theme}`);
    await expect(page.getByRole("heading", { name: "One language. Every tool." })).toBeVisible();
    await expect(page.locator(".mono-root")).toHaveAttribute("data-mono-theme", theme);
    const results = await new AxeBuilder({ page })
      .include(".mono-root")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  });
}

test("theme controls update the whole canvas", async ({ page }) => {
  await page.goto(`${overview}&globals=theme:dark`);
  await page.getByRole("button", { name: "Dark theme. Switch to Light.", exact: true }).click();
  await expect(page.locator(".mono-root")).toHaveAttribute("data-mono-theme", "light");
  await page.getByRole("button", { name: "Preview Ayu dark" }).click();
  await expect(page.locator(".mono-root")).toHaveAttribute("data-mono-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Dark theme. Switch to Light.", exact: true }),
  ).toBeVisible();
});

test("calculator updates values and supports keyboard tabs", async ({ page }) => {
  await page.goto(overview);
  await expect(page.locator(".mono-stat").first()).toContainText("$1,711");
  await page.getByRole("spinbutton", { name: "Annual distance" }).fill("20000");
  await expect(page.locator(".mono-stat").first()).toContainText("$2,444");
  await page.getByRole("tab", { name: "Electric", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Petrol", exact: true })).toBeFocused();
  await expect(page.locator(".mono-stat").first()).toContainText("$3,850");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Electric", exact: true })).toBeFocused();
});

test("checklist and switches respond to user input", async ({ page }) => {
  await page.goto(overview);
  const progress = page.getByRole("progressbar", { name: "Gear packed" });
  await expect(progress).toHaveAttribute("aria-valuenow", "50");
  await page.getByRole("checkbox", { name: "Life jacket" }).check();
  await page.getByRole("checkbox", { name: "Fishing licence" }).check();
  await expect(progress).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByText("Everything packed. Good to go.")).toBeVisible();
  await page.getByRole("button", { name: "Reset packing checklist" }).click();
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("switch", { name: /Sound effects/ }).check();
  await expect(page.getByRole("switch", { name: /Sound effects/ })).toBeChecked();
});

test("dialog manages focus, closes with Escape, returns focus, and saves", async ({ page }) => {
  await page.goto("/iframe.html?id=components-dialog--save-comparison&viewMode=story");
  const trigger = page.getByRole("button", { name: "Save comparison", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Save comparison" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Comparison name" })).toBeFocused();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");

    expect(
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) || document.activeElement === document.body,
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("textbox").fill("Weekend trips");
  await dialog.getByRole("button", { name: "Save comparison", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Weekend trips saved");
});

test("directory filters, empty state, and tool preview", async ({ page }) => {
  await page.goto("/iframe.html?id=patterns-tools--directory&viewMode=story");
  const search = page.getByRole("searchbox", { name: "Find a tool" });
  await search.fill("nothing matches");
  await expect(page.getByRole("heading", { name: "No tools found" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("tab", { name: "Games" }).click();
  await expect(page.locator(".directory-list > button")).toHaveCount(1);
  await page.getByRole("button", { name: /Quiz generator/ }).click();
  const dialog = page.getByRole("dialog", { name: "Quiz generator" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Tungsten/ }).click();
  await expect(dialog.getByRole("status")).toContainText("Correct. W is tungsten.");
});

test("every story renders without runtime errors", async ({ page, request }) => {
  const response = await request.get("/index.json");
  const { entries } = await response.json();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const entry of Object.values(entries) as { id: string; type: string }[]) {
    if (entry.type !== "story") {
      continue;
    }
    await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`);
    await expect(page.locator(".mono-root")).toBeVisible();
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});
