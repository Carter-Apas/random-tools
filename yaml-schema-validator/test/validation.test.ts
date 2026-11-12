import assert from "node:assert/strict";
import { test } from "node:test";

import { maxSourceLength, readYaml, updateYaml } from "../src/document.ts";
import { exampleSchema, exampleYaml } from "../src/example.ts";
import { compileSchema, validateYaml } from "../src/validation.ts";

test("the example validates without rewriting its YAML", () => {
  const parsed = readYaml(exampleYaml);
  assert.deepEqual(validateYaml(compileSchema(exampleSchema), parsed), []);
  assert.equal(parsed.document.toString(), exampleYaml);
});

test("reports all invalid values with document paths and source lines", () => {
  const parsed = readYaml("name: INVALID\nenvironment: unknown\nport: 99999\nextra: true\n");
  const issues = validateYaml(compileSchema(exampleSchema), parsed);
  assert.equal(issues.length, 4);
  assert.equal(issues.find((issue) => issue.path === "/port")?.line, 3);
  assert.equal(issues.find((issue) => issue.path === "/extra")?.line, 4);
});

test("does not coerce YAML strings or inject defaults", () => {
  const parsed = readYaml('port: "8080"\n');
  const compiled = compileSchema(`type: object
required: [name]
properties:
  port: {type: integer}
  name: {type: string, default: service}
`);
  const before = structuredClone(parsed.data);
  assert.equal(validateYaml(compiled, parsed).length, 2);
  assert.deepEqual(parsed.data, before);
});

test("supports JSON schemas, local references, arrays, and standard formats", () => {
  const compiled = compileSchema(
    JSON.stringify({
      type: "array",
      items: { $ref: "#/definitions/contact" },
      definitions: { contact: { type: "string", format: "email" } },
    }),
  );
  assert.deepEqual(validateYaml(compiled, readYaml("- example@example.com")), []);
  assert.equal(validateYaml(compiled, readYaml("- invalid-email"))[0]?.path, "/0");
});

test("resolves escaped JSON pointer keys to the right YAML line", () => {
  const compiled = compileSchema(
    JSON.stringify({
      type: "object",
      properties: { "a/b~c": { type: "integer" } },
    }),
  );
  const issues = validateYaml(compiled, readYaml("a/b~c: wrong\n"));
  assert.equal(issues[0]?.line, 1);
  assert.equal(issues[0]?.path, "/a~1b~0c");
});

test("accepts both draft-07 URI spellings", () => {
  for (const protocol of ["http", "https"]) {
    const compiled = compileSchema(
      `$schema: ${protocol}://json-schema.org/draft-07/schema#\ntype: string`,
    );
    assert.deepEqual(validateYaml(compiled, readYaml("hello")), []);
  }
});

test("boolean schemas accept or reject the complete document", () => {
  assert.deepEqual(validateYaml(compileSchema("true"), readYaml("null")), []);
  assert.equal(validateYaml(compileSchema("false"), readYaml("null")).length, 1);
});

test("conditional requirements and alternative schemas validate", () => {
  const compiled = compileSchema(`type: object
properties:
  mode: {enum: [local, remote]}
  endpoint: {type: string, format: uri}
if:
  properties:
    mode: {const: remote}
then:
  required: [endpoint]
`);
  assert.deepEqual(validateYaml(compiled, readYaml("mode: local")), []);
  assert.ok(
    validateYaml(compiled, readYaml("mode: remote")).some((issue) => issue.path === "/endpoint"),
  );
});

test("schema changes with the same $id do not reuse stale validators", () => {
  const first = compileSchema("$id: urn:example:configuration\ntype: string");
  const second = compileSchema("$id: urn:example:configuration\ntype: integer");
  assert.deepEqual(validateYaml(first, readYaml("hello")), []);
  assert.equal(validateYaml(second, readYaml("hello")).length, 1);
});

test("async schemas cannot report a pending promise as successful validation", () => {
  assert.throws(
    () => compileSchema("$async: true\ntype: integer"),
    /Async schemas are not supported/,
  );
  assert.deepEqual(validateYaml(compileSchema("$async: false\ntype: integer"), readYaml("2")), []);
});

test("rejects malformed schemas, unresolved refs, and unsupported drafts", () => {
  assert.throws(() => compileSchema("type: not-a-type"), /schema is invalid/);
  assert.throws(() => compileSchema("[]"), /must be an object or a boolean/);
  assert.throws(() => compileSchema('$ref: "#/definitions/missing"'), /resolve reference/);
  assert.throws(
    () => compileSchema('$ref: "https://example.com/schema.json"'),
    /resolve reference/,
  );
  assert.throws(
    () => compileSchema("$schema: https://json-schema.org/draft/2019-09/schema"),
    /draft-07/,
  );
  assert.throws(() => compileSchema("$schema: 2020"), /schema URI/);
});

