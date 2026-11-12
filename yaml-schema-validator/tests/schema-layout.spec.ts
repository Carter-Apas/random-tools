import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["endpoints"],
  properties: {
    actions: {
      type: "array",
      items: {
        type: "string",
        description: "Action name to expose to this endpoint.",
        not: { pattern: "^reserved$" },
      },
    },
    endpoints: { type: "object", additionalProperties: { $ref: "#/$defs/endpoint" } },
  },
  $defs: {
    endpoint: {
      title: "Protocol endpoint",
      type: "object",
      required: ["protocol", "path"],
      additionalProperties: false,
      properties: {
        protocol: { type: "string", enum: ["http", "sse"] },
        path: {
          type: "string",
          description: "Absolute HTTP path, without query or fragment.",
          pattern: "^/[^?#\\s]*$",
        },
        broadcast: { type: "boolean" },
      },
    },
  },
};

const loadDocument = async (page: Page, documentSchema: object, yaml: string) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Schema", exact: true }).click();
  await page.getByLabel("JSON Schema", { exact: true }).fill(JSON.stringify(documentSchema));
  await page.getByRole("tab", { name: "YAML", exact: true }).click();
  await page.getByLabel("YAML document", { exact: true }).fill(yaml);
};

const expectAligned = async (control: Locator, button: Locator) => {
  const controlBox = await control.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(controlBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  if (!controlBox || !buttonBox) throw new Error("Expected visible controls.");
  expect(
    Math.abs(controlBox.y + controlBox.height / 2 - buttonBox.y - buttonBox.height / 2),
  ).toBeLessThan(1);
};

test("array actions align with the input through errors, descriptions, and reordering", async ({
  page,
}) => {
  await loadDocument(page, schema, "actions: [null, refresh]\nendpoints: {}\n");
  const item = page.locator(".schema-array-item").first();
  const control = item.locator("input");
  const remove = item.getByRole("button", { name: "Remove", exact: true });
  await control.fill("reserved");
  await control.fill("");
  await expect(item.locator(".error-detail")).toContainText("must be string");
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expectAligned(control, remove);
  }
  await control.fill("start");
  await expect(item.locator(".error-detail")).toHaveCount(0);
  await expectAligned(control, remove);
  await item.getByRole("button", { name: "Move down", exact: true }).click();
  await expect(page.locator("#root_actions_1")).toHaveValue("start");
  await page
    .locator(".schema-array-item")
    .last()
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.locator(".schema-array-item")).toHaveCount(1);
  await expect(page.locator("#root_actions_0")).toHaveValue("refresh");
});

test("additional object properties use a key header and full-width fields on desktop and mobile", async ({
  page,
}) => {
  await loadDocument(page, schema, "actions: []\nendpoints:\n  newKey: {}\n");
  const property = page.locator(".additional-property");
  const key = property.getByRole("textbox", { name: "Property name", exact: true });
  const remove = property.getByRole("button", { name: "Remove property newKey", exact: true });
  await expect(property.getByText("Protocol endpoint", { exact: true })).toHaveCount(1);
  await expect(property.getByText("newKey", { exact: true })).toHaveCount(0);
  await expect(property.getByText("Type: object", { exact: true })).toHaveCount(0);
  for (const width of [1280, 760, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expectAligned(key, remove);
    const body = await property.locator(".additional-property-value").boundingBox();
    const path = await property.getByRole("textbox", { name: "path", exact: false }).boundingBox();
    if (!body || !path) throw new Error("Expected visible property fields.");
    expect(path.y).toBeGreaterThan((await key.boundingBox())?.y ?? 0);
    expect(path.width).toBeGreaterThanOrEqual(body.width - 1);
    expect(Math.abs(path.x - body.x)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await key.fill("events");
  await key.press("Tab");
  await expect(page.getByLabel("YAML document", { exact: true })).toHaveValue(/events:/);
  await property
    .getByRole("combobox", { name: "protocol", exact: false })
    .selectOption({ label: "http" });
  await property.getByRole("textbox", { name: "path", exact: false }).fill("/events");
  await property.getByRole("switch", { name: "broadcast", exact: true }).check();
  await expect(page.getByRole("heading", { name: "YAML matches the schema" })).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
  await property.getByRole("button", { name: "Remove property events", exact: true }).click();
  await expect(page.locator(".additional-property")).toHaveCount(0);
});

test("object array actions and nested array actions only affect their own item", async ({
  page,
}) => {
  await loadDocument(
    page,
    {
      type: "object",
      properties: {
        loose: { type: "array", items: {} },
        groups: {
          type: "array",
          items: {
            type: "object",
            title: "Group",
            properties: {
              name: { type: "string" },
              values: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    "loose: [1]\ngroups:\n  - name: first\n    values: [a, b]\n  - name: second\n    values: [c]\n",
  );
  await page
    .locator("#root_groups_0_values")
    .getByRole("button", { name: "Remove", exact: true })
    .first()
    .click();
  await expect(page.locator("#root_groups_0_values_0")).toHaveValue("b");
  await expect(page.locator("#root_groups_1_name")).toHaveValue("second");
  await page
    .locator(".schema-array-container")
    .first()
    .locator(":scope > .schema-array-actions")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.locator("#root_groups_0_name")).toHaveValue("second");
  await expect(page.locator("#root_groups_0_values_0")).toHaveValue("c");
  await expect(page.locator("#root_groups_1_name")).toHaveCount(0);
  await page.locator("#root_loose").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator("#root_loose .schema-array-item")).toHaveCount(0);
});
