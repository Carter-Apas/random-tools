import type { RJSFSchema } from "@rjsf/utils";
import { customizeValidator } from "@rjsf/validator-ajv8";
import { Ajv2020 } from "ajv/dist/2020.js";
import { isNode } from "yaml";

import { isRecord, readYaml, type ParsedYaml } from "./document.ts";

export interface ValidationIssue {
  path: string;
  message: string;
  line?: number;
  column?: number;
}

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const draft07 = "http://json-schema.org/draft-07/schema#";

const canonicalDialect = (dialect: unknown) => {
  if (dialect === undefined) return undefined;
  if (typeof dialect !== "string") throw new Error("The $schema value must be a schema URI.");
  const normalized = dialect.replace(/#$/, "");
  if (/^https?:\/\/json-schema\.org\/draft-07\/schema$/.test(normalized)) return draft07;
  if (/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema$/.test(normalized)) return draft2020;
  throw new Error("Use JSON Schema draft 2020-12 or draft-07. Omitting $schema uses draft-07.");
};

export const compileSchema = (source: string) => {
  const { data } = readYaml(source);
  if (!isRecord(data) && typeof data !== "boolean")
    throw new Error("A JSON Schema must be an object or a boolean, written as YAML or JSON.");
  const schema: RJSFSchema = typeof data === "boolean" ? (data ? {} : { not: {} }) : data;
  if (schema.$async)
    throw new Error("Async schemas are not supported. Remove $async to validate this document.");
  const dialect = canonicalDialect(schema.$schema);
  if (dialect) schema.$schema = dialect;
  const validator = customizeValidator<unknown>({
    AjvClass: dialect === draft2020 ? Ajv2020 : undefined,
    ajvOptionsOverrides: {
      allErrors: true,
      strict: false,
      strictSchema: true,
      useDefaults: false,
      coerceTypes: false,
      removeAdditional: false,
      ownProperties: true,
    },
  });
  const validate = validator.ajv.compile(schema);
  return { schema, validator, validate };
};

export type CompiledSchema = ReturnType<typeof compileSchema>;

const pointerSegments = (pointer: string) =>
  pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

const nodeLocation = (parsed: ParsedYaml, segments: string[]) => {
  const node = parsed.document.getIn(segments, true);
  if (isNode(node) && node.range) return parsed.lineCounter.linePos(node.range[0]);
  return undefined;
};

export const validateYaml = (compiled: CompiledSchema, parsed: ParsedYaml): ValidationIssue[] => {
  if (compiled.validate(parsed.data)) return [];
  return (compiled.validate.errors ?? []).map((error) => {
    const segments = pointerSegments(error.instancePath);
    const property: unknown =
      error.params.missingProperty ??
      error.params.additionalProperty ??
      error.params.unevaluatedProperty;
    if (typeof property === "string") segments.push(property);
    const location = nodeLocation(parsed, segments) ?? nodeLocation(parsed, segments.slice(0, -1));
    return {
      path: segments.length
        ? `/${segments.map((segment) => segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`
        : "/",
      message: error.message ?? "Does not match the schema.",
      line: location?.line,
      column: location?.col,
    };
  });
};
