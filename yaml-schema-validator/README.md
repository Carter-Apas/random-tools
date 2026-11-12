# YAML schema validator

A browser-only YAML validator and schema-driven configuration editor, using the shared
Mono design system. YAML documents and schemas stay in the current tab. The app has no API,
analytics, runtime CDN dependencies, or document persistence. Only the shared theme preference
is stored locally.

## Use

Paste or import a YAML document in **YAML**, then paste or import its **JSON Schema**
in **Schema**. Draft **2020-12** and **draft-07** are supported; omitting `$schema` uses draft-07.
Schemas can be written as JSON or YAML, with syntax highlighting for both. The included example
uses `$schema: https://json-schema.org/draft/2020-12/schema` and local `$defs` references.
YAML alone cannot describe all allowed configuration options; supply the application's schema.

The generated form shows schema fields, enum choices, nested objects, arrays, descriptions,
and `oneOf`/`anyOf` alternatives. Edit the YAML or the form to update the other view.
Validation reports all mismatches with property paths and source lines where available;
click a line to select it in the YAML editor. Import files locally, format a document,
copy the YAML, or download it as a `.yaml` file.

Validation checks the original data without injecting defaults, coercing values, or removing
unknown properties. Standard JSON Schema formats are checked. Local references such as
`#/definitions/setting` and `#/$defs/setting` resolve within the supplied schema. External
references are not fetched; include their definitions locally before importing. Unknown schema
keywords and unsupported drafts produce a schema error rather than an apparent validation pass.
Async schemas (`$async: true`) are rejected; validation runs synchronously in the browser.

The form uses React JSON Schema Form with Ajv. Unusual schemas that cannot render as a form
can still be edited and validated as YAML. Advanced validation keywords do not necessarily
have a dedicated form control. Mapping comments survive edits to other fields; changed arrays
are rewritten. Form edits to documents containing aliases expand them to independent values and
rewrite the document. Invalid source remains available for editing and downloading.

Documents use YAML 1.2 with string mapping keys and JSON-compatible values. Duplicate keys,
multiple YAML documents, unresolved tags, non-finite numbers, and circular aliases are rejected.
Inputs are limited to 1 MB, 80 nested levels, and the YAML parser's alias expansion limit.

## Development

Use Node 22.13+ (22.x) or Node 24+ and run commands from this folder:

```sh
npm ci
npm run dev
```

Vite serves the app at the local URL printed in the terminal. It only serves static application
code; parsing, schema compilation, validation, and editing run in the browser. The production
build can be served by any static HTTP server.

```sh
npm run lint
npm run format:check
npm run build
npm test
```

`npm run format` writes formatting changes; `npm run lint:fix` applies supported lint fixes.
The app uses the same `@cartercree/eslint-config` v4, ESLint 10, and Prettier conventions as
the other tools. Its versioned `vendor/` snapshot of Mono makes installs and Docker builds
independent of sibling folders. Light, Mirage, and Dark use the shared application theme control.

Optional browser checks cover editing in both directions, enums, booleans, arrays, schema
alternatives, file import/download, error recovery, local-only requests, accessibility, and mobile
layouts in all three appearances:

```sh
npx playwright install chromium
npm run test:browser
```

Browser tests start their own Vite server on port 5187. Unit tests run without a browser and
are included in the repository's automatically discovered app CI job.
Set `YAML_VALIDATOR_TEST_PORT` to use another port alongside a running development server.

## Container

Build with this folder as the complete Docker context:

```sh
docker build -t yaml-schema-validator:latest .
docker run --rm -p 8087:80 yaml-schema-validator:latest
```

The multi-stage build installs locked dependencies and serves only static assets through nginx
on port 80, with `/healthz` for health and readiness probes. No environment variables or persistent volumes are required. The root publishing
workflow automatically discovers the Dockerfile when these changes reach `main`.
