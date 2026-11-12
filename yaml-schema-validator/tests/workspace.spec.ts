import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const setSchema = async (page: Page, schema: object | boolean) => {
  await page.getByRole("tab", { name: "Schema", exact: true }).click();
  await page.getByLabel("JSON Schema", { exact: true }).fill(JSON.stringify(schema));
};

test("form and YAML stay in sync for text, enum, boolean, and array controls", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toBeVisible();
  await page.getByLabel("Service name", { exact: false }).fill("home-station");
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(/name: home-station/);
  await page.getByLabel("Environment", { exact: false }).selectOption({ label: "production" });
  await page.getByRole("switch", { name: "Enable logging" }).uncheck();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("#root_tags_1")).toBeVisible();
  await page.locator("#root_tags_1").fill("indoor");
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(
    /environment: production/,
  );
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(/enabled: false/);
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(/indoor/);
  await page
    .getByLabel("YAML document", { exact: true })
    .fill("name: garden\nenvironment: staging\nport: 3000\n");
  await expect(page.getByLabel("Service name", { exact: false })).toHaveValue("garden");
  await expect(page.getByRole("spinbutton", { name: "Port" })).toHaveValue("3000");
  expect(errors).toEqual([]);
});

test("shows syntax and schema errors and navigates to invalid YAML", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByLabel("YAML document", { exact: true });
  await editor.fill("name: valid\nenvironment: production\nport: 99999");
  await expect(page.getByRole("heading", { name: "Does not match the schema" })).toBeVisible();
  await page.getByRole("tab", { name: "Schema", exact: true }).click();
  await page.getByRole("button", { name: "Line 3", exact: true }).click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveJSProperty("selectionStart", 36);
  await editor.fill("name: [");
  await expect(page.getByRole("alert")).toContainText("Check the YAML");
  await page.getByRole("button", { name: "Load example" }).click();
  await setSchema(page, { type: "invalid" });
  await expect(page.getByRole("alert")).toContainText("Check the schema");
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toHaveCount(0);
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toBeVisible();
});

test("imports local YAML and schema files and downloads edited YAML", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Import YAML file")
    .setInputFiles({ name: "local.yml", mimeType: "text/yaml", buffer: Buffer.from("count: 2\n") });
  await page.getByRole("tab", { name: "Schema", exact: true }).click();
  await page.getByLabel("Import schema file").setInputFiles({
    name: "local.schema.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        type: "object",
        properties: { count: { type: "integer", title: "Count" } },
      }),
    ),
  });
  await expect(page.getByLabel("Count", { exact: true })).toHaveValue("2");
  await page.getByLabel("Count", { exact: true }).fill("3");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download YAML" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("local.yaml");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toContain("count: 3");
});

test("renders schema alternatives and local refs without fetching remote schemas", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))
      externalRequests.push(request.url());
  });
  await page.goto("/");
  await setSchema(page, {
    type: "object",
    properties: {
      transport: {
        title: "Transport",
        oneOf: [
          { title: "TCP", type: "object", properties: { port: { type: "integer" } } },
          { title: "Socket", type: "object", properties: { path: { type: "string" } } },
        ],
      },
    },
  });
  await page.getByRole("tab", { name: "YAML", exact: true }).click();
  await page.getByLabel("YAML document", { exact: true }).fill("transport: {port: 8080}");
  await expect(page.locator("select").first()).toContainText("Socket");
  await page.locator("select").first().selectOption({ label: "Socket" });
  await expect(page.getByLabel("path", { exact: true })).toBeVisible();
  await setSchema(page, { $ref: "https://example.com/external-schema.json" });
  await expect(page.getByRole("alert")).toContainText("resolve reference");
  expect(externalRequests).toEqual([]);
});

test("validation never inserts defaults or drops unknown values on opening a schema", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("YAML document", { exact: true }).fill("kept: original\n");
  await setSchema(page, {
    type: "object",
    properties: { name: { type: "string", default: "automatic" } },
  });
  await page.getByRole("tab", { name: "YAML", exact: true }).click();
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue("kept: original\n");
});

test("async schemas show an error without claiming successful validation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await setSchema(page, { $async: true, type: "integer" });
  await expect(page.getByRole("alert")).toContainText("Async schemas are not supported");
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("works in all appearances without mobile overflow or accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  for (const theme of ["light", "mirage", "dark"]) {
    await page.evaluate((value) => {
      localStorage.setItem("mono.appearance", value);
    }, theme);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mono-theme", theme);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});
