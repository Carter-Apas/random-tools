import { expect, test } from "@playwright/test";

test("highlights YAML and JSON schemas while preserving the editable source", async ({ page }) => {
  await page.goto("/");
  const highlighted = page.locator(".source-highlight");
  await expect(highlighted).toHaveAttribute("data-language", "yaml");
  await expect(highlighted.locator(".token-key").first()).toHaveText("name");
  await expect(highlighted.locator(".token-comment")).toContainText("Edit this document");
  const source = '# Local comment\nname: "<script>alert(1)</script>"\nenabled: true\ncount: 3\n';
  await page.getByLabel("YAML document", { exact: true }).fill(source);
  await expect(highlighted.locator(".token-string")).toHaveText('"<script>alert(1)</script>"');
  await expect(highlighted.locator(".token-boolean")).toHaveText("true");
  await expect(highlighted.locator("script")).toHaveCount(0);
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(source);
  await page.getByRole("tab", { name: "Schema", exact: true }).click();
  await expect(highlighted.locator(".token-key").first()).toHaveText("$schema");
  const schema = '{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}';
  await page.getByLabel("JSON Schema", { exact: true }).fill(schema);
  await expect(highlighted).toHaveAttribute("data-language", "json");
  await expect(highlighted.locator(".token-property").first()).toHaveText('"$schema"');
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toBeVisible();
});

test("highlighting follows scrolling and remains readable in forced colors", async ({ page }) => {
  await page.goto("/");
  const source = Array.from(
    { length: 100 },
    (_, index) => `key${index}: "${"long value ".repeat(40)}"`,
  ).join("\n");
  const editor = page.getByLabel("YAML document", { exact: true });
  await editor.fill(source);
  await editor.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = 400;
    element.scrollLeft = 200;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(page.locator(".source-highlight")).toHaveJSProperty("scrollTop", 400);
  await expect(page.locator(".source-highlight")).toHaveJSProperty("scrollLeft", 200);
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".source-highlight")).toBeHidden();
  expect(await editor.evaluate((element) => getComputedStyle(element).color)).not.toBe(
    "rgba(0, 0, 0, 0)",
  );
});
