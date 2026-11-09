import { expect, test } from "@playwright/test";

const selection = "/iframe.html?id=components-selection--checkboxes-and-switches&viewMode=story";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(".mono-checkbox")) {
        return;
      }
      document.documentElement.dataset.animations =
        `${document.documentElement.dataset.animations ?? ""} ${event.animationName}`.trim();
    });
  });
});

test("completion feedback is opt in, skips initial values, and replays with the keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(selection);
  await expect(page.getByRole("checkbox", { name: /Already packed/ })).toBeChecked();
  await page.getByRole("checkbox", { name: "Rod & reel" }).first().check();
  expect(await page.locator("html").getAttribute("data-animations")).toBeNull();

  const checkbox = page.getByRole("checkbox", { name: /Pack the life jacket/ });

  const layout = () =>
    checkbox.evaluate((input) => {
      const label = input.closest("label")!;
      return [
        label,
        input,
        label.querySelector(".mono-checkbox-box")!,
        label.querySelector(".mono-checkbox-label")!,
      ].map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();

        return { x: x + window.scrollX, y: y + window.scrollY, width, height };
      });
    });

  const initialLayout = await layout();
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect
    .poll(() => page.locator("html").getAttribute("data-animations"))
    .toContain("mono-check-pop");
  await expect
    .poll(() => page.locator("html").getAttribute("data-animations"))
    .toContain("mono-check-tick");
  await expect
    .poll(() => page.locator("html").getAttribute("data-animations"))
    .toContain("mono-check-burst");
  await expect(page.locator("[data-celebrating]")).toHaveCount(0);
  expect(await layout()).toEqual(initialLayout);

  await page.locator("html").evaluate((element) => element.removeAttribute("data-animations"));
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  expect(await page.locator("html").getAttribute("data-animations")).toBeNull();
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.locator("html").getAttribute("data-animations"))
    .toContain("mono-check-pop");
  await expect(checkbox).toBeFocused();
});

test("reduced motion keeps an animated checkbox still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(selection);
  await page.getByRole("checkbox", { name: /Pack the life jacket/ }).check();
  await expect(page.getByRole("checkbox", { name: /Pack the life jacket/ })).toBeChecked();
  await expect(page.locator("[data-celebrating]")).toHaveCount(0);
  expect(await page.locator("html").getAttribute("data-animations")).toBeNull();
});
