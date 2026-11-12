import { isAlias, isPair, isScalar, LineCounter, parseDocument, stringify, visit } from "yaml";

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export const maxSourceLength = 1_000_000;

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertJsonValue = (value: unknown, ancestors: Set<object>, depth: number): void => {
  if (depth > 80) throw new Error("Nesting exceeds 80 levels. Use a smaller document.");
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("JSON Schema cannot validate non-finite numbers such as .inf or .nan.");
  if (typeof value !== "object" || value === null) return;
  if (ancestors.has(value)) throw new Error("Circular YAML aliases cannot be validated as JSON.");
  ancestors.add(value);
  for (const child of Object.values(value)) assertJsonValue(child, ancestors, depth + 1);
  ancestors.delete(value);
};

export const readYaml = (source: string) => {
  if (source.length > maxSourceLength) throw new Error("Keep each document under 1 MB.");
  const lineCounter = new LineCounter();
  const document = parseDocument(source, { lineCounter, uniqueKeys: true });
  if (document.errors.length)
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  if (!document.contents) throw new Error("Enter a YAML document to begin.");
  let hasAliases = false;
  visit(document, (_key, node) => {
    if (isAlias(node)) hasAliases = true;
    if (isPair(node) && (!isScalar(node.key) || typeof node.key.value !== "string"))
      throw new Error("Use string mapping keys so the YAML can be validated as JSON.");
  });
  if (document.warnings.length)
    throw new Error(document.warnings.map((warning) => warning.message).join("\n"));
  const data: unknown = document.toJS({ maxAliasCount: 100 });
  assertJsonValue(data, new Set(), 0);
  return { data: data as JsonValue, document, lineCounter, hasAliases };
};

export type ParsedYaml = ReturnType<typeof readYaml>;

const reconcile = (
  document: ParsedYaml["document"],
  path: (string | number)[],
  previous: JsonValue,
  next: JsonValue,
): void => {
  if (Object.is(previous, next)) return;
  if (isRecord(previous) && isRecord(next)) {
    for (const key of Object.keys(previous)) {
      if (!Object.hasOwn(next, key)) document.deleteIn([...path, key]);
    }
    for (const [key, value] of Object.entries(next)) {
      const childPath = [...path, key];
      if (Object.hasOwn(previous, key)) reconcile(document, childPath, previous[key], value);
      else document.setIn(childPath, value);
    }
    return;
  }
  document.setIn(path, next);
};

export const updateYaml = (source: string, data: JsonValue) => {
  const parsed = readYaml(source);
  if (parsed.hasAliases) return stringify(data, { lineWidth: 100, aliasDuplicateObjects: false });
  reconcile(parsed.document, [], parsed.data, data);
  return parsed.document.toString({ lineWidth: 100 });
};

export const attempt = <T>(operation: () => T) => {
  try {
    return { value: operation(), error: undefined };
  } catch (error) {
    return { value: undefined, error: errorMessage(error) };
  }
};
