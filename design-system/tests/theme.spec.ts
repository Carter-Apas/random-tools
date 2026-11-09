import { expect, test } from "@playwright/test";

const preview = "/iframe.html?id=components-theme-toggle--system-default&viewMode=story";

test("system defaults stay automatic until a choice, and saved choices sync across tabs", async ({
  context,
}) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.emulateMedia({ colorScheme: "light" });
  await second.emulateMedia({ colorScheme: "dark" });
  await first.goto(preview);
  await second.goto(preview);
  await expect(first.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "light");
  await expect(second.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "dark");
  await first.getByRole("button", { name: "Light theme. Switch to Mirage." }).click();
  await expect(second.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "mirage");
  await second.reload();
  await expect(second.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "mirage");
  await first.evaluate(() => localStorage.removeItem("mono.appearance"));
  await expect(second.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "dark");
  await second.emulateMedia({ colorScheme: "light" });
  await expect(second.locator(".mono-theme-toggle")).toHaveAttribute("data-theme", "light");
});

test("theme glyphs respect reduced motion and work from the keyboard", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(preview);
  const toggle = page.locator(".mono-theme-toggle");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("data-theme", "mirage");
  const durations = await toggle
    .locator("svg")
    .first()
    .evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .map((value) => parseFloat(value)),
    );
  expect(durations.every((duration) => duration <= 0.001)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("data-theme", "dark");
});

test("a blocked preference save keeps the selected theme usable for this visit", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage is blocked", "SecurityError");
    };
  });
  await page.goto(preview);
  const toggle = page.locator(".mono-theme-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-theme", "mirage");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(toggle).toHaveAttribute("data-theme", "mirage");
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(toggle).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(toggle).toHaveAttribute("data-theme", "light");
});