test("draft 2020-12 validates local $defs references and tuple prefixItems", () => {
  const compiled = compileSchema(`$schema: https://json-schema.org/draft/2020-12/schema
type: array
prefixItems:
  - {$ref: '#/$defs/name'}
  - {type: integer, minimum: 1}
items: false
minItems: 2
$defs:
  name: {type: string, minLength: 1}
`);
  assert.deepEqual(validateYaml(compiled, readYaml("[station, 2]")), []);
  assert.equal(validateYaml(compiled, readYaml("[station, wrong]"))[0]?.path, "/1");
  assert.ok(validateYaml(compiled, readYaml("[station, 2, extra]")).length > 0);
});

test("draft 2020-12 enforces dependentRequired and unevaluatedProperties", () => {
  const compiled = compileSchema(`$schema: https://json-schema.org/draft/2020-12/schema#
type: object
allOf:
  - properties:
      enabled: {type: boolean}
      name: {type: string}
dependentRequired:
  enabled: [name]
unevaluatedProperties: false
`);
  assert.deepEqual(validateYaml(compiled, readYaml("enabled: true\nname: station")), []);
  assert.ok(
    validateYaml(compiled, readYaml("enabled: false")).some((issue) => issue.path === "/name"),
  );
  const issues = validateYaml(compiled, readYaml("name: station\nextra: true"));
  assert.equal(issues[0]?.path, "/extra");
  assert.equal(issues[0]?.line, 2);
});

test("switching schema drafts does not reuse an incompatible validator", () => {
  for (const dialect of [
    "https://json-schema.org/draft/2020-12/schema",
    "http://json-schema.org/draft-07/schema#",
    "https://json-schema.org/draft/2020-12/schema",
  ]) {
    const compiled = compileSchema(
      `$schema: ${dialect}\n$id: urn:example:configuration\ntype: integer`,
    );
    assert.deepEqual(validateYaml(compiled, readYaml("2")), []);
    assert.equal(validateYaml(compiled, readYaml('"2"')).length, 1);
  }
});

test("rejects malformed YAML, duplicate keys, multiple documents, and empty input", () => {
  assert.throws(() => readYaml("value: ["));
  assert.throws(() => readYaml("name: one\nname: two"), /unique/);
  assert.throws(() => readYaml("one\n---\ntwo"), /multiple documents/i);
  assert.throws(() => readYaml("# just a comment"), /Enter a YAML document/);
});

test("requires JSON-compatible keys, numbers, tags, and noncircular values", () => {
  assert.throws(() => readYaml("1: value"), /string mapping keys/);
  assert.throws(() => readYaml("? [a, b]\n: value"), /string mapping keys/);
  assert.throws(() => readYaml("value: .inf"), /non-finite/);
  assert.throws(() => readYaml("value: !custom 4"), /Unresolved tag/);
  assert.throws(() => readYaml("value: &loop [*loop]"), /Circular/);
});

test("limits source size, nesting, and YAML alias expansion", () => {
  assert.throws(() => readYaml("a".repeat(maxSourceLength + 1)), /under 1 MB/);
  assert.throws(() => readYaml("[".repeat(82) + "0" + "]".repeat(82)), /80 levels/);
  const bomb =
    "a: &a [x, x, x, x, x, x, x, x, x, x]\nb: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]\nc: [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]";
  assert.throws(() => readYaml(bomb), /alias count/i);
});

test("form updates preserve comments on unchanged keys and remove omitted properties", () => {
  const source =
    "# My configuration\nname: old # name comment\nport: 8080 # keep this\nunused: remove\n";
  const updated = updateYaml(source, { name: "new", port: 8080, enabled: true });
  assert.match(updated, /# My configuration/);
  assert.match(updated, /port: 8080 # keep this/);
  assert.deepEqual(readYaml(updated).data, { name: "new", port: 8080, enabled: true });
});

test("form updates support nested objects, root scalars, arrays, and null", () => {
  assert.deepEqual(
    readYaml(updateYaml("nested: {value: old}", { nested: { value: "new" } })).data,
    { nested: { value: "new" } },
  );
  assert.equal(readYaml(updateYaml("old", "new")).data, "new");
  assert.deepEqual(readYaml(updateYaml("[a, b]", ["b", "c", "d"])).data, ["b", "c", "d"]);
  assert.equal(readYaml(updateYaml("value", null)).data, null);
});

test("editing anchored values does not silently change their aliases", () => {
  const source = "one: &shared {name: old}\ntwo: *shared\n";
  const next = { one: { name: "new" }, two: { name: "old" } };
  assert.deepEqual(readYaml(updateYaml(source, next)).data, next);
});
